import { GymSession } from './types'
import { TYPE_BADGE_CONFIG } from './constants'

export function getSessionCategory(session: GymSession): 'subscription' | 'member_walkin' | 'guest_walkin' {
  if (session.type === 'subscription_visit') return 'subscription'
  if (session.traineeId) return 'member_walkin'
  return 'guest_walkin'
}

export function getSessionBadge(session: GymSession) {
  const cat = getSessionCategory(session)
  return TYPE_BADGE_CONFIG[cat]
}

export function formatSessionDateTime(isoDate: string): { date: string; time: string } {
  if (!isoDate) return { date: '—', time: '—' }
  const d = new Date(isoDate)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }
}

export function formatAmount(amount?: number | null): string {
  if (amount == null || amount <= 0) return '—'
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}