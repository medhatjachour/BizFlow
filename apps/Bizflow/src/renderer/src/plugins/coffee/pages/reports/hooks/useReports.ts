import { useState, useCallback, useEffect } from 'react'
import { ReportFilters, Overview, TrendRow, ProductRow, CategoryRow, CustomerInsights } from '../types'

interface UseReportsReturn {
  overview: Overview | null
  trend: TrendRow[]
  topProducts: ProductRow[]
  categories: CategoryRow[]
  customers: CustomerInsights | null
  loading: boolean
  error: string | null
  refresh: () => void
  lastUpdated: Date | null
}

export function useReports(filters: ReportFilters, toast: { error: (msg: string) => void }): UseReportsReturn {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [trend, setTrend] = useState<TrendRow[]>([])
  const [topProducts, setTopProducts] = useState<ProductRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [customers, setCustomers] = useState<CustomerInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [ov, tr, tp, cp, ci] = await Promise.all([
          window.api.coffee.reports.getOverview(filters),
          window.api.coffee.reports.getDailyTrend(filters),
          window.api.coffee.reports.getTopProducts({ ...filters, limit: 50 }),
          window.api.coffee.reports.getCategoryPerformance({ ...filters, limit: 20 }),
          window.api.coffee.reports.getCustomerInsights({ ...filters, limit: 20 }),
        ])

        if (cancelled) return

        setOverview(ov)
        setTrend(tr ?? [])
        setTopProducts(tp ?? [])
        setCategories(cp ?? [])
        setCustomers(ci)
        setLastUpdated(new Date())
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load reports'
        setError(message)
        toast.error('Failed to load coffee reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [filters, refreshKey, toast])

  return {
    overview,
    trend,
    topProducts,
    categories,
    customers,
    loading,
    error,
    refresh,
    lastUpdated,
  }
}
