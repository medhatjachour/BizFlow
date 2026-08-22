import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Trainee, TraineeFilter, ViewMode } from '../types'
import { PAGE_SIZE } from '../constants'
import { getTraineeSubBadge } from '../utils'

export function useTrainees() {
  const toast = useToast()
  const [trainees, setTrainees] = useState<Trainee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<TraineeFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Trainee | null>(null)
  const [profileTarget, setProfileTarget] = useState<Trainee | null>(null)

  const loadTrainees = useCallback(async (pg = page, q = search) => {
    setLoading(true)
    try {
      const res = await (window.api as any).gym?.trainees?.getAll({
        search: q,
        skip: pg * PAGE_SIZE,
        take: PAGE_SIZE
      })
      setTrainees(Array.isArray(res) ? res : res?.data ?? [])
      setTotal(res?.total ?? 0)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load trainees')
    } finally {
      setLoading(false)
    }
  }, [page, search, toast])

  useEffect(() => {
    loadTrainees(page, search)
  }, [page, search, loadTrainees])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setSearch(searchInput)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setSearch('')
    setPage(0)
  }

  const handleTraineeSaved = (saved: Trainee) => {
    if (editTarget) {
      setTrainees(prev => prev.map(t => (t.id === saved.id ? saved : t)))
      if (profileTarget?.id === saved.id) {
        setProfileTarget(saved)
      }
    } else {
      loadTrainees(0, search)
    }
  }

  // Client-side quick filter logic (for current dataset/active tab)
  const filteredTrainees = useMemo(() => {
    if (filter === 'all') return trainees
    return trainees.filter(t => {
      const badge = getTraineeSubBadge(t)
      if (filter === 'active') return badge.label.includes('left') && !badge.label.includes('⚠️')
      if (filter === 'expiring') return badge.label.includes('⚠️')
      if (filter === 'expired') return badge.label.includes('Expired') || badge.label.includes('Frozen')
      if (filter === 'no_sub') return badge.label === 'No Plan'
      return true
    })
  }, [trainees, filter])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    trainees: filteredTrainees,
    total,
    page,
    setPage,
    totalPages,
    search,
    searchInput,
    setSearchInput,
    handleSearchSubmit,
    handleClearSearch,
    loading,
    filter,
    setFilter,
    viewMode,
    setViewMode,
    // Modals
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    profileTarget,
    setProfileTarget,
    handleTraineeSaved,
    reload: () => loadTrainees(page, search)
  }
}