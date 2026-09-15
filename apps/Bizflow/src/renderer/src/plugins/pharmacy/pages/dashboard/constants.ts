import { DashboardPeriod } from './types'

export const DASHBOARD_PERIODS: { labelKey: string; value: DashboardPeriod }[] = [
  { labelKey: 'salesUiToday', value: 'today' },
  { labelKey: 'salesUiThisWeek', value: 'week' },
  { labelKey: 'salesUiThisMonth', value: 'month' },
  { labelKey: 'financeThisYear', value: 'year' },
]