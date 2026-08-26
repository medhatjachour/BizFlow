import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { VetFollowUpRecord, FollowUpFilterKey, FollowUpSortField, FollowUpViewMode, FollowUpMetrics } from '../types'
import { getDaysDiff } from '../utils'

const PAGE_SIZE = 12

export function useVetFollowUps() {
  const toast = useToast()
  const [allFollowUps, setAllFollowUps] = useState<VetFollowUpRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [clearingId, setClearingId] = useState<string | null>(null)

  // Filters & State
  const [filter, setFilter] = useState<FollowUpFilterKey>('today')
  const [search, setSearch] = useState('')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [sortField, setSortField] = useState<FollowUpSortField>('followUpDate')
  const [sortAsc, setSortAsc] = useState(true)
  const [viewMode, setViewMode] = useState<FollowUpViewMode>('grid')
  const [page, setPage] = useState(1)

  const loadFollowUps = useCallback(async (isSilent = false) => {
    if (isSilent) setIsRefreshing(true)
    else setLoading(true)

    try {
      const from = new Date(Date.now() - 45 * 86_400_000).toISOString()
      const to = new Date(Date.now() + 120 * 86_400_000).toISOString()
      const result = (await window.api.vet?.sessions.getFollowUps({ from, to, skip: 0, take: 600 })) as any

      const list: VetFollowUpRecord[] = result?.data ?? (Array.isArray(result) ? result : [])
      setAllFollowUps(list)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load follow-up reminders')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    loadFollowUps()
  }, [loadFollowUps])

  const markDone = async (session: VetFollowUpRecord) => {
    setClearingId(session.id)
    try {
      await window.api.vet?.sessions.update(session.id, { followUpDate: null })
      setAllFollowUps((prev) => prev.filter((f) => f.id !== session.id))
      toast.success(`Follow-up completed for ${session.patient?.name || 'patient'}`)
    } catch {
      toast.error('Failed to dismiss reminder')
    } finally {
      setClearingId(null)
    }
  }

  const reschedule = async (sessionId: string, newDateIso: string) => {
    try {
      await window.api.vet?.sessions.update(sessionId, { followUpDate: newDateIso })
      setAllFollowUps((prev) =>
        prev.map((f) => (f.id === sessionId ? { ...f, followUpDate: newDateIso } : f))
      )
      toast.success('Follow-up date updated')
    } catch {
      toast.error('Failed to reschedule follow-up')
    }
  }

  // Metrics
  const metrics: FollowUpMetrics = useMemo(() => {
    let overdue = 0
    let today = 0
    let upcoming = 0
    let thisWeek = 0

    for (const f of allFollowUps) {
      const diff = getDaysDiff(f.followUpDate)
      if (diff < 0) overdue++
      else if (diff === 0) today++
      else {
        upcoming++
        if (diff <= 7) thisWeek++
      }
    }

    return { total: allFollowUps.length, overdue, today, upcoming, thisWeek }
  }, [allFollowUps])

  // Filtered & Sorted
  const filteredList = useMemo(() => {
    let list = [...allFollowUps]

    // 1. Status Filter
    if (filter === 'today') list = list.filter((f) => getDaysDiff(f.followUpDate) === 0)
    else if (filter === 'overdue') list = list.filter((f) => getDaysDiff(f.followUpDate) < 0)
    else if (filter === 'upcoming') list = list.filter((f) => getDaysDiff(f.followUpDate) > 0)

    // 2. Doctor Filter
    if (doctorFilter !== 'all') {
      list = list.filter((f) => f.vetName === doctorFilter)
    }

    // 3. Search Query
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (f) =>
          f.patient?.name?.toLowerCase().includes(q) ||
          f.patient?.owner?.name?.toLowerCase().includes(q) ||
          f.patient?.owner?.phone?.includes(q) ||
          f.chiefComplaint?.toLowerCase().includes(q) ||
          f.diagnosis?.toLowerCase().includes(q) ||
          f.vetName?.toLowerCase().includes(q)
      )
    }

    // 4. Sort
    list.sort((a, b) => {
      let valA: any = a[sortField] ?? ''
      let valB: any = b[sortField] ?? ''

      if (sortField === 'followUpDate' || sortField === 'visitDate') {
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
  }, [allFollowUps, filter, doctorFilter, search, sortField, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE))
  const paginatedList = useMemo(
    () => filteredList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredList, page]
  )

  const attendingDoctors = useMemo(() => {
    const set = new Set<string>()
    for (const f of allFollowUps) {
      if (f.vetName) set.add(f.vetName)
    }
    return Array.from(set)
  }, [allFollowUps])

  return {
    allFollowUps,
    filteredList,
    paginatedList,
    metrics,
    totalPages,
    page,
    setPage,
    filter,
    setFilter,
    search,
    setSearch,
    doctorFilter,
    setDoctorFilter,
    attendingDoctors,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    viewMode,
    setViewMode,
    loading,
    isRefreshing,
    clearingId,
    refresh: () => loadFollowUps(true),
    markDone,
    reschedule
  }
}