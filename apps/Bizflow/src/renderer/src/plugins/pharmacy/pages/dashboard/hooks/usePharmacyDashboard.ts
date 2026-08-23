import { useState, useEffect, useCallback } from 'react'
import { pharma } from '../../components/_shared'
import { DashboardPeriod, DashboardOverview, CashflowSnapshot } from '../types'

export function usePharmacyDashboard(toast: any) {
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [cashflow, setCashflow] = useState<CashflowSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ovRes, cfRes] = await Promise.all([
        pharma()?.stats.overview(period),
        pharma()?.stats.cashflow(),
      ])
      setOverview(ovRes ?? null)
      setCashflow(cfRes ?? null)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }, [period, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    period,
    overview,
    cashflow,
    loading,
    setPeriod,
    reload: loadData,
  }
}