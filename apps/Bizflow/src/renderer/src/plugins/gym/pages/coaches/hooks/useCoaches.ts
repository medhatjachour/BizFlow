import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { Coach, CoachFilter, CoachViewMode } from '../types'
import { PAGE_SIZE } from '../constants'

export function useCoaches() {
  const toast = useToast()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<CoachFilter>('all')
  const [viewMode, setViewMode] = useState<CoachViewMode>('grid')

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Coach | null>(null)
  const [profileTarget, setProfileTarget] = useState<Coach | null>(null)

  const loadCoaches = useCallback(async (pg = page, q = search) => {
    setLoading(true)
    try {
      const res = await (window.api as any).gym?.coaches?.getAll({
        search: q,
        skip: pg * PAGE_SIZE,
        take: PAGE_SIZE
      })
      setCoaches(Array.isArray(res) ? res : res?.data ?? [])
      setTotal(res?.total ?? 0)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load coaches')
    } finally {
      setLoading(false)
    }
  }, [page, search, toast])

  useEffect(() => {
    loadCoaches(page, search)
  }, [page, search, loadCoaches])

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

  const handleSaved = (savedCoach: Coach) => {
    if (editTarget) {
      setCoaches(prev => prev.map(c => (c.id === savedCoach.id ? savedCoach : c)))
      if (profileTarget?.id === savedCoach.id) {
        setProfileTarget(savedCoach)
      }
    } else {
      loadCoaches(0, search)
    }
  }

  const filteredCoaches = useMemo(() => {
    if (filter === 'all') return coaches
    if (filter === 'active') return coaches.filter(c => c.isActive)
    return coaches.filter(c => !c.isActive)
  }, [coaches, filter])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    coaches: filteredCoaches,
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
    formOpen,
    setFormOpen,
    editTarget,
    setEditTarget,
    profileTarget,
    setProfileTarget,
    handleSaved,
    reload: () => loadCoaches(page, search)
  }
}