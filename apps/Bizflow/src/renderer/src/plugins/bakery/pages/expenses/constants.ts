import { CategoryMeta, DateRangeKey, PaymentMethodKey, RecurrenceKey } from './types'

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  {
    value: 'ingredients',
    label: 'Ingredients',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
    barColor: '#f59e0b',
  },
  {
    value: 'equipment',
    label: 'Equipment',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
    barColor: '#3b82f6',
  },
  {
    value: 'packaging',
    label: 'Packaging',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800/40',
    barColor: '#8b5cf6',
  },
  {
    value: 'rent',
    label: 'Rent',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
    barColor: '#f43f5e',
  },
  {
    value: 'utilities',
    label: 'Utilities',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/40',
    barColor: '#eab308',
  },
  {
    value: 'marketing',
    label: 'Marketing',
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800/40',
    barColor: '#ec4899',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/40',
    barColor: '#f97316',
  },
  {
    value: 'salaries',
    label: 'Salaries',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
    barColor: '#10b981',
  },
  {
    value: 'other',
    label: 'Other',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    barColor: '#94a3b8',
  },
]

export const PAYMENT_METHODS: { value: PaymentMethodKey; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
]

export const RECURRENCE_OPTIONS: { value: RecurrenceKey; label: string }[] = [
  { value: 'one_time', label: 'One Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: '90days', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]