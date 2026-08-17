import { useState, useEffect, useCallback, useMemo } from 'react'
import { calculateMonthlyTrend, generateInsights } from '../utils'
import type {
  ClinicOverview,
  DiagnosisEntry,
  FullTrendEntry,
  MonthlyEntry,
  Breakdowns,
  DoctorPerformance,
  TrendRange
} from '../types'

export function useClinicStats() {
  const [trendDays, setTrendDays] = useState<TrendRange>(30)
  const [overview, setOverview] = useState<ClinicOverview | null>(null)
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([])
  const [fullTrend, setFullTrend] = useState<FullTrendEntry[]>([])
  const [monthly, setMonthly] = useState<MonthlyEntry[]>([])
  const [breakdowns, setBreakdowns] = useState<Breakdowns | null>(null)
  const [byDoctor, setByDoctor] = useState<DoctorPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)

      const clinicStatsApi = (window.api.clinic.stats as any)
      try {
        const [ov, dx, ft, mo, bd, docRows] = await Promise.all([
          clinicStatsApi.overview(),
          clinicStatsApi.topDiagnoses(8),
          clinicStatsApi.fullTrend(trendDays),
          clinicStatsApi.monthlyTrend(6),
          clinicStatsApi.breakdowns(),
          clinicStatsApi.byDoctor().catch(() => [])
        ])

        setOverview(ov ?? null)
        setDiagnoses(dx ?? [])
        setFullTrend(ft ?? [])
        setMonthly(mo ?? [])
        setBreakdowns(bd ?? null)
        setByDoctor(docRows ?? [])
      } catch (err) {
        console.error('[useClinicStats] Error loading statistics:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [trendDays]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Derived metrics
  const collectionRate = useMemo(() => {
    if (!overview) return 0
    const totalBilled = overview.revenueThisMonth + overview.outstandingThisMonth
    return totalBilled > 0 ? Math.round((overview.revenueThisMonth / totalBilled) * 100) : 0
  }, [overview])

  const avgSessionValue = useMemo(() => {
    if (!overview || overview.sessionsThisMonth === 0) return 0
    return Math.round(overview.revenueThisMonth / overview.sessionsThisMonth)
  }, [overview])

  const revenueTrend = useMemo(() => calculateMonthlyTrend(monthly, 'revenue'), [monthly])
  const sessionsTrend = useMemo(() => calculateMonthlyTrend(monthly, 'sessions'), [monthly])

  const insights = useMemo(
    () => generateInsights(overview, collectionRate, avgSessionValue, revenueTrend, diagnoses),
    [overview, collectionRate, avgSessionValue, revenueTrend, diagnoses]
  )

  return {
    trendDays,
    setTrendDays,
    overview,
    diagnoses,
    fullTrend,
    monthly,
    breakdowns,
    byDoctor,
    loading,
    refreshing,
    collectionRate,
    avgSessionValue,
    revenueTrend,
    sessionsTrend,
    insights,
    reload: () => loadData(true)
  }
}