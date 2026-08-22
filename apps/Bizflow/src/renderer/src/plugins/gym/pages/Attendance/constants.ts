import { PaymentMethod, SubscriptionStatus } from './types'

export const DEFAULT_FEE_PRESETS = [10, 20, 50, 100]
export const DEFAULT_ANON_PRESETS = [10, 20, 50, 100]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'transfer', label: 'Transfer', icon: '📲' }
]

export const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { labelKey: string; fallbackLabel: string; badgeCls: string; borderCls: string; avatarCls: string }
> = {
  active: {
    labelKey: 'gymActiveSub',
    fallbackLabel: 'Active Plan',
    badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    borderCls: 'border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-400',
    avatarCls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
  },
  expiring: {
    labelKey: 'gymExpiringSoon',
    fallbackLabel: 'Expiring Soon',
    badgeCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    borderCls: 'border-amber-200/60 dark:border-amber-800/40 hover:border-amber-400',
    avatarCls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
  },
  none: {
    labelKey: 'gymNoSubscription',
    fallbackLabel: 'No Active Plan',
    badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
    borderCls: 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700',
    avatarCls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
  }
}