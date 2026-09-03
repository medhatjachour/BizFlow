export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'inventory'
  | 'marketing'
  | 'maintenance'
  | 'fees'
  | 'insurance'
  | 'travel'
  | 'taxes'
  | 'other'

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'digital_wallet'
export type RecurrenceType = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type DateRange = 'today' | '7days' | '30days' | '90days' | 'this_month' | 'last_month' | 'all'
export type ViewMode = 'table' | 'cards'

export interface Expense {
  id: string
  date: string
  amount: number
  description: string
  category: ExpenseCategory
  vendor?: string
  paymentMethod: PaymentMethod
  recurrence: RecurrenceType
  notes?: string
  receiptUrl?: string
  referenceNumber?: string
  isTaxDeductible?: boolean
  createdAt: string
  updatedAt?: string
  user?: {
    id?: string
    username: string
    name?: string
  }
}

export interface ExpenseFormData {
  amount: number
  description: string
  category: ExpenseCategory
  vendor: string
  paymentMethod: PaymentMethod
  recurrence: RecurrenceType
  date: string
  notes: string
  referenceNumber: string
  isTaxDeductible: boolean
}

export interface PayrollEmployee {
  employeeId: string
  name: string
  role: string
  department: string
  baseSalary: number
  regularHours: number
  overtimeHours: number
  overtimePay: number
  extraShifts: number
  extraShiftPay: number
  bonuses: number
  deductions: number
  grossPay: number
  netPay: number
  recordCount: number
  hasPending: boolean
}

export interface ExpenseSummaryStats {
  operationalExpenses: number
  totalCOGS: number
  totalExpenses: number
  totalSalaries: number
  totalBaseSalary: number
  totalOvertimePay: number
  totalExtraShiftPay: number
  totalGrossPay: number
  totalWithSalaries: number
  expenseCount: number
  employeeCount: number
  taxDeductibleTotal: number
}