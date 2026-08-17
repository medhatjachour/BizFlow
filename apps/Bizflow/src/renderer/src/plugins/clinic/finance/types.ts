import type { ElementType } from 'react'

export type Period = 'today' | 'week' | 'month' | 'year'
export type MainTab = 'overview' | 'revenue' | 'materials'

export interface PatientFinance {
  totalCharged: number
  totalPaid: number
  outstanding: number
}

export interface PatientWithFinance {
  id: string
  name: string
  phone: string
  finance?: PatientFinance
}

export interface DebtorsResponse {
  data: PatientWithFinance[]
  total: number
  totalOutstanding: number
  hasMore: boolean
}

export interface CategoryExpenseSummary {
  category: string
  total: number
}

export interface FinanceSummary {
  revenue: number
  totalExpenses: number
  totalSalaries: number
  netIncome: number
  outstanding: number
  byCategory: CategoryExpenseSummary[]
}

export interface SpendBreakdownEntry {
  label: string
  total: number
}

export interface RevenueBreakdownEntry {
  label: string
  revenue: number
  expenses: number
}

export interface TopMaterialItem {
  name: string
  value: number
  quantity: number
  unit: string
  category?: string | null
}

export interface MatFinanceSummary {
  inventoryValue: number
  totalMaterials: number
  lowStockCount: number
  expiredCount: number
  expiringSoonCount: number
  lossAmount: number
  expiryAmount: number
  suppliesSpend: number
  totalMaterialExpenses: number
  topMaterials: TopMaterialItem[]
}

export interface TabDefinition {
  key: MainTab
  icon: ElementType
  label: string
}

export interface PeriodDefinition {
  key: Period
  label: string
}