// src/pages/waste/hooks/useWasteManagement.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { WasteLogEntry, WasteFormData } from '../types'
import { sounds } from '../../utils/sound'

export function useWasteManagement() {
  const [logs, setLogs] = useState<WasteLogEntry[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<{
    totalEntries: number
    totalLoss: number
    reasonBreakdown: Record<string, { count: number; totalCost: number }>
    topLossItems: Array<{ name: string; quantity: number; unit: string; totalCost: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reasonFilter, setReasonFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [wList, ingList, metrics] = await Promise.all([
        window.api.restaurant.getWasteLogs({ reason: reasonFilter }),
        window.api.restaurant.getIngredients(),
        window.api.restaurant.getWasteAnalytics()
      ])
      setLogs(wList || [])
      setIngredients(ingList || [])
      setAnalytics(metrics || null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load kitchen waste records')
    } finally {
      setLoading(false)
    }
  }, [reasonFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const query = searchQuery.trim().toLowerCase()
      return (
        query === '' ||
        log.itemName.toLowerCase().includes(query) ||
        (log.loggedBy && log.loggedBy.toLowerCase().includes(query)) ||
        (log.notes && log.notes.toLowerCase().includes(query))
      )
    })
  }, [logs, searchQuery])

  const logWaste = async (data: WasteFormData) => {
    try {
      sounds.playSuccess()
      await window.api.restaurant.logWaste({
        ingredientId: data.ingredientId || undefined,
        itemName: data.itemName,
        quantity: Number(data.quantity),
        unit: data.unit,
        reason: data.reason,
        loggedBy: data.loggedBy,
        notes: data.notes || undefined
      })
      loadData()
      return true
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to record kitchen waste')
      return false
    }
  }

  const deleteWaste = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shrinkage entry?')) return
    try {
      sounds.playBump()
      await window.api.restaurant.deleteWasteLog(id)
      loadData()
    } catch (err: any) {
      sounds.playError()
      alert(err?.message || 'Failed to delete waste log')
    }
  }

  return {
    logs: filteredLogs,
    ingredients,
    analytics,
    loading,
    error,
    reasonFilter,
    setReasonFilter,
    searchQuery,
    setSearchQuery,
    refreshWaste: loadData,
    logWaste,
    deleteWaste
  }
}