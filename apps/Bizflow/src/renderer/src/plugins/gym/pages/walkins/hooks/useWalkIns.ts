import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { GymSession, SessionPeriod, SessionViewMode } from '../types'
import { PAGE_SIZE } from '../constants'

export function useWalkIns() {
  const toast = useToast()
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState<SessionPeriod>('today')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<SessionViewMode>('table')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)

  // Modals & Action Targets
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<GymSession | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadSessions = useCallback(
    async (pg = 0, isAppend = false) => {
      setLoading(true)
      try {
        const res = await (window.api as any).gym?.sessions?.getAll({
          period,
          type: typeFilter || undefined,
          skip: pg * PAGE_SIZE,
          take: PAGE_SIZE
        })
        const incoming: GymSession[] = Array.isArray(res) ? res : res?.data ?? []
        setSessions(prev => (isAppend ? [...prev, ...incoming] : incoming))
        setTotal(res?.total ?? incoming.length)
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    },
    [period, typeFilter, toast]
  )

  useEffect(() => {
    setPage(0)
    loadSessions(0, false)
  }, [period, typeFilter, loadSessions])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    loadSessions(next, true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await (window.api as any).gym?.sessions?.delete(deleteTarget.id)
      toast.success('Session entry removed')
      setDeleteTarget(null)
      loadSessions(0, false)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete session')
    } finally {
      setDeleting(false)
    }
  }

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter(
      s =>
        s.trainee?.name?.toLowerCase().includes(q) ||
        s.coach?.name?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q) ||
        s.paymentMethod?.toLowerCase().includes(q)
    )
  }, [sessions, searchQuery])

  const totalRevenue = useMemo(() => {
    return filteredSessions.reduce((acc, curr) => acc + (curr.amount ?? 0), 0)
  }, [filteredSessions])

  const hasMore = (page + 1) * PAGE_SIZE < total

  return {
    sessions: filteredSessions,
    total,
    period,
    setPeriod,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    totalRevenue,
    loading,
    hasMore,
    handleLoadMore,
    formOpen,
    setFormOpen,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    reload: () => loadSessions(0, false)
  }
}