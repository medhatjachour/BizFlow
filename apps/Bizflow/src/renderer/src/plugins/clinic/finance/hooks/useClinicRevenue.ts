import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'
import { toArray } from '../utils'
import { DEBT_PAGE_SIZE } from '../constants'
import type { Period, PatientWithFinance, DebtorsResponse, RevenueBreakdownEntry } from '../types'

export function useClinicRevenue(period: Period, enabled: boolean) {
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [debtPatients, setDebtPatients] = useState<PatientWithFinance[]>([])
  const [debtMeta, setDebtMeta] = useState({ total: 0, totalOutstanding: 0, hasMore: false })
  const [debtSearchInput, setDebtSearchInput] = useState('')
  const [debtSearch, setDebtSearch] = useState('')
  const [revBreakdown, setRevBreakdown] = useState<RevenueBreakdownEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setDebtSearch(debtSearchInput.trim()), 280)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [debtSearchInput])

  const loadRevenue = useCallback(
    async (opts?: { append?: boolean; skip?: number }) => {
      if (!enabled) return
      const append = Boolean(opts?.append)
      const skip = opts?.skip ?? 0

      if (append) setLoadingMore(true)
      else setLoading(true)

      try {
        const [debtorsRes, brk] = await Promise.all([
          (window.api.clinic.patients.getDebtors as any)({
            search: debtSearch || undefined,
            skip,
            take: DEBT_PAGE_SIZE
          }) as Promise<DebtorsResponse>,
          window.api.clinic.expenses.breakdown({ period })
        ])

        const debtors = toArray<PatientWithFinance>(debtorsRes)
        if (append) {
          setDebtPatients((prev) => [...prev, ...debtors])
        } else {
          setDebtPatients(debtors)
        }

        setDebtMeta({
          total: Number(debtorsRes?.total ?? debtors.length),
          totalOutstanding: Number(debtorsRes?.totalOutstanding ?? 0),
          hasMore: Boolean(debtorsRes?.hasMore)
        })

        setRevBreakdown(
          (brk ?? []).map((b: { label: string; total: number }) => ({
            label: b.label,
            revenue: 0,
            expenses: b.total
          }))
        )
      } catch (e) {
        logger.error('ClinicFinance: loadRevenue failed', e)
        if (!append) {
          showToast('error', t('failedLoadOutstanding') || 'Failed to load outstanding receivables')
          setDebtPatients([])
          setDebtMeta({ total: 0, totalOutstanding: 0, hasMore: false })
        } else {
          showToast('error', t('failedLoadMoreDebtors') || 'Failed to load more records')
        }
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [enabled, period, debtSearch, showToast, t]
  )

  useEffect(() => {
    if (enabled) {
      loadRevenue({ append: false, skip: 0 })
    }
  }, [enabled, period, debtSearch, loadRevenue])

  return {
    debtPatients,
    debtMeta,
    debtSearchInput,
    debtSearch,
    revBreakdown,
    loading,
    loadingMore,
    setDebtSearchInput,
    loadMore: () => loadRevenue({ append: true, skip: debtPatients.length }),
    reload: () => loadRevenue({ append: false, skip: 0 })
  }
}