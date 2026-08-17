import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'
import type { Period, FinanceSummary, SpendBreakdownEntry } from '../types'

export function useClinicFinanceOverview(period: Period) {
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [breakdown, setBreakdown] = useState<SpendBreakdownEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      const api = window.api.clinic
      const [sum, brk] = await Promise.all([
        api.expenses.summary(period),
        api.expenses.breakdown({ period })
      ])
      setSummary(sum as FinanceSummary)
      setBreakdown(brk ?? [])
    } catch (e) {
      logger.error('ClinicFinance: loadOverview failed', e)
      showToast('error', t('failedLoadFinancial') || 'Failed to load financial overview')
    } finally {
      setLoading(false)
    }
  }, [period, showToast, t])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  return {
    summary,
    breakdown,
    loading,
    reload: loadOverview
  }
}