import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { PAGE_SIZE } from '../constants'
import { calculateDatePreset, roundCurrency } from '../utils'
import type { Sale, SaleGroup, HistoryViewMode, DatePreset, HistoryFilterParams } from '../types'

const api = (window as any).api?.vet?.medicines

export function useSalesHistory() {
  const toast = useToast()

  const [viewMode, setViewMode] = useState<HistoryViewMode>('grouped')
  const [sales, setSales] = useState<Sale[]>([])
  const [groups, setGroups] = useState<SaleGroup[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters State
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [preset, setPreset] = useState<DatePreset>('')
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>(['all'])

  // Collapsible view preferences
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vet_sales_history_showFilters') !== '0'
    } catch {
      return true
    }
  })
  const [showStats, setShowStats] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vet_sales_history_showStats') === '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('vet_sales_history_showFilters', showFilters ? '1' : '0')
    } catch {}
  }, [showFilters])

  useEffect(() => {
    try {
      localStorage.setItem('vet_sales_history_showStats', showStats ? '1' : '0')
    } catch {}
  }, [showStats])

  // Load available categories
  useEffect(() => {
    ;(window as any).api?.vet?.medicineCategories
      ?.getAll()
      .then((rows: { name: string }[]) => {
        setCategories(['all', ...(rows ?? []).map(r => r.name)])
      })
      .catch(() => {})
  }, [])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 280)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params: HistoryFilterParams = {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        search: debouncedSearch.trim() || undefined,
        category: category !== 'all' ? category : undefined,
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE
      }

      if (viewMode === 'grouped') {
        const res = await api.getSaleGroups(params)
        setGroups(res.data ?? [])
        setTotalRecords(res.total ?? 0)
      } else {
        const res = await api.getSales(params)
        setSales(res.data ?? [])
        setTotalRecords(res.total ?? 0)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch sales history')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, debouncedSearch, category, page, viewMode, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const applyPreset = (p: 'today' | 'week' | 'month') => {
    const { from, to } = calculateDatePreset(p)
    setDateFrom(from)
    setDateTo(to)
    setPreset(p)
    setPage(1)
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setDebouncedSearch('')
    setPreset('')
    setCategory('all')
    setPage(1)
  }

  const kpis = useMemo(() => {
    if (viewMode === 'grouped') {
      const revenue = groups.reduce((acc, g) => acc + g.total, 0)
      const cogs = groups.reduce((acc, g) => acc + g.cost, 0)
      const grossProfit = revenue - cogs
      const outstanding = groups.reduce((acc, g) => acc + g.remaining, 0)
      return {
        count: totalRecords,
        revenue: roundCurrency(revenue),
        cogs: roundCurrency(cogs),
        grossProfit: roundCurrency(grossProfit),
        outstanding: roundCurrency(outstanding)
      }
    }

    const revenue = sales.reduce((acc, s) => acc + s.totalPrice, 0)
    const cogs = sales.reduce((acc, s) => {
      const qty =
        s.saleUnit === 'sub' && s.medicine?.subUnit
          ? s.quantity / (s.medicine?.subUnitsPerContainer ?? 1)
          : s.quantity
      return acc + (s.costTotal ?? qty * (s.batch?.costPerUnit ?? 0))
    }, 0)
    const grossProfit = revenue - cogs
    const outstanding = sales.reduce((acc, s) => {
      const paid = s.amountPaid ?? s.totalPrice
      return acc + Math.max(0, s.totalPrice - paid)
    }, 0)

    return {
      count: totalRecords,
      revenue: roundCurrency(revenue),
      cogs: roundCurrency(cogs),
      grossProfit: roundCurrency(grossProfit),
      outstanding: roundCurrency(outstanding)
    }
  }, [viewMode, groups, sales, totalRecords])

  const hasActiveFilters = Boolean(dateFrom || dateTo || search || category !== 'all')

  return {
    viewMode,
    setViewMode,
    sales,
    groups,
    totalRecords,
    loading,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(totalRecords / PAGE_SIZE)),
    dateFrom,
    setDateFrom: (v: string) => {
      setDateFrom(v)
      setPreset('')
      setPage(1)
    },
    dateTo,
    setDateTo: (v: string) => {
      setDateTo(v)
      setPreset('')
      setPage(1)
    },
    search,
    setSearch,
    preset,
    applyPreset,
    category,
    setCategory: (c: string) => {
      setCategory(c)
      setPage(1)
    },
    categories,
    hasActiveFilters,
    clearFilters,
    showFilters,
    setShowFilters,
    showStats,
    setShowStats,
    kpis,
    refreshHistory: loadData
  }
}