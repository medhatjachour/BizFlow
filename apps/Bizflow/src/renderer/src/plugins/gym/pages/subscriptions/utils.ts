import { Subscription, SubscriptionProgress } from './types'

export function calculateSubscriptionProgress(sub: Subscription): SubscriptionProgress {
  const start = new Date(sub.startDate).getTime()
  const end = new Date(sub.endDate).getTime()
  const now = Date.now()

  const totalDays = Math.max(1, Math.ceil((end - start) / 86_400_000))
  const daysRemaining = Math.ceil((end - now) / 86_400_000)
  const elapsedDays = Math.max(0, totalDays - Math.max(0, daysRemaining))
  const percent = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100))

  const isExpired = sub.status === 'expired' || daysRemaining < 0
  const isExpiringSoon = sub.status === 'active' && daysRemaining >= 0 && daysRemaining <= 7

  let progressColorClass = 'bg-emerald-500'
  if (isExpired) {
    progressColorClass = 'bg-rose-500'
  } else if (isExpiringSoon) {
    progressColorClass = 'bg-amber-500'
  }

  return {
    totalDays,
    daysRemaining,
    elapsedDays,
    percent,
    isExpiringSoon,
    isExpired,
    progressColorClass
  }
}

export function formatDateLabel(isoDate: string): string {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function calculateEndDateFromPlan(startDate: string, durationDays = 30): string {
  if (!startDate) return ''
  const date = new Date(startDate + 'T00:00:00')
  date.setDate(date.getDate() + durationDays)
  return date.toISOString().slice(0, 10)
}