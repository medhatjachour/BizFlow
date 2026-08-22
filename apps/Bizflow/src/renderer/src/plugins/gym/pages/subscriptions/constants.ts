import { SubscriptionFilter, SubscriptionStatus, PaymentMethod } from './types'

export const PAGE_SIZE = 25

export const SUBSCRIPTION_FILTERS: { key: SubscriptionFilter; labelKey: string; fallbackLabel: string }[] = [
  { key: 'all', labelKey: 'gymFilterAll', fallbackLabel: 'All Subscriptions' },
  { key: 'active', labelKey: 'gymFilterActive', fallbackLabel: 'Active' },
  { key: 'expiring', labelKey: 'gymFilterExpiring', fallbackLabel: 'Expiring ≤ 7d' },
  { key: 'frozen', labelKey: 'gymFilterFrozen', fallbackLabel: 'Frozen' },
  { key: 'expired', labelKey: 'gymFilterExpired', fallbackLabel: 'Expired' },
  { key: 'cancelled', labelKey: 'gymFilterCancelled', fallbackLabel: 'Cancelled' }
]

export const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; badgeCls: string; borderCls: string; dotCls: string }
> = {
  active: {
    label: 'Active',
    badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    borderCls: 'hover:border-emerald-300 dark:hover:border-emerald-800',
    dotCls: 'bg-emerald-500 ring-emerald-500/30'
  },
  frozen: {
    label: 'Frozen',
    badgeCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    borderCls: 'hover:border-blue-300 dark:hover:border-blue-800',
    dotCls: 'bg-blue-500 ring-blue-500/30'
  },
  expired: {
    label: 'Expired',
    badgeCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    borderCls: 'hover:border-rose-300 dark:hover:border-rose-800',
    dotCls: 'bg-rose-500 ring-rose-500/30'
  },
  cancelled: {
    label: 'Cancelled',
    badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
    borderCls: 'hover:border-slate-400 dark:hover:border-slate-700',
    dotCls: 'bg-slate-500 ring-slate-500/30'
  }
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card / POS', icon: '💳' },
  { value: 'transfer', label: 'Bank Transfer / App', icon: '📲' },
  { value: 'other', label: 'Other', icon: '📝' }
]