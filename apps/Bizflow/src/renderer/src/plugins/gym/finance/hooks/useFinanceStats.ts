import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Period, GymStatsOverview, GymExpenseSummary } from '../types'

export function useFinanceStats() {
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('month')
  const [stats, setStats] = useState<GymStatsOverview | null>(null)
  const [summary, setSummary] = useState<GymExpenseSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [st, sm] = await Promise.all([
        (window.api as any)?.gym?.stats?.overview?.(period),
        (window.api as any)?.gym?.expenses?.summary?.(period)
      ])
      setStats(st ?? null)
      setSummary(sm ?? null)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load financial records')
    } finally {
      setLoading(false)
    }
  }, [period, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    period,
    setPeriod,
    stats,
    summary,
    loading,
    refresh: fetchData
  }
}