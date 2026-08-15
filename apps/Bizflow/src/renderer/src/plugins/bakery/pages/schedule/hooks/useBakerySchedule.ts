import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  ScheduleItem,
  Recipe,
  ScheduleStatus,
  DateRangeFilter,
  ScheduleFormData,
  ScheduleCounts,
} from '../types'
import {
  normalizeScheduleItem,
  getTodayStr,
  dateOffset,
  toDateStr,
  isOverdue,
} from '../utils'

export function useBakerySchedule() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [items, setItems] = useState<ScheduleItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Modals
  const [showFormModal, setShowFormModal] = useState(false)
  const [completeItem, setCompleteItem] = useState<ScheduleItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await window.api.bakery.getSchedule({ page: 1, pageSize: 5000 })
      const rows: any[] = Array.isArray(response?.data) ? [...response.data] : []

      const byId = new Map<string, any>()
      for (const r of rows) byId.set(String(r.id), r)

      const normalized = Array.from(byId.values()).map(normalizeScheduleItem)
      normalized.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
      setItems(normalized)
    } catch (err: any) {
      showToast('error', err?.message || t('bakeryScheduleLoadFailed')|| 'Failed to load schedule')
    }
  }, [showToast, t])

  const loadData = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true)
      else setLoading(true)

      await fetchSchedule()
      try {
        const recipeData = await window.api.bakery.getRecipes()
        setRecipes(Array.isArray(recipeData) ? recipeData : [])
      } catch (err) {
        console.error('Failed to load recipes', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [fetchSchedule]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered dataset
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const todayStr = dateOffset(0)
    const next7Str = dateOffset(7)

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()))

    const weekStartStr = toDateStr(weekStart)
    const weekEndStr = toDateStr(weekEnd)

    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false

      const dateStr = toDateStr(item.scheduledDate)
      if (dateRange === 'today' && dateStr !== todayStr) return false
      if (dateRange === 'week' && (dateStr < weekStartStr || dateStr > weekEndStr)) return false
      if (dateRange === 'next7' && (dateStr < todayStr || dateStr > next7Str)) return false
      if (dateRange === 'past' && dateStr > todayStr) return false
      if (dateRange === 'overdue' && !isOverdue(item, todayStr)) return false

      if (q) {
        const matchRecipe = item.recipe.name.toLowerCase().includes(q)
        const matchNotes = (item.notes ?? '').toLowerCase().includes(q)
        if (!matchRecipe && !matchNotes) return false
      }

      return true
    })
  }, [items, search, statusFilter, dateRange])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, dateRange])

  // Paginated and grouped items
  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize)
  }, [filtered, page, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  // Stats calculation
  const counts = useMemo<ScheduleCounts>(() => {
    const todayStr = getTodayStr()
    const stats: ScheduleCounts = {
      planned: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
      total: items.length,
    }

    items.forEach(item => {
      stats[item.status] = (stats[item.status] ?? 0) + 1
      if (isOverdue(item, todayStr)) stats.overdue++
    })

    return stats
  }, [items])

  // Actions
  const handleCreate = async (formData: ScheduleFormData) => {
    const created = await window.api.bakery.createScheduleItem({
      recipeId: formData.recipeId,
      scheduledDate: formData.scheduledDate,
      plannedQuantity: Number(formData.plannedQuantity),
      notes: formData.notes.trim() || undefined,
    })

    const normalizedCreated = normalizeScheduleItem(created as ScheduleItem)
    setItems(prev => [normalizedCreated, ...prev.filter(i => i.id !== normalizedCreated.id)])

    setSearch('')
    setStatusFilter('all')
    setDateRange('all')
    setPage(1)
    setShowFormModal(false)

    showToast('success', t('bakeryScheduleCreated')|| 'Schedule created successfully')
    fetchSchedule()
  }

  const handleUpdateStatus = async (id: string, status: ScheduleStatus, actualQuantity?: number) => {
    if (actioningId) return
    setActioningId(id)

    // Optimistic mutation
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status, ...(actualQuantity !== undefined && { actualQuantity }) }
          : item
      )
    )

    try {
      if (status === 'completed') {
        await window.api.bakery.completeScheduleAndCreateBatch({
          id,
          actualQuantity: actualQuantity ?? 1,
        })
        showToast('success', t('bakeryScheduleCompleted') || 'Production batch logged & completed!')
      } else {
        await window.api.bakery.updateScheduleItem({
          id,
          status,
          ...(actualQuantity !== undefined && { actualQuantity }),
        })
        showToast('success', t('bakeryScheduleUpdated') || 'Run status updated')
      }
      setCompleteItem(null)
      fetchSchedule()
    } catch (err: any) {
      await fetchSchedule() // Rollback on failure
      showToast('error', err?.message || t('bakeryScheduleSaveFailed') || 'Failed to update schedule')
    } finally {
      setActioningId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (actioningId) return
    setActioningId(id)

    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await window.api.bakery.deleteScheduleItem(id)
      showToast('success', t('bakeryScheduleDeleted') || 'Schedule entry deleted')
      setDeletingId(null)
      fetchSchedule()
    } catch (err: any) {
      await fetchSchedule()
      showToast('error', err?.message || t('bakeryScheduleDeleteFailed') || 'Failed to delete schedule')
    } finally {
      setActioningId(null)
    }
  }

  return {
    items: paginated,
    rawCount: items.length,
    filteredCount: filtered.length,
    recipes,
    loading,
    refreshing,
    actioningId,
    counts,
    // Filters & Pagination
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    // Modals
    showFormModal,
    setShowFormModal,
    completeItem,
    setCompleteItem,
    deletingId,
    setDeletingId,
    // Operations
    handleCreate,
    handleUpdateStatus,
    handleDelete,
    refresh: () => loadData(true),
  }
}