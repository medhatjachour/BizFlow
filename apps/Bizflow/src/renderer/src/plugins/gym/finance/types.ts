export type Period = 'today' | 'week' | 'month' | 'year'

export type ExpenseCategory =
  | 'rent'
  | 'equipment'
  | 'salaries'
  | 'utilities'
  | 'marketing'
  | 'maintenance'
  | 'supplies'
  | 'other'

export interface ExpenseCategoryBreakdown {
  category: ExpenseCategory | string
  total: number
  count?: number
}

export interface GymStatsOverview {
  revenue: number
  subRevenue: number
  walkRevenue: number
  totalExpenses: number
  netIncome: number
  activeSubscriptions?: number
  walkInCount?: number
}

export interface GymExpenseSummary {
  totalExpenses: number
  byCategory: ExpenseCategoryBreakdown[]
}

export interface KpiCardProps {
  label: string
  value: number
  trend?: number
  colorTheme: 'amber' | 'emerald' | 'rose' | 'teal' | 'indigo'
  prefix?: string
}