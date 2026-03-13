export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'inventory'
  | 'marketing'
  | 'maintenance'
  | 'fees'
  | 'insurance'
  | 'other'

export type DateRange = '7days' | '30days' | '90days' | 'all'

export interface Expense {
  id: string
  amount: number
  description: string
  category: ExpenseCategory
  userId: string
  createdAt: string
  user?: {
    username: string
  }
}

export interface ExpenseFormData {
  amount: number
  description: string
  category: ExpenseCategory
}
