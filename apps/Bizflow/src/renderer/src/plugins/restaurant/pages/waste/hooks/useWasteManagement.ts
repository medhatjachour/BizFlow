// src/pages/waste/hooks/useWasteManagement.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { WasteLogEntry, WasteFormData } from '../types'
import { sounds } from '../../utils/sound'

export interface WasteAnalytics {
  totalEntries: number
  totalLoss: number
  reasonBreakdown: Record<string, { count: number; totalCost: number }>
  topLossItems: Array<{ name: string; quantity: number; unit: string; totalCost: number }>
}

/** A sale or a restock can move many ingredients at once — coalesce the reloads. */
const REFRESH_DEBOUNCE_MS = 350

export function useWasteManagement() {
  const [logs, setLogs] = useState<WasteLogEntry[]>([])
  const [ingredients, setIngredients] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<WasteAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reasonFilter, setReasonFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Held in a ref so changing the filter never tears down the event
  // subscriptions below — otherwise every filter change would rebind them.
  const reasonFilterRef = useRef(reasonFilter)
  reasonFilterRef.current = reasonFilter

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [wList, ingList, metrics] = await Promise.all([
        window.api.restaurant.getWasteLogs({ reason: reasonFilterRef.current }),
        window.api.restaurant.getIngredients(),
        window.api.restaurant.getWasteAnalytics()
      ])
      setLogs(wList || [])
      setIngredients(ingList || [])
      setAnalytics(metrics || null)
      setError('')
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Failed to load kitchen waste records')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const didLoadOnce = useRef(false)

  useEffect(() => {
    // The first pass owns the full-screen spinner; every later pass is either a
    // filter change or a bus event and must stay silent.
    if (didLoadOnce.current) {
      void loadData(true)
    } else {
      didLoadOnce.current = true
      void loadData()
    }
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [reasonFilter, loadData])

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null
      void loadData(true)
    }, REFRESH_DEBOUNCE_MS)
  }, [loadData])

  // Waste is logged from the kitchen line and stock is consumed from the POS, so
  // both the ledger and the shrinkage KPIs have to follow the restaurant bus.
  useEffect(() => {
    const offLogged = window.api.restaurant.onEvent('waste:logged', scheduleRefresh)
    const offDeleted = window.api.restaurant.onEvent('waste:deleted', scheduleRefresh)
    const offInventory = window.api.restaurant.onEvent('inventory:updated', scheduleRefresh)

    return () => {
      offLogged()
      offDeleted()
      offInventory()
    }
  }, [scheduleRefresh])

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

  const logWaste = useCallback(
    async (data: WasteFormData): Promise<boolean> => {
      setActionError('')
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
        await loadData(true)
        return true
      } catch (err: any) {
        sounds.playError()
        setActionError(err?.message || 'Failed to record kitchen waste')
        return false
      }
    },
    [loadData]
  )

  /**
   * Reversing a log puts the stock back, which is destructive enough that the
   * page confirms first. Reported back so the caller can toast the outcome.
   */
  const deleteWaste = useCallback(
    async (id: string): Promise<boolean> => {
      setActionError('')
      try {
        sounds.playBump()
        await window.api.restaurant.deleteWasteLog(id)
        await loadData(true)
        return true
      } catch (err: any) {
        sounds.playError()
        setActionError(err?.message || 'Failed to delete waste log')
        return false
      }
    },
    [loadData]
  )

  return {
    logs: filteredLogs,
    allLogCount: logs.length,
    ingredients,
    analytics,
    loading,
    error,
    actionError,
    clearActionError: () => setActionError(''),
    reasonFilter,
    setReasonFilter,
    searchQuery,
    setSearchQuery,
    refreshWaste: loadData,
    logWaste,
    deleteWaste
  }
}
