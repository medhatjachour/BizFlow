import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Session, SessionFilterState } from '../types'

const PAGE_SIZE = 40

export function useSessions() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const [filters, setFilters] = useState<SessionFilterState>({
    timeframe: 'today',
    search: '',
    status: '',
    paymentStatus: ''
  })

  const loadSessions = useCallback(
    async (pageSkip = 0) => {
      const isInitial = pageSkip === 0
      if (isInitial) setLoading(true)
      else setLoadingMore(true)

      try {
        const response = await (window.api.clinic.sessions.getRecent as any)({
          filter: filters.timeframe,
          skip: pageSkip,
          take: PAGE_SIZE
        })

        if (Array.isArray(response)) {
          setSessions(response)
          setTotal(response.length)
          setHasMore(false)
          setSkip(0)
        } else {
          if (isInitial) {
            setSessions(response.data || [])
            setSkip(0)
          } else {
            setSessions(prev => [...prev, ...(response.data || [])])
            setSkip(pageSkip)
          }
          setTotal(response.total || 0)
          setHasMore(response.hasMore || false)
        }
      } catch {
        showToast('error', t('errorLoadingData') || 'Failed to load sessions')
      } finally {
        if (isInitial) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [filters.timeframe, showToast, t]
  )

  useEffect(() => {
    loadSessions(0)
  }, [loadSessions])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadSessions(skip + PAGE_SIZE)
    }
  }, [loadSessions, skip, hasMore, loadingMore])

  const updateSessionStatus = useCallback(
    async (id: string, newStatus: string) => {
      setUpdatingStatusId(id)
      try {
        await window.api.clinic.sessions.update(id, { status: newStatus })
        setSessions(prev => prev.map(s => (s.id === id ? { ...s, status: newStatus as any } : s)))
        showToast('success', t('updatedSuccessfully') || 'Session status updated')
      } catch {
        showToast('error', t('errorUpdatingRecord') || 'Failed to update status')
      } finally {
        setUpdatingStatusId(null)
      }
    },
    [showToast, t]
  )

  const deleteSession = useCallback(
    async (id: string) => {
      if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this session record?')) return
      try {
        await window.api.clinic.sessions.delete(id)
        showToast('success', t('deletedSuccessfully') || 'Session deleted')
        loadSessions(0)
      } catch {
        showToast('error', t('errorDeletingRecord') || 'Failed to delete session')
      }
    },
    [loadSessions, showToast, t]
  )

  // Client-side quick filtering
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filters.status && s.status !== filters.status) return false
      if (filters.paymentStatus && s.paymentStatus !== filters.paymentStatus) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchName = s.patient?.name?.toLowerCase().includes(q)
        const matchComplaint = s.chiefComplaint?.toLowerCase().includes(q)
        const matchDiagnosis = s.diagnosis?.toLowerCase().includes(q)
        const matchDoctor = s.doctorName?.toLowerCase().includes(q)
        if (!matchName && !matchComplaint && !matchDiagnosis && !matchDoctor) return false
      }
      return true
    })
  }, [sessions, filters])

  // Financial summary
  const metrics = useMemo(() => {
    const totalCharged = sessions.reduce((acc, s) => acc + (s.amountCharged ?? 0), 0)
    const totalPaid = sessions.reduce((acc, s) => acc + (s.amountPaid ?? 0), 0)
    const totalOutstanding = Math.max(0, totalCharged - totalPaid)
    const activeCount = sessions.filter(s => s.status === 'active').length
    const completedCount = sessions.filter(s => s.status === 'completed').length

    return {
      totalCharged,
      totalPaid,
      totalOutstanding,
      activeCount,
      completedCount,
      count: total || sessions.length
    }
  }, [sessions, total])

  return {
    sessions: filteredSessions,
    total,
    loading,
    loadingMore,
    hasMore,
    filters,
    setFilters,
    metrics,
    updatingStatusId,
    loadMore,
    reload: () => loadSessions(0),
    updateSessionStatus,
    deleteSession
  }
}