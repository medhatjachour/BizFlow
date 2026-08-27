import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { VetSessionRecord, PeriodPreset, SessionSortField, SessionViewMode } from '../types'
import { computeSessionRange } from '../utils'

const PAGE_SIZE = 50

export function useVetSessions() {
  const toast = useToast()
  const [period, setPeriod] = useState<PeriodPreset>('month')
  const [customRange, setCustomRange] = useState<{ from?: string; to?: string }>({})
  const [sessions, setSessions] = useState<VetSessionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [visitTypeFilter, setVisitTypeFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [sortField, setSortField] = useState<SessionSortField>('visitDate')
  const [sortAsc, setSortAsc] = useState(false)
  const [viewMode, setViewMode] = useState<SessionViewMode>('table')

  const activeRange = useMemo(() => {
    if (period === 'custom' && customRange.from && customRange.to) {
      const f = new Date(customRange.from); f.setHours(0, 0, 0, 0)
      const t = new Date(customRange.to); t.setHours(23, 59, 59, 999)
      return { from: f.toISOString(), to: t.toISOString() }
    }
    return computeSessionRange(period === 'custom' ? 'month' : period)
  }, [period, customRange])

  const loadSessions = useCallback(
    async (reset = false, explicitPage?: number) => {
      const currentPage = reset ? 0 : (explicitPage ?? page)
      if (reset) {
        setPage(0)
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }

      try {
        const result = (await window.api.vet?.sessions.getRecent({
          startDate: activeRange.from,
          endDate: activeRange.to,
          skip: currentPage * PAGE_SIZE,
          take: PAGE_SIZE
        })) as any

        const rawList = result?.data ?? (Array.isArray(result) ? result : [])
        setSessions((prev) => (reset || currentPage === 0 ? rawList : [...prev, ...rawList]))
        setTotal(result?.total ?? rawList.length)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load clinic sessions')
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeRange, page, toast]
  )

  useEffect(() => {
    loadSessions(true)
  }, [loadSessions])

  const filteredAndSortedSessions = useMemo(() => {
    let list = [...sessions]

    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => {
        const ptName = s.patient?.name?.toLowerCase() || ''
        const owName = s.patient?.owner?.name?.toLowerCase() || ''
        const vet = s.vetName?.toLowerCase() || ''
        const dx = s.diagnosis?.toLowerCase() || ''
        const cc = s.chiefComplaint?.toLowerCase() || ''
        return ptName.includes(q) || owName.includes(q) || vet.includes(q) || dx.includes(q) || cc.includes(q)
      })
    }

    // 2. Visit Type Filter
    if (visitTypeFilter !== 'all') {
      list = list.filter((s) => s.visitType === visitTypeFilter)
    }

    // 3. Payment Filter
    if (paymentFilter !== 'all') {
      list = list.filter((s) => s.paymentStatus === paymentFilter)
    }

    // 4. Sort
    list.sort((a, b) => {
      let valA: any = a[sortField] ?? ''
      let valB: any = b[sortField] ?? ''

      if (sortField === 'amountCharged') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else if (sortField === 'visitDate') {
        valA = new Date(valA).getTime()
        valB = new Date(valB).getTime()
      } else if (sortField === 'patient') {
        valA = a.patient?.name?.toLowerCase() || ''
        valB = b.patient?.name?.toLowerCase() || ''
      }

      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [sessions, search, visitTypeFilter, paymentFilter, sortField, sortAsc])

  // Summary Metrics
  const metrics = useMemo(() => {
    let billed = 0
    let paid = 0
    let unpaid = 0
    let completed = 0

    for (const s of sessions) {
      const c = Number(s.amountCharged) || 0
      const p = Number(s.amountPaid) || 0
      billed += c
      paid += p
      if (s.paymentStatus !== 'waived') unpaid += Math.max(0, c - p)
      if (s.status === 'completed') completed++
    }

    return {
      total: sessions.length,
      completed,
      billed,
      paid,
      outstanding: unpaid
    }
  }, [sessions])

  const updateSessionRecord = (updated: VetSessionRecord) => {
    setSessions((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
  }

  return {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    sessions: filteredAndSortedSessions,
    rawCount: sessions.length,
    filteredCount: filteredAndSortedSessions.length,
    metrics,
    total,
    page,
    loading,
    isRefreshing,
    refresh: () => loadSessions(true),
    loadMore: () => {
      const next = page + 1
      setPage(next)
      loadSessions(false, next)
    },
    updateSessionRecord,
    // Filters & UI
    search,
    setSearch,
    visitTypeFilter,
    setVisitTypeFilter,
    paymentFilter,
    setPaymentFilter,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode
  }
}