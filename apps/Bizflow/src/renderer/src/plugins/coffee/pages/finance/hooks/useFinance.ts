import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FinanceOverview, Transaction, Preset, Filters } from '../types'
import { applyPreset, EMPTY_FILTERS, PAGE_SIZE } from '../constants'
import { exportToCsv } from '../utils'

export function useFinance(toast: any) {
  // ── Filters (grouped) ──
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    ...applyPreset('month'),
  })

  const patchFilters = useCallback((patch: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const applyPresetRange = useCallback((p: Preset) => {
    const range = applyPreset(p)
    setFilters(prev => ({
      ...prev,
      preset: p,
      from: range.from,
      to: range.to,
      page: 1,
    }))
  }, [])

  const setPage = useCallback((p: number) => {
    setFilters(prev => ({ ...prev, page: p }))
  }, [])

  // ── Data ──
  const [overview,      setOverview]      = useState<FinanceOverview | null>(null)
  const [transactions,  setTransactions]  = useState<Transaction[]>([])
  const [totalPages,    setTotalPages]    = useState(1)
  const [loading,       setLoading]       = useState(true)

  // ── API params ──
  const apiFilters = useMemo(
    () => ({
      startDate: filters.from ? new Date(`${filters.from}T00:00:00`).toISOString() : undefined,
      endDate:   filters.to   ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
    }),
    [filters.from, filters.to]
  )

  // ── Load ──
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, tx] = await Promise.all([
        window.api.coffee.finance.getOverview(apiFilters),
        window.api.coffee.finance.getTransactions({
          ...apiFilters,
          paymentMethod: filters.paymentMethod === 'all' ? undefined : filters.paymentMethod,
          type:          filters.type === 'all' ? undefined : filters.type,
          search:        filters.search.trim() || undefined,
          page:          filters.page,
          pageSize:      PAGE_SIZE,
        }),
      ])
      setOverview(ov)
      setTransactions(tx?.items ?? [])
      setTotalPages(tx?.totalPages ?? 1)
    } catch {
      toast.error('Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [apiFilters, filters.paymentMethod, filters.type, filters.search, filters.page, toast])

  useEffect(() => { load() }, [load])

  // ── Export ──
  const handleExport = useCallback(() => {
    if (!overview && transactions.length === 0) {
      toast.error('No data to export')
      return
    }
    exportToCsv(overview, transactions, filters.from, filters.to)
    toast.success('Report exported')
  }, [overview, transactions, filters.from, filters.to, toast])

  // ── Derived: drawer variance ──
  const drawerVariance = overview
    ? overview.shiftStats.closingCash - overview.shiftStats.expectedDrawer
    : 0

  // ── Derived: payment breakdown data ──
  const paymentData = useMemo(() => {
    if (!overview) return []
    return [
      { label: 'Cash',     value: overview.payment.cash ?? 0,          pct: overview.paymentPct.cash ?? 0,          key: 'cash' },
      { label: 'Card',     value: overview.payment.card ?? 0,          pct: overview.paymentPct.card ?? 0,          key: 'card' },
      { label: 'Vodafone', value: overview.payment.vodafone_cash ?? 0, pct: overview.paymentPct.vodafone_cash ?? 0, key: 'vodafone_cash' },
    ]
  }, [overview])

  // ── Derived: profit waterfall data ──
  const waterfallData = useMemo(() => {
    if (!overview) return null
    return {
      grossSales:  overview.grossSales,
      discounts:   overview.totalDiscount,
      netSales:    overview.netSales,
      cogs:        overview.cogs,
      grossProfit: overview.grossProfit,
      expenses:    overview.totalExpenses,
      netProfit:   overview.netProfitAfterExpenses,
      marginPct:   overview.grossMarginPct,
    }
  }, [overview])

  return {
    // data
    overview,
    transactions,
    totalPages,
    loading,
    paymentData,
    waterfallData,
    drawerVariance,
    // filters
    filters,
    patchFilters,
    applyPresetRange,
    setPage,
    // actions
    handleExport,
    load,
  }
}
