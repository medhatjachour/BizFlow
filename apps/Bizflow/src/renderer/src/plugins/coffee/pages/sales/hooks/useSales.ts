import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { periodDates } from '../utils'
import { PAGE_SIZE } from '../constants'
import type { Sale, SummaryData, SalesFilters, SalesResponse } from '../types'

export function useSales(filters: SalesFilters) {
  const toast = useToast()
  const { t } = useLanguage()
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const opts = {
      ...periodDates(filters.period),
      page,
      pageSize: PAGE_SIZE,
      paymentMethod: filters.paymentMethod === 'all' ? undefined : filters.paymentMethod,
      type: filters.type === 'all' ? undefined : filters.type,
      categoryId: filters.categoryId === 'all' ? undefined : filters.categoryId,
      search: filters.search || undefined,
      sort: filters.sort
    }
    try {
      const [salesRes, sumRes] = await Promise.all([
        window.api.coffee.sales.getAll(opts),
        window.api.coffee.sales.getSummary({
          ...periodDates(filters.period),
          categoryId: filters.categoryId === 'all' ? undefined : filters.categoryId
        })
      ])
      const res = salesRes as SalesResponse
      setSales(res?.items ?? [])
      setTotalPages(res?.totalPages ?? 1)
      setTotal(res?.total ?? 0)
      setSummary(sumRes as SummaryData)
    } catch {
      toast.error(t('cfFailedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { setPage(1) }, [filters])
  useEffect(() => { load() }, [load])

  return { sales, summary, loading, page, totalPages, total, setPage, reload: load }
}

export function useCategories() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    window.api.coffee.categories.getAll().then(setCategories).catch(() => setCategories([]))
  }, [])
  return categories
}
