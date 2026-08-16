import { useState, useEffect, useCallback, useMemo } from 'react'
import { DailyOverviewData, CapFilter } from '../types'
import { CAPACITY_THRESHOLDS } from '../constants'

export function useDailyOverview() {
  const [data, setData] = useState<DailyOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [capFilter, setCapFilter] = useState<CapFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result: DailyOverviewData = await window.api.bakery.getDailyOverview()
      setData(result)
      setLastRefresh(new Date())
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch bakery daily overview'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const derived = useMemo(() => {
    if (!data) return null

    const unlinked = data.capacity.filter(c => c.availableBatches === null)
    const ready = data.capacity.filter(
      c => c.availableBatches !== null && c.availableBatches >= CAPACITY_THRESHOLDS.READY_MIN_BATCHES
    )
    const limited = data.capacity.filter(
      c => c.availableBatches !== null && c.availableBatches > 0 && c.availableBatches < CAPACITY_THRESHOLDS.READY_MIN_BATCHES
    )
    const blocked = data.capacity.filter(c => c.availableBatches === 0)

    const totalPossibleUnits = data.capacity.reduce((sum, c) => sum + (c.expectedUnits ?? 0), 0)
    const todayProduced = data.todayBatches.reduce((sum, b) => sum + (b.quantityProduced ?? 0), 0)
    const completedScheduled = data.scheduled.filter(s => s.status === 'completed').length
    const totalAlerts = data.lowStock.length + data.expiringBatches.length + data.reorderNeeded.length
    const allUnlinked = unlinked.length === data.capacity.length && data.capacity.length > 0

    return {
      unlinked,
      ready,
      limited,
      blocked,
      producibleCount: ready.length + limited.length,
      totalPossibleUnits,
      todayProduced,
      completedScheduled,
      totalAlerts,
      allUnlinked
    }
  }, [data])

  const filteredCapacity = useMemo(() => {
    if (!data) return []

    return data.capacity.filter(item => {
      const matchesSearch = item.recipeName.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      const b = item.availableBatches
      if (capFilter === 'ready') return b !== null && b >= CAPACITY_THRESHOLDS.READY_MIN_BATCHES
      if (capFilter === 'limited') return b !== null && b > 0 && b < CAPACITY_THRESHOLDS.READY_MIN_BATCHES
      if (capFilter === 'blocked') return b === 0
      return true
    })
  }, [data, capFilter, searchQuery])

  return {
    data,
    loading,
    error,
    lastRefresh,
    capFilter,
    setCapFilter,
    searchQuery,
    setSearchQuery,
    expandedIds,
    toggleExpand,
    refresh: fetchData,
    derived,
    filteredCapacity
  }
}