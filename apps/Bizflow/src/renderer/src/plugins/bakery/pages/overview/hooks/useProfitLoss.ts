import { useState, useEffect, useCallback, useMemo } from 'react'
import { PLData, TrendSeries } from '../types'

export function useProfitLoss() {
  const [data, setData] = useState<PLData | null>(null)
  const [trendData, setTrendData] = useState<{ weeks: string[]; series: TrendSeries[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendLoading, setTrendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showTrend, setShowTrend] = useState(false)

  const loadPnL = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.bakery.getProfitLoss({
        startDate: startDate || undefined,
        endDate: endDate || undefined
      })
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load Profit & Loss')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    loadPnL()
  }, [loadPnL])

  const toggleTrend = async () => {
    if (trendData) {
      setShowTrend(v => !v)
      return
    }
    setTrendLoading(true)
    try {
      const result = await window.api.bakery.getProfitLossTrend({ weeks: 8 })
      setTrendData(result)
      setShowTrend(true)
    } catch {
      // silent fail
    } finally {
      setTrendLoading(false)
    }
  }

  const derived = useMemo(() => {
    if (!data) return { overallMargin: null, bestRecipe: null, worstRecipe: null }

    const overallMargin =
      data.totals.totalRevenue > 0
        ? ((data.totals.grossProfit / data.totals.totalRevenue) * 100).toFixed(1)
        : null

    const bestRecipe = data.rows.reduce<(typeof data.rows)[0] | null>((best, row) => {
      if (!best || row.marginPercent > (best.marginPercent ?? -Infinity)) return row
      return best
    }, null)

    const worstRecipe = data.rows.reduce<(typeof data.rows)[0] | null>((worst, row) => {
      if (!worst || row.marginPercent < (worst.marginPercent ?? Infinity)) return row
      return worst
    }, null)

    return { overallMargin, bestRecipe, worstRecipe }
  }, [data])

  return {
    data,
    trendData,
    loading,
    trendLoading,
    error,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showTrend,
    toggleTrend,
    reload: loadPnL,
    derived
  }
}