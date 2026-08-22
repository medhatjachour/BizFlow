import { SalaryType, CoachFilter } from './types'

export const PAGE_SIZE = 12

export const SALARY_TYPES: { value: SalaryType; labelKey: string; fallbackLabel: string }[] = [
  { value: 'monthly', labelKey: 'gymSalaryMonthly', fallbackLabel: 'Monthly Base' },
  { value: 'hourly', labelKey: 'gymSalaryHourly', fallbackLabel: 'Hourly Rate' },
  { value: 'per_session', labelKey: 'gymSalaryPerSession', fallbackLabel: 'Per Client Session' }
]

export const COACH_FILTERS: { id: CoachFilter; label: string }[] = [
  { id: 'all', label: 'All Coaches' },
  { id: 'active', label: 'Active Staff' },
  { id: 'inactive', label: 'Inactive / On Leave' }
]

export const SUB_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  active: {
    label: 'Active',
    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
  },
  expired: {
    label: 'Expired',
    cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
  },
  frozen: {
    label: 'Frozen',
    cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
  }
}