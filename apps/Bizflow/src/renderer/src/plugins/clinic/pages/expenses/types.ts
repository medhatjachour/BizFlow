export type PeriodFilter = 'today' | 'week' | 'month' | 'year'

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'medical_supplies'
  | 'medications'
  | 'equipment'
  | 'maintenance'
  | 'lab_fees'
  | 'insurance'
  | 'marketing'
  | 'cleaning'
  | 'salaries'
  | 'other'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'cheque'

export type RecurrenceType = 'one_time' | 'weekly' | 'monthly' | 'yearly'

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory | string
  description: string
  amount: number
  vendor?: string | null
  paymentMethod: PaymentMethod | string
  recurrence: RecurrenceType | string
  notes?: string | null
}

export interface CategoryExpenseSummary {
  category: string
  total: number
}

export interface ExpenseSummary {
  revenue: number
  totalExpenses: number
  totalSalaries: number
  netIncome: number
  outstanding: number
  byCategory: CategoryExpenseSummary[]
}

export interface ExpenseFormData {
  date: string
  category: string
  description: string
  amount: string
  vendor: string
  paymentMethod: string
  recurrence: string
  notes: string
}