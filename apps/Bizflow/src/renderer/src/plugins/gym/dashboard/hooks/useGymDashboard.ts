import { useState, useEffect, useCallback } from 'react'
import { GymDashboardOverview, AtRiskMember, ExpiringSubscription } from '../types'

export function useGymDashboard(refreshSignal?: number) {
  const [stats, setStats] = useState<GymDashboardOverview | null>(null)
  const [atRisk, setAtRisk] = useState<AtRiskMember[]>([])
  const [expiringSubs, setExpiringSubs] = useState<ExpiringSubscription[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, riskRes, subsRes] = await Promise.allSettled([
        (window.api as any)?.gym?.stats?.overview?.('month'),
        (window.api as any)?.gym?.alerts?.atRisk?.(14),
        (window.api as any)?.gym?.subscriptions?.getAll?.({ status: 'active', take: 300 })
      ])

      if (overviewRes.status === 'fulfilled') {
        setStats(overviewRes.value ?? null)
      }

      if (riskRes.status === 'fulfilled') {
        setAtRisk(Array.isArray(riskRes.value) ? riskRes.value : [])
      }

      if (subsRes.status === 'fulfilled') {
        const now = Date.now()
        const oneWeekMs = 7 * 86_400_000
        const rawSubs = Array.isArray(subsRes.value) ? subsRes.value : (subsRes.value?.data ?? [])
        
        const filtered = rawSubs
          .filter((s: ExpiringSubscription) => {
            const time = new Date(s.endDate).getTime()
            return time >= now && time <= now + oneWeekMs
          })
          .sort(
            (a: ExpiringSubscription, b: ExpiringSubscription) =>
              new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
          )

        setExpiringSubs(filtered)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, refreshSignal])

  return {
    stats,
    atRisk,
    expiringSubs,
    loading,
    refresh: loadData
  }
}