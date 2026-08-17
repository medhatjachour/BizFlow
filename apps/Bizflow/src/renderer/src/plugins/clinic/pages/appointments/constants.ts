export const APPOINTMENT_TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  follow_up:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  procedure:    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  checkup:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
}

export const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  no_show:   'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
}

export const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60]

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' }
]

export const DEFAULT_PAGE_SIZE = 50