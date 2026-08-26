import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { ExpenseRecord, ExpenseSummary, PeriodPreset, ExpenseSortField, ExpenseViewMode } from '../types'
import { computeExpenseRange } from '../utils'

const PAGE_SIZE = 50

export function useVetExpenses() {
  const toast = useToast()
  const [period, setPeriod] = useState<PeriodPreset>('month')
  const [customRange, setCustomRange] = useState<{ from?: string; to?: string }>({})
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [sortField, setSortField] = useState<ExpenseSortField>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [viewMode, setViewMode] = useState<ExpenseViewMode>('table')

  const activeRange = useMemo(() => {
    if (period === 'custom' && customRange.from && customRange.to) {
      const f = new Date(customRange.from); f.setHours(0, 0, 0, 0)
      const t = new Date(customRange.to); t.setHours(23, 59, 59, 999)
      return { from: f.toISOString(), to: t.toISOString() }
    }
    return computeExpenseRange(period === 'custom' ? 'month' : period)
  }, [period, customRange])

  const loadExpenses = useCallback(
    async (reset = false, explicitPage?: number) => {
      const currentPage = reset ? 0 : (explicitPage ?? page)
      if (reset) {
        setPage(0)
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }

      try {
        const [expResult, sumResult] = await Promise.all([
          window.api.vet?.expenses.getAll({
            from: activeRange.from,
            to: activeRange.to,
            skip: currentPage * PAGE_SIZE,
            take: PAGE_SIZE
          }),
          window.api.vet?.expenses.summary({
            from: activeRange.from,
            to: activeRange.to
          })
        ])

        const rawList = expResult?.data ?? (Array.isArray(expResult) ? expResult : [])
        setExpenses((prev) => (reset || currentPage === 0 ? rawList : [...prev, ...rawList]))
        setTotal(expResult?.total ?? rawList.length)
        setSummary(sumResult ?? null)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load clinic expenses')
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeRange, page, toast]
  )

  useEffect(() => {
    loadExpenses(true)
  }, [loadExpenses])

  const filteredAndSortedExpenses = useMemo(() => {
    let list = [...expenses]

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.vendor && e.vendor.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      )
    }

    // 2. Category Filter
    if (categoryFilter !== 'all') {
      list = list.filter((e) => e.category === categoryFilter)
    }

    // 3. Payment Method Filter
    if (paymentFilter !== 'all') {
      list = list.filter((e) => e.paymentMethod === paymentFilter)
    }

    // 4. Sort
    list.sort((a, b) => {
      let valA: any = a[sortField] ?? ''
      let valB: any = b[sortField] ?? ''

      if (sortField === 'amount') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else if (sortField === 'date') {
        valA = new Date(valA).getTime()
        valB = new Date(valB).getTime()
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
      }

      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [expenses, search, categoryFilter, paymentFilter, sortField, sortAsc])

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const exp of expenses) {
      map[exp.category] = (map[exp.category] || 0) + Number(exp.amount || 0)
    }
    return map
  }, [expenses])

  return {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    expenses: filteredAndSortedExpenses,
    rawCount: expenses.length,
    filteredCount: filteredAndSortedExpenses.length,
    summary,
    total,
    page,
    setPage,
    loading,
    isRefreshing,
    refresh: () => loadExpenses(true),
    loadMore: () => {
      const next = page + 1
      setPage(next)
      loadExpenses(false, next)
    },
    // Filter controls
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    paymentFilter,
    setPaymentFilter,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode,
    categoryTotals
  }
}