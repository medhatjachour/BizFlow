import { ScheduleItem, ScheduleStatus } from './types'

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getTodayStr(): string {
  return formatLocalDate(new Date())
}

export function dateOffset(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return formatLocalDate(d)
}

/** Safely converts a Date or ISO string to YYYY-MM-DD avoiding timezone shifts */
export function toDateStr(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (value instanceof Date) return formatLocalDate(value)

  const s = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) return formatLocalDate(parsed)

  return s.split('T')[0]
}

/** Formats a YYYY-MM-DD string into a formatted local string */
export function formatDateKey(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr
  const local = new Date(parts[0], parts[1] - 1, parts[2])
  return local.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function normalizeStatus(status: string): ScheduleStatus {
  if (status === 'in_progress') return 'in-progress'
  if (status === 'in-progress' || status === 'planned' || status === 'completed' || status === 'cancelled') {
    return status
  }
  return 'planned'
}

export function normalizeScheduleItem(item: any): ScheduleItem {
  return {
    ...item,
    status: normalizeStatus(String(item.status)),
    scheduledDate: toDateStr(item.scheduledDate),
    recipe: {
      id: item.recipe?.id ?? '',
      name: item.recipe?.name ?? 'Unknown Recipe',
      yieldQty: Number(item.recipe?.yieldQty ?? 0),
      yieldUnit: item.recipe?.yieldUnit ?? 'pcs',
    },
  }
}

export function isOverdue(item: { scheduledDate: string; status: string }, todayStr: string): boolean {
  return item.scheduledDate < todayStr && (item.status === 'planned' || item.status === 'in-progress')
}