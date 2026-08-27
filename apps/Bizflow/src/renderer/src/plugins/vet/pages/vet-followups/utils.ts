import { FollowUpUrgency } from './types'

export function getDaysDiff(dateStr: string): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getUrgencyCategory(diff: number): FollowUpUrgency {
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff > 1 && diff <= 7) return 'this_week'
  return 'upcoming'
}

export function formatFollowUpDate(iso: string | undefined | null, locale = 'en'): { day: string; month: string; year: string; full: string } {
  if (!iso) return { day: '—', month: '—', year: '—', full: '—' }
  const d = new Date(iso)
  const isAr = locale === 'ar'

  return {
    day: d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric' }),
    month: d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short' }),
    year: String(d.getFullYear()),
    full: d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}