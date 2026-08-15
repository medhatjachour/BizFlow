export interface BakeryExpense {
  id: string
  date: string
  category: ExpenseCategoryKey
  description: string
  amount: number
  vendor?: string | null
  paymentMethod: PaymentMethodKey
  recurrence: RecurrenceKey
  notes?: string | null
}

export type ExpenseCategoryKey =
  | 'ingredients'
  | 'equipment'
  | 'packaging'
  | 'rent'
  | 'utilities'
  | 'marketing'
  | 'maintenance'
  | 'salaries'
  | 'other'

export interface CategoryMeta {
  value: ExpenseCategoryKey
  label: string
  badgeClass: string
  barColor: string
}

export type PaymentMethodKey = 'cash' | 'card' | 'transfer' | 'cheque'
export type RecurrenceKey = 'one_time' | 'weekly' | 'monthly' | 'yearly'
export type DateRangeKey = '7days' | '30days' | '90days' | 'all'

export interface ExpenseSummaryCategory {
  category: ExpenseCategoryKey
  _sum: {
    amount: number
  }
}

export interface ExpenseSummary {
  totalAmount: number
  byCategory: ExpenseSummaryCategory[]
}

export interface ExpenseFormData {
  date: string
  category: ExpenseCategoryKey
  description: string
  amount: string
  vendor: string
  paymentMethod: PaymentMethodKey
  recurrence: RecurrenceKey
  notes: string
}

export type SortField = 'date' | 'amount' | 'description'
export type SortOrder = 'asc' | 'desc'