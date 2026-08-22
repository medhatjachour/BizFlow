import { Trainee, SubscriptionStatus } from './types'

export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatLongDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function offsetDate(dateStr: string, deltaDays: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

export function buildCalendarMatrix(year: number, month: number): (string | null)[][] {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const startPadding = (firstDow + 6) % 7 // Monday = 0
  const flatDays: (string | null)[] = Array(startPadding).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    flatDays.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  const weeks: (string | null)[][] = []
  for (let i = 0; i < flatDays.length; i += 7) {
    weeks.push(flatDays.slice(i, i + 7).concat(Array(7).fill(null)).slice(0, 7))
  }
  return weeks
}

export function getSubscriptionStatus(trainee: Trainee): SubscriptionStatus {
  const activeSub = trainee.subscriptions?.[0]
  if (!activeSub?.endDate) return 'none'

  const daysRemaining = Math.ceil(
    (new Date(activeSub.endDate).getTime() - Date.now()) / 86_400_000
  )
  if (daysRemaining < 0) return 'none'
  return daysRemaining <= 7 ? 'expiring' : 'active'
}

export function getRemainingDays(trainee: Trainee): number | null {
  const sub = trainee.subscriptions?.[0]
  if (!sub?.endDate) return null
  return Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000)
}