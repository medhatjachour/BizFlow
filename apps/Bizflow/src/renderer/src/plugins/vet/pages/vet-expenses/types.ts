export type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface ExpenseRecord {
  id: string
  date: string
  category: string
  description: string
  amount: number
  vendor?: string | null
  paymentMethod?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ExpenseSummary {
  revenue: number
  totalExpenses: number
  netIncome: number
  outstanding: number
}

export interface ExpenseFormData {
  date: string
  category: string
  description: string
  amount: string
  vendor: string
  paymentMethod: string
  notes: string
}

export type ExpenseSortField = 'date' | 'amount' | 'category' | 'description'
export type ExpenseViewMode = 'table' | 'grid'