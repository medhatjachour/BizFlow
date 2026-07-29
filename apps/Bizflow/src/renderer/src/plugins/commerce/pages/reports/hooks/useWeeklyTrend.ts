import { useState, useCallback, useEffect } from 'react'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { TrendsResult } from '@renderer/hooks/useDashboardWorker'
import { calculateRefundedAmount } from '@/shared/utils/refundCalculations'
import { WEEKLY_TREND_DAYS } from '../constants'
import logger from '@/shared/utils/logger'

type WeeklyPoint = {
  day: string
  revenue: number
  label: string
}

type UseWeeklyTrendOptions = {
  refreshSignal?: number
  onTrendReady?: (pct: number) => void
}

export function useWeeklyTrend({ refreshSignal, onTrendReady }: UseWeeklyTrendOptions = {}) {
  const { compute } = useDashboardWorker()

  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>([])
  const [trendResult, setTrendResult] = useState<TrendsResult | null>(null)
  const [loading, setLoading] = useState(true)

  const loadWeeklyTrend = useCallback(async () => {
    setLoading(true)
    try {
      const days = Array.from({ length: WEEKLY_TREND_DAYS }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (WEEKLY_TREND_DAYS - 1 - i))
        const start = new Date(d)
        start.setHours(0, 0, 0, 0)
        const end = new Date(d)
        end.setHours(23, 59, 59, 999)
        return {
          start,
          end,
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }
      })

      const results = await Promise.allSettled(
        days.map(({ start, end }) =>
          window.api.saleTransactions.getByDateRange({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          })
        )
      )

      const revenues = results.map((r) => {
        if (r.status !== 'fulfilled') return 0
        return (r.value as any[]).reduce((sum: number, sale: any) => {
          const refunded = calculateRefundedAmount(sale.items || [])
          return sum + (sale.subtotal ?? sale.total) - refunded
        }, 0)
      })

      setWeeklyData(
        days.map((d, i) => ({
          day: d.day,
          label: d.label,
          revenue: revenues[i],
        }))
      )

      const trend = await compute<TrendsResult>('COMPUTE_TRENDS', {
        values: revenues,
        labels: days.map((d) => d.day),
      })

      if (trend) {
        setTrendResult(trend)

        const yesterday = revenues[WEEKLY_TREND_DAYS - 2]
        const today = revenues[WEEKLY_TREND_DAYS - 1]
        const pct =
          yesterday > 0
            ? parseFloat((((today - yesterday) / yesterday) * 100).toFixed(1))
            : today > 0
              ? 100
              : 0

        onTrendReady?.(pct)
      }
    } catch (err) {
      logger.error('CommerceReport: loadWeeklyTrend failed', err)
    } finally {
      setLoading(false)
    }
  }, [compute, onTrendReady])

  useEffect(() => {
    loadWeeklyTrend()
  }, [loadWeeklyTrend, refreshSignal])

  return {
    weeklyData,
    trendResult,
    loading,
    reload: loadWeeklyTrend,
  }
}