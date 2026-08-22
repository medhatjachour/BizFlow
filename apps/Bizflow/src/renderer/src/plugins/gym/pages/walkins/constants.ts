import { SessionPeriod, PaymentMethod } from './types'

export const PAGE_SIZE = 50
export const WALK_IN_PRESETS = [10, 20, 50, 100]

export const PERIOD_OPTIONS: { id: SessionPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' }
]

export const VISIT_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'All Visit Types' },
  { value: 'walkin', label: 'Paid Walk-Ins (Guest & Member)' },
  { value: 'subscription_visit', label: 'Active Plan Check-Ins' }
]

export const PAYMENT_METHODS: { value: PaymentMethod; labelKey: string; fallbackLabel: string; icon: string }[] = [
  { value: 'cash', labelKey: 'gymCash', fallbackLabel: 'Cash', icon: '💵' },
  { value: 'card', labelKey: 'gymCard', fallbackLabel: 'Card / POS', icon: '💳' },
  { value: 'transfer', labelKey: 'gymTransfer', fallbackLabel: 'Bank Transfer / App', icon: '📲' },
  { value: 'other', labelKey: 'gymOther', fallbackLabel: 'Other Method', icon: '📝' }
]

export const TYPE_BADGE_CONFIG: Record<
  string,
  { label: string; badgeCls: string; avatarCls: string }
> = {
  subscription: {
    label: 'Subscription Visit',
    badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    avatarCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-500/20'
  },
  member_walkin: {
    label: 'Member Walk-In',
    badgeCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    avatarCls: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500/20'
  },
  guest_walkin: {
    label: 'Guest Walk-In',
    badgeCls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
    avatarCls: 'bg-teal-500/15 text-teal-600 dark:text-teal-300 ring-2 ring-teal-500/20'
  }
}