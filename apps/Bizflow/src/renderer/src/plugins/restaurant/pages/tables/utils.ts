import { TableStatus } from './types'

export function formatOccupancyDuration(openedAt?: string): string {
  if (!openedAt) return ''
  const opened = new Date(openedAt).getTime()
  const now = Date.now()
  const diffMins = Math.max(0, Math.floor((now - opened) / 60000))

  if (diffMins < 60) return `${diffMins}m`
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}

export function getDurationColorClass(openedAt?: string): string {
  if (!openedAt) return 'text-slate-500'
  const diffMins = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000)
  if (diffMins > 90) return 'text-rose-600 dark:text-rose-400 font-semibold'
  if (diffMins > 45) return 'text-amber-600 dark:text-amber-400 font-medium'
  return 'text-emerald-600 dark:text-emerald-400'
}

export function getNextStatus(current: TableStatus): TableStatus {
  switch (current) {
    case 'available':
      return 'occupied'
    case 'occupied':
      return 'billing'
    case 'billing':
      return 'cleaning'
    case 'cleaning':
      return 'available'
    default:
      return 'available'
  }
}