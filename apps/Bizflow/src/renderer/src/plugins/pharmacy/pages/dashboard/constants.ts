import { DashboardPeriod } from './types'

export const DASHBOARD_PERIODS: { label: string; value: DashboardPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
]