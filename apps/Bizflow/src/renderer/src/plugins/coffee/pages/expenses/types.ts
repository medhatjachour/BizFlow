export type ExpenseRow = {
  id: string
  date: string
  category: string
  description: string
  amount: number
  vendor?: string | null
  paymentMethod: string
  recurrence: string
  shiftId?: string | null
  notes?: string | null
  shift?: {
    id: string
    openedAt: string
    closedAt?: string | null
    cashier?: { username: string; fullName?: string | null }
  }
}

export type Summary = {
  totalExpenses: number
  expenseCount: number
  averageExpense: number
  linkedToShifts: number
  unlinkedExpenses: number
  byCategory: Array<{ category: string; total: number; count: number }>
  byPaymentMethod: Array<{ method: string; total: number; count: number }>
}

export type ExpenseForm = {
  date: string
  category: string
  description: string
  amount: string
  vendor: string
  paymentMethod: string
  recurrence: string
  shiftId: string
  notes: string
}

export type Period = 'today' | 'week' | 'month' | 'all'

export type Filters = {
  period: Period
  category: string
  paymentMethod: string
  shiftId: string
  search: string
  page: number
}
