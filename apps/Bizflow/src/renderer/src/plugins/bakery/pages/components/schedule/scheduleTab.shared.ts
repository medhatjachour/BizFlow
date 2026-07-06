// Constants and pure helpers for the bakery ScheduleTab.
import type { FC } from 'react'
import { PlayCircle, CheckCircle2, Circle, Ban } from 'lucide-react'
import type { Status, ScheduleItem } from './scheduleTab.types'

/** True when a run is past its scheduled date and still needs action */
export function isOverdue(item: { scheduledDate: string; status: string }, todayStr: string): boolean {
  return item.scheduledDate < todayStr && (item.status === 'planned' || item.status === 'in-progress')
}

export const STATUS_META: Record<Status, {
  chip: string; dot: string; icon: FC<{ className?: string }>; label: string
}> = {
  planned:       { chip: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',   dot: 'bg-blue-500',  icon: Circle,       label: 'Planned' },
  'in-progress': { chip: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800', dot: 'bg-amber-500', icon: PlayCircle,   label: 'In Progress' },
  completed:     { chip: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800', dot: 'bg-green-500', icon: CheckCircle2, label: 'Completed' },
  cancelled:     { chip: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600',  dot: 'bg-slate-400', icon: Ban,          label: 'Cancelled' }
}

export const FIELD_CLS   = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-colors'
export const LABEL_CLS   = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide'
export const PAGE_SIZES  = [10, 20, 50]

export function dateOffset(days: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return formatLocalDate(d)
}

/** Safely converts a Date object or ISO string to 'YYYY-MM-DD' */
export function toDateStr(v: Date | string | null | undefined): string {
  if (!v) return ''
  if (v instanceof Date) return formatLocalDate(v)

  const s = String(v)
  // If we already have a date-only string, keep it as-is to avoid TZ shifts.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) return formatLocalDate(parsed)

  return s.split('T')[0]
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Compute today as 'YYYY-MM-DD' in local timezone — call every time to stay current */
export function getTodayStr(): string {
  return formatLocalDate(new Date())
}

/**
 * Format a 'YYYY-MM-DD' string as a long date label WITHOUT any UTC shift.
 * new Date('2026-06-01') parses as UTC midnight and can render as May 31 in
 * negative-offset timezones. Using (y, m-1, d) creates a local-midnight Date.
 */
export function formatDateKey(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr
  const local = new Date(parts[0], parts[1] - 1, parts[2])
  return local.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

export function normalizeStatus(status: string): Status {
  if (status === 'in_progress') return 'in-progress'
  if (status === 'in-progress' || status === 'planned' || status === 'completed' || status === 'cancelled') return status
  return 'planned'
}

export function normalizeScheduleItem(i: ScheduleItem): ScheduleItem {
  return {
    ...i,
    status: normalizeStatus(String(i.status)),
    scheduledDate: toDateStr(i.scheduledDate),
    recipe: {
      ...i.recipe,
      yieldQty: Number(i.recipe?.yieldQty ?? 0),
      yieldUnit: i.recipe?.yieldUnit ?? 'pcs'
    }
  }
}

export const QTY_PRESETS = [1, 2, 5, 10, 25, 50]

/** Always reads the current date so the form default is never stale */
export function makeEmptyForm() {
  return { recipeId: '', scheduledDate: getTodayStr(), plannedQuantity: 1, notes: '' }
}
