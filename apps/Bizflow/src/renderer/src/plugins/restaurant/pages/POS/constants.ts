import { CourseType, ItemStatus } from './types'

export const COURSE_OPTIONS: Array<{ value: CourseType; label: string; badgeColor: string }> = [
  { value: 'beverage', label: 'Beverages', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-400' },
  { value: 'starter', label: 'Starters', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' },
  { value: 'main', label: 'Mains', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' },
  { value: 'dessert', label: 'Desserts', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400' }
]

export const ITEM_STATUS_STYLES: Record<ItemStatus, { label: string; badge: string; dot: string }> = {
  pending: { label: 'Hold / Pending', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  preparing: { label: 'In Kitchen', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500 animate-pulse' },
  ready: { label: 'Ready to Serve', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  served: { label: 'Served', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  voided: { label: 'Voided', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300', dot: 'bg-rose-500' }
}

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'CreditCard' },
  { id: 'apple_pay', label: 'Apple / Google Pay', icon: 'Smartphone' },
  { id: 'voucher', label: 'Gift Voucher', icon: 'Gift' }
]

export const TIP_PRESETS = [0, 0.1, 0.15, 0.2]