import { useState, useEffect, useCallback } from 'react'
import { EODEntry } from '../types'

export function useEndOfDay(onWasteLogged: () => void, onClose: () => void) {
  const [entries, setEntries] = useState<EODEntry[]>([])
  const [unsoldEdits, setUnsoldEdits] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: EODEntry[] = await window.api.bakery.getEndOfDaySuggestion()
      setEntries(data)
      const edits: Record<string, number> = {}
      for (const e of data) edits[e.recipeId] = e.estimatedWaste
      setUnsoldEdits(edits)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch EOD suggestions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  const setRecipeWaste = (recipeId: string, qty: number) => {
    setUnsoldEdits(prev => ({ ...prev, [recipeId]: Math.max(0, qty) }))
  }

  const logAllWaste = async () => {
    setSaving(true)
    setError(null)
    try {
      const today = new Date().toISOString()
      for (const entry of entries) {
        const wasteQty = unsoldEdits[entry.recipeId] ?? entry.estimatedWaste
        if (wasteQty <= 0) continue

        await window.api.bakery.createWasteLog({
          recipeId: entry.recipeId,
          itemName: entry.recipeName,
          quantity: wasteQty,
          unit: entry.yieldUnit || 'pcs',
          cost: 0,
          reason: 'Overproduction',
          wasteDate: today,
          notes: 'Auto-logged from End of Day summary'
        })
      }
      setDone(true)
      onWasteLogged()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error logging waste')
      setSaving(false)
    }
  }

  const totalWaste = entries.reduce(
    (sum, e) => sum + (unsoldEdits[e.recipeId] ?? e.estimatedWaste),
    0
  )

  return {
    entries,
    unsoldEdits,
    setRecipeWaste,
    totalWaste,
    loading,
    saving,
    done,
    error,
    logAllWaste,
    onClose
  }
}