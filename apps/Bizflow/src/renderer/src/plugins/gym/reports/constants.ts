import { ReportPeriod, SessionType } from './types'

export const REPORT_PERIOD_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' }
]

export const SESSION_TYPE_CONFIG: Record<
  SessionType,
  { label: string; badgeClass: string; dotClass: string }
> = {
  subscription: {
    label: 'Subscription',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    dotClass: 'bg-orange-500'
  },
  walkin: {
    label: 'Walk-In',
    badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    dotClass: 'bg-teal-500'
  },
  pt: {
    label: 'Personal Training',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    dotClass: 'bg-purple-500'
  },
  group: {
    label: 'Group Class',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dotClass: 'bg-blue-500'
  }
}