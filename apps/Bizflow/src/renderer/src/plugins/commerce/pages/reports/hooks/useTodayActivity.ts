import { useState, useCallback, useEffect } from 'react'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { HeatmapResult } from '@renderer/hooks/useDashboardWorker'
import type { ActivityItem, ItemSummary, TodayStats } from '@renderer/pages/Reports/types'
import {
  getTodayDateRange,
  computeTodayStats,
  buildItemsSummary,
  buildActivityFeed,
  collectVariantIds,
} from '../utils/todayAggregations'
import { ACTIVITY_FEED_LIMIT } from '../constants'
import logger from '@/shared/utils/logger'

type UseTodayActivityOptions = {
  refreshSignal?: number
  onRevenueChangeReady?: (pct: number) => void
}

function normalizeExpensesList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.expenses)) return obj.expenses
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.items)) return obj.items
  }
  return []
}

export function useTodayActivity({ refreshSignal }: UseTodayActivityOptions = {}) {
  const { compute } = useDashboardWorker()

  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [itemsSummary, setItemsSummary] = useState<ItemSummary[]>([])
  const [totalPiecesSold, setTotalPiecesSold] = useState(0)
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)

  const loadTodayActivity = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getTodayDateRange()
      const startDate = start.toISOString()
      const endDate = end.toISOString()

      const [salesData, expensesRaw] = await Promise.all([
        window.api.saleTransactions.getByDateRange({ startDate, endDate }),
        window.api.expenses?.getAll
          ? window.api.expenses.getAll({ startDate, endDate })
          : Promise.resolve([]),
      ])

      const expensesList = normalizeExpensesList(expensesRaw)

      setTodayStats(computeTodayStats(salesData, expensesList))

      const variantIds = collectVariantIds(salesData)
      const variantsMap = new Map<string, any>()

      if (variantIds.length > 0) {
        const variants = await Promise.all(
          variantIds.map((id) =>
            window.api.products.getVariantById(id).catch(() => null)
          )
        )
        variantIds.forEach((id, i) => {
          if (variants[i]) variantsMap.set(id, variants[i])
        })
      }

      const { itemsSummary: summary, totalPiecesSold: pieces } = buildItemsSummary(
        salesData,
        variantsMap
      )
      setItemsSummary(summary)
      setTotalPiecesSold(pieces)

      setActivityFeed(buildActivityFeed(salesData, expensesList, ACTIVITY_FEED_LIMIT))

      if (salesData.length > 0) {
        const hmap = await compute<HeatmapResult>('COMPUTE_HEATMAP', {
          timestamps: salesData.map((s: any) => s.createdAt),
        })
        if (hmap) setHeatmapResult(hmap)
      } else {
        setHeatmapResult(null)
      }
    } catch (err) {
      logger.error('CommerceReport: loadTodayActivity failed', err)
    } finally {
      setLoading(false)
    }
  }, [compute])

  useEffect(() => {
    loadTodayActivity()
  }, [loadTodayActivity, refreshSignal])

  const patchRevenueChange = useCallback((pct: number) => {
    setTodayStats((prev) => (prev ? { ...prev, revenueChange: pct } : prev))
  }, [])

  return {
    todayStats,
    activityFeed,
    itemsSummary,
    totalPiecesSold,
    heatmapResult,
    loading,
    expandedSales,
    setExpandedSales,
    expandedProducts,
    setExpandedProducts,
    itemSearchQuery,
    setItemSearchQuery,
    selectedReceipt,
    setSelectedReceipt,
    reload: loadTodayActivity,
    patchRevenueChange,
  }
}