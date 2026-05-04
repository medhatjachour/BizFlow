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
  date: string
  amount: number
  description: string
  category: ExpenseCategory
  vendor?: string
  paymentMethod: string
  recurrence: string
  notes?: string
  createdAt: string
}

export interface ExpenseFormData {
  amount: number
  description: string
  category: ExpenseCategory
  vendor: string
  paymentMethod: string
  recurrence: string
  date: string
  notes: string
}

export interface PayrollEmployee {
  employeeId: string
  name: string
  role: string
  department: string
  baseSalary:    number
  regularHours:  number
  overtimeHours: number
  overtimePay:   number
  extraShifts:   number
  extraShiftPay: number
  bonuses:       number
  deductions:    number
  grossPay:      number
  netPay:        number
  recordCount:   number
  hasPending:    boolean
}
  employeeId: string
  name: string
  role: string
  department: string
  baseSalary:    number
  regularHours:  number
  overtimeHours: number
  overtimePay:   number
  extraShifts:   number
  extraShiftPay: number
  bonuses:       number
  deductions:    number
  grossPay:      number
  netPay:        number
  recordCount:   number
  hasPending:    boolean
}
