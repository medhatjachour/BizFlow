/**
 * ScheduleTab – Plan and track daily production runs
 * Enhanced with search, status/date filters, pagination, skeleton loading,
 * stats bar, completion-quantity modal, and polished card design.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Calendar, Plus, CheckCircle, PlayCircle, XCircle, Trash2,
  Clock, ChefHat, Hash, FileText, AlertTriangle, Search,
  Loader2, SlidersHorizontal, X, RefreshCw, TrendingUp,
  CheckCircle2, AlertCircle
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Pagination from './Pagination'

import type { Recipe, ScheduleItem, Status, DateRange } from './scheduleTab.types'
import {
  isOverdue, STATUS_META, FIELD_CLS, LABEL_CLS, PAGE_SIZES,
  dateOffset, toDateStr, getTodayStr, formatDateKey,
  normalizeScheduleItem, QTY_PRESETS, makeEmptyForm
} from './scheduleTab.shared'
import CompleteModal from './CompleteModal'

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="px-4 py-4 flex items-start gap-4 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-64 rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="flex gap-1">
        {[0,1,2].map(i => <div key={i} className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700" />)}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduleTab() {
  const { t } = useLanguage()

  // DATE_CHIPS use the same live today so they're never stale
  const DATE_CHIPS = useMemo(() => [
    { label: 'Today',    value: dateOffset(0) },
    { label: 'Tomorrow', value: dateOffset(1) },
    { label: 'In 2 days',value: dateOffset(2) },
    { label: 'Next week',value: dateOffset(7) }
  ], [])

  // Data
  const [items,   setItems]   = useState<ScheduleItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  // Per-row action guard — holds the ID of the item being actioned right now
  const [actioningId, setActioningId] = useState<string | null>(null)

  // Filters & pagination
  const [search,      setSearch]      = useState('')
  const [statusFilter,setStatusFilter]= useState<Status | 'all'>('all')
  const [dateRange,   setDateRange]   = useState<DateRange>('all')
  const [page,        setPage]        = useState(1)
  const [pageSize,    setPageSize]    = useState(20)

  // Add-schedule form
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(() => makeEmptyForm())
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  // Completion modal
  const [completeItem, setCompleteItem] = useState<ScheduleItem | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  /** Fetch ALL schedule items in one shot (backend cap now 5 000). */
  const fetchSchedule = useCallback(async () => {
    try {
      const BIG_PAGE = 5000
      const first = await window.api.bakery.getSchedule({ page: 1, pageSize: BIG_PAGE })
      const rows: any[] = Array.isArray(first?.data) ? [...first.data] : []

      // Pull additional pages only if the dataset truly exceeds 5 000 (very unlikely).
      const extraPages = Math.min(Number(first?.totalPages ?? 1), 10)
      for (let p = 2; p <= extraPages; p++) {
        const next = await window.api.bakery.getSchedule({ page: p, pageSize: BIG_PAGE })
        if (Array.isArray(next?.data)) rows.push(...next.data)
      }

      // De-duplicate by id (defensive).
      const byId = new Map<string, any>()
      for (const r of rows) byId.set(String(r.id), r)

      const normalised = Array.from(byId.values()).map(normalizeScheduleItem)
      // Newest scheduled date first — simple string compare works for ISO dates.
      normalised.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
      setItems(normalised)
    } catch (err) {
      console.error('[ScheduleTab] getSchedule failed', err)
      setError(t('bakeryScheduleLoadFailed'))
    }
  }, [t])

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else        setLoading(true)
    setError('')
    // Fetch schedule and recipes independently so one failure doesn't block the other
    await fetchSchedule()
    try {
      const recipeData = await window.api.bakery.getRecipes()
      setRecipes(Array.isArray(recipeData) ? recipeData : (recipeData ?? []))
    } catch (err) {
      console.error('[ScheduleTab] getRecipes failed', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchSchedule, t])

  useEffect(() => { load() }, [load])

  // Auto-dismiss success banner after 4 seconds
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 4000)
    return () => clearTimeout(t)
  }, [success])



  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()

    // Date range bounds
    const todayStr     = dateOffset(0)
    const next7Str     = dateOffset(7)
    const weekStart    = (() => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - d.getDay())
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    })()
    const weekEnd      = (() => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() + (6 - d.getDay()))
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    })()

    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      const dateStr = toDateStr(item.scheduledDate)
      if (dateRange === 'today'   && dateStr !== todayStr)                                          return false
      if (dateRange === 'week'    && (dateStr < weekStart || dateStr > weekEnd))                    return false
      if (dateRange === 'next7'   && (dateStr < todayStr  || dateStr > next7Str))                   return false
      if (dateRange === 'past'    && dateStr > todayStr)                                            return false
      if (dateRange === 'overdue' && !isOverdue(item, todayStr))                                    return false
      if (q && !item.recipe.name.toLowerCase().includes(q) && !(item.notes?.toLowerCase().includes(q))) return false
      return true
    })
  }, [items, search, statusFilter, dateRange])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, statusFilter, dateRange])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Group visible page into dates
  const grouped = useMemo(() => {
    return paginated.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
      // Use formatDateKey to build key from local-midnight Date (avoids UTC shift)
      const key = formatDateKey(item.scheduledDate)
      ;(acc[key] = acc[key] || []).push(item)
      return acc
    }, {})
  }, [paginated])

  // Stats
  const counts = useMemo(() => {
    const todayStr = getTodayStr()
    const c = { planned: 0, 'in-progress': 0, completed: 0, cancelled: 0, overdue: 0, total: items.length }
    items.forEach(i => {
      c[i.status] = (c[i.status] ?? 0) + 1
      if (isOverdue(i, todayStr)) c.overdue++
    })
    return c
  }, [items])

  // ── Actions ───────────────────────────────────────────────────────────────

  const openForm  = () => { setForm(makeEmptyForm()); setFormError(''); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setFormError('') }

  const save = async () => {
    if (!form.recipeId)                    { setFormError('Please select a recipe'); return }
    if (!form.scheduledDate)               { setFormError('Please pick a date'); return }
    if (Number(form.plannedQuantity) < 1)  { setFormError('Quantity must be at least 1'); return }
    setFormError(''); setSaving(true)
    try {
      setSuccess('')
      const created = await window.api.bakery.createScheduleItem({
        recipeId: form.recipeId,
        scheduledDate: form.scheduledDate,
        plannedQuantity: Number(form.plannedQuantity),
        notes: form.notes || undefined
      })
      // Optimistically prepend so the new row is visible immediately.
      const normalizedCreated = normalizeScheduleItem(created as ScheduleItem)
      setItems(prev => [normalizedCreated, ...prev.filter(i => i.id !== normalizedCreated.id)])

      // Reset filters/paging so users always see newly created rows.
      setSearch('')
      setStatusFilter('all')
      setDateRange('all')
      setPage(1)

      closeForm()
      setSuccess('Schedule created successfully')
      // Background re-fetch to ensure server-state consistency.
      setRefreshing(true)
      await fetchSchedule()
    } catch (err: any) {
      console.error('[ScheduleTab] createScheduleItem failed', err)
      setFormError(err?.message ?? t('bakeryScheduleSaveFailed'))
    } finally {
      setSaving(false)
      setRefreshing(false)
    }
  }

  const updateStatus = async (id: string, status: Status, actualQuantity?: number) => {
    if (actioningId) return  // prevent double-action
    setActioningId(id)
    setError('')
    // Optimistic update — show the new status immediately without waiting for server
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, status, ...(actualQuantity !== undefined && { actualQuantity }) } : i
    ))
    try {
      if (status === 'completed') {
        await window.api.bakery.completeScheduleAndCreateBatch({ id, actualQuantity: actualQuantity ?? 1 })
      } else {
        await window.api.bakery.updateScheduleItem({ id, status, ...(actualQuantity !== undefined && { actualQuantity }) })
      }
      setCompleteItem(null)
      setSuccess(status === 'completed' ? 'Schedule completed and added to Production' : 'Schedule updated')
      // Re-fetch in background to sync any server-side changes (stock deduction, etc.)
      await fetchSchedule()
    } catch (err: any) {
      console.error('[ScheduleTab] updateStatus failed', err)
      // Roll back optimistic update on failure
      await fetchSchedule()
      setError(err?.message ?? t('bakeryScheduleSaveFailed'))
    } finally {
      setActioningId(null)
    }
  }

  const remove = async (id: string) => {
    if (actioningId) return
    if (!confirm(t('bakeryDeleteScheduleConfirm'))) return
    setActioningId(id)
    setError('')
    // Optimistic remove
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await window.api.bakery.deleteScheduleItem(id)
      setSuccess('Schedule deleted')
    } catch (err: any) {
      console.error('[ScheduleTab] deleteScheduleItem failed', err)
      // Roll back by refetching
      await fetchSchedule()
      setError(err?.message ?? t('bakeryScheduleLoadFailed'))
    } finally {
      setActioningId(null)
    }
  }

  const selectedRecipe = recipes.find(r => r.id === form.recipeId)
  const hasFilters     = search || statusFilter !== 'all' || dateRange !== 'all'

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-2">

      {/* ── Global error ─────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess('')} className="p-0.5 rounded hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('bakeryScheduleTab')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('bakeryScheduleSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openForm}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t('bakeryAddSchedule')}
          </button>
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(['planned', 'in-progress', 'completed', 'cancelled'] as Status[]).map(s => {
            const meta = STATUS_META[s]
            const IconComp = meta.icon
            const active = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(active ? 'all' : s)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }`}
              >
                <span className={`p-1.5 rounded-lg ${active ? 'bg-white/20' : `${meta.chip.split(' ').slice(0,2).join(' ')}`}`}>
                  <IconComp className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className={`text-xs font-medium leading-none mb-0.5 ${active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {meta.label}
                  </p>
                  <p className={`text-base font-bold leading-none ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {counts[s]}
                  </p>
                </div>
              </button>
            )
          })}
          {/* Overdue card — only shown when there are overdue items */}
          {counts.overdue > 0 && (
            <button
              onClick={() => setDateRange(dateRange === 'overdue' ? 'all' : 'overdue')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                dateRange === 'overdue'
                  ? 'bg-red-600 border-red-600 text-white shadow-sm'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
              }`}
            >
              <span className={`p-1.5 rounded-lg ${dateRange === 'overdue' ? 'bg-white/20' : 'bg-red-100 dark:bg-red-900/40'}`}>
                <AlertCircle className={`h-3.5 w-3.5 ${dateRange === 'overdue' ? 'text-white' : 'text-red-600 dark:text-red-400'}`} />
              </span>
              <div>
                <p className={`text-xs font-medium leading-none mb-0.5 ${dateRange === 'overdue' ? 'text-white/80' : 'text-red-600 dark:text-red-400'}`}>
                  Overdue
                </p>
                <p className={`text-base font-bold leading-none ${dateRange === 'overdue' ? 'text-white' : 'text-red-700 dark:text-red-300'}`}>
                  {counts.overdue}
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ── Search & filter bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by recipe or notes…"
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
          {([
            { key: 'all',     label: 'All dates' },
            { key: 'today',   label: 'Today' },
            { key: 'week',    label: 'This week' },
            { key: 'next7',   label: 'Next 7 days' },
            { key: 'past',    label: 'Past' },
            { key: 'overdue', label: '⚠ Overdue' }
          ] as { key: DateRange; label: string }[]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setDateRange(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                dateRange === opt.key
                  ? opt.key === 'overdue' ? 'bg-red-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm'
                  : opt.key === 'overdue' && counts.overdue > 0
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}{opt.key === 'overdue' && counts.overdue > 0 ? ` (${counts.overdue})` : ''}
            </button>
          ))}
        </div>

        {/* Status tabs (explicit All + status filters) */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 overflow-x-auto">
          {([
            { key: 'all', label: 'All' },
            { key: 'planned', label: 'Planned' },
            { key: 'in-progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ] as { key: Status | 'all'; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setDateRange('all') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Results count line */}
      {!loading && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {filtered.length === items.length
            ? `${items.length} run${items.length !== 1 ? 's' : ''} total`
            : `${filtered.length} of ${items.length} runs`}
        </p>
      )}

      {/* ── Schedule list ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {/* Loading skeleton */}
          <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading schedule…</span>
          </div>
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
              {[0, 1].map(j => <SkeletonRow key={j} />)}
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700/50 mb-4">
            <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          {hasFilters ? (
            <>
              <p className="text-slate-600 dark:text-slate-300 font-semibold">No runs match your filters</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Try adjusting search or date range</p>
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); setDateRange('all') }}
                className="mt-4 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-300 font-semibold">{t('bakeryNoSchedule')}</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{t('bakeryNoScheduleDesc')}</p>
              <button
                onClick={openForm}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" /> Schedule first run
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {Object.entries(grouped).map(([date, dayItems]) => {
              const todayStr      = getTodayStr()
              const dayCompleted  = dayItems.filter(i => i.status === 'completed').length
              const dayInProgress = dayItems.filter(i => i.status === 'in-progress').length
              const dayOverdue    = dayItems.filter(i => isOverdue(i, todayStr)).length
              const isToday       = dayItems.some(i => i.scheduledDate === todayStr)

              return (
                <div key={date} className={`rounded-xl bg-white dark:bg-slate-800 border overflow-hidden shadow-sm ${
                  dayOverdue > 0 ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'
                }`}>
                  {/* Date group header */}
                  <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                    dayOverdue > 0
                      ? 'bg-gradient-to-r from-red-50 to-red-50/40 dark:from-red-900/20 dark:to-red-900/10 border-red-200 dark:border-red-800'
                      : 'bg-gradient-to-r from-slate-50 to-slate-50/60 dark:from-slate-800/90 dark:to-slate-800/50 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <Calendar className={`h-4 w-4 ${
                        dayOverdue > 0 ? 'text-red-500' : isToday ? 'text-indigo-500' : 'text-slate-400'
                      }`} />
                      <span className={`text-sm font-semibold ${
                        dayOverdue > 0 ? 'text-red-700 dark:text-red-400' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {date}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wide">Today</span>
                      )}
                      {dayOverdue > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase tracking-wide">
                          <AlertCircle className="h-3 w-3" /> {dayOverdue} overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {dayInProgress > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {dayInProgress} active
                        </span>
                      )}
                      {dayCompleted > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3" /> {dayCompleted} done
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{dayItems.length} run{dayItems.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Schedule items */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {dayItems.map(item => {
                      const todayStr  = getTodayStr()
                      const overdue   = isOverdue(item, todayStr)
                      const meta      = STATUS_META[item.status]
                      const IconComp  = meta.icon
                      const totalYield= item.recipe.yieldQty > 0
                        ? item.plannedQuantity * item.recipe.yieldQty
                        : null
                      const pct       = item.actualQuantity !== null && item.plannedQuantity > 0
                        ? Math.round((item.actualQuantity / item.plannedQuantity) * 100)
                        : null

                      return (
                        <div
                          key={item.id}
                          className={`group px-4 py-3.5 flex items-start gap-4 transition-colors ${
                            overdue
                              ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'
                          }`}
                        >
                          {/* Status icon column — shows AlertCircle for overdue items */}
                          <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                            overdue
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                              : meta.chip.split(' ').slice(0,4).join(' ')
                          }`}>
                            {overdue ? <AlertCircle className="h-3.5 w-3.5" /> : <IconComp className="h-3.5 w-3.5" />}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            {/* Top row: recipe name + status chip + overdue badge */}
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <p className="font-semibold text-slate-900 dark:text-white leading-snug">{item.recipe.name}</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.chip}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                              {overdue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white">
                                  <AlertCircle className="h-3 w-3" /> Overdue
                                </span>
                              )}
                            </div>

                            {/* Metrics row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span>Planned: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.plannedQuantity}</span></span>
                              </span>
                              {item.actualQuantity !== null && (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>Actual: <span className={`font-semibold ${item.actualQuantity >= item.plannedQuantity ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{item.actualQuantity}</span></span>
                                </span>
                              )}
                              {totalYield !== null && (
                                <span className="flex items-center gap-1">
                                  <ChefHat className="h-3 w-3" />
                                  <span>Yield: ~{totalYield.toLocaleString()} {item.recipe.yieldUnit}</span>
                                </span>
                              )}
                              {item.notes && (
                                <span className="flex items-center gap-1 italic text-slate-400">
                                  <FileText className="h-3 w-3" /> {item.notes}
                                </span>
                              )}
                            </div>

                            {/* Completion progress bar */}
                            {pct !== null && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-9 text-right">{pct}%</span>
                              </div>
                            )}
                          </div>

                          {/* Actions (visible on hover for completed/cancelled, always visible for active) */}
                          {(() => {
                            const isActioning = actioningId === item.id
                            return (
                              <div className={`flex items-center gap-1 shrink-0 transition-opacity ${
                                item.status === 'completed' || item.status === 'cancelled'
                                  ? 'opacity-0 group-hover:opacity-100'
                                  : 'opacity-100'
                              }`}>
                                {isActioning ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                ) : (
                                  <>
                                    {item.status === 'planned' && (
                                      <button
                                        onClick={() => updateStatus(item.id, 'in-progress')}
                                        disabled={!!actioningId}
                                        title={t('bakeryMarkInProgress')}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-200 dark:border-amber-800 transition-colors disabled:opacity-40"
                                      >
                                        <PlayCircle className="h-3.5 w-3.5" /> Start
                                      </button>
                                    )}
                                    {item.status === 'in-progress' && (
                                      <button
                                        onClick={() => setCompleteItem(item)}
                                        disabled={!!actioningId}
                                        title={t('bakeryMarkComplete')}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800 transition-colors disabled:opacity-40"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5" /> Complete
                                      </button>
                                    )}
                                    {item.status !== 'cancelled' && item.status !== 'completed' && (
                                      <button
                                        onClick={() => updateStatus(item.id, 'cancelled')}
                                        disabled={!!actioningId}
                                        title={t('bakeryStatusCancelled')}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => remove(item.id)}
                                      disabled={!!actioningId}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Pagination ───────────────────────────────────────────────── */}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            onPage={setPage}
            pageSize={pageSize}
            pageSizes={PAGE_SIZES}
            onPageSize={ps => { setPageSize(ps); setPage(1) }}
            className="pt-2"
          />
        </>
      )}

      {/* ── Add-Schedule Modal ────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('bakeryAddSchedule')}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Schedule a production run</p>
                </div>
              </div>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Recipe */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><ChefHat className="h-3.5 w-3.5" /> {t('bakeryRecipeName')} <span className="text-red-500">*</span></span>
                </label>
                <select
                  className={FIELD_CLS}
                  value={form.recipeId}
                  onChange={e => setForm(f => ({ ...f, recipeId: e.target.value }))}
                >
                  <option value="">— Select a recipe —</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {selectedRecipe && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                    <ChefHat className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{selectedRecipe.name}</span>
                    {selectedRecipe.yieldQty && (
                      <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-auto">
                        Yields {selectedRecipe.yieldQty} {selectedRecipe.yieldUnit ?? 'pcs'} per batch
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {t('bakeryScheduledDate')} <span className="text-red-500">*</span></span>
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {DATE_CHIPS.map(chip => (
                    <button
                      key={chip.value} type="button"
                      onClick={() => setForm(f => ({ ...f, scheduledDate: chip.value }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                        form.scheduledDate === chip.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >{chip.label}</button>
                  ))}
                </div>
                <input
                  type="date"
                  className={FIELD_CLS}
                  value={form.scheduledDate}
                  onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> {t('bakeryPlannedQty')} <span className="text-red-500">*</span></span>
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {QTY_PRESETS.map(q => (
                    <button
                      key={q} type="button"
                      onClick={() => setForm(f => ({ ...f, plannedQuantity: q }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                        form.plannedQuantity === q
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                      }`}
                    >{q}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, plannedQuantity: Math.max(1, f.plannedQuantity - 1) }))}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg leading-none font-bold">−</button>
                  <input type="number" min="1" className={`${FIELD_CLS} text-center font-semibold text-base`}
                    value={form.plannedQuantity}
                    onChange={e => setForm(f => ({ ...f, plannedQuantity: Math.max(1, Number(e.target.value)) }))} />
                  <button type="button" onClick={() => setForm(f => ({ ...f, plannedQuantity: f.plannedQuantity + 1 }))}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg leading-none font-bold">+</button>
                </div>
                {selectedRecipe?.yieldQty && form.plannedQuantity > 0 && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    Total yield: <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {(form.plannedQuantity * selectedRecipe.yieldQty).toLocaleString()} {selectedRecipe.yieldUnit ?? 'pcs'}
                    </span>
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={LABEL_CLS}>
                  <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {t('bakeryNotesLabel')} <span className="normal-case font-normal text-slate-400">(optional)</span></span>
                </label>
                <textarea rows={3} className={`${FIELD_CLS} resize-none`}
                  placeholder="Any special instructions, priorities, or reminders..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
              {formError && (
                <div className="flex items-center gap-2 mx-6 mt-4 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {formError}
                </div>
              )}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="text-xs text-slate-400">
                  {form.scheduledDate && new Date(form.scheduledDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                <div className="flex gap-2">
                  <button onClick={closeForm}
                    className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors">
                    {t('bakeryCancelBtn')}
                  </button>
                  <button onClick={save} disabled={saving || !form.recipeId}
                    className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 transition-colors shadow-sm">
                    {saving
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scheduling…</>
                      : <><Calendar className="h-3.5 w-3.5" /> Schedule Run</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Completion modal ──────────────────────────────────────────────── */}
      {completeItem && (
        <CompleteModal
          item={completeItem}
          onConfirm={qty => updateStatus(completeItem.id, 'completed', qty)}
          onCancel={() => setCompleteItem(null)}
        />
      )}
    </div>
  )
}
