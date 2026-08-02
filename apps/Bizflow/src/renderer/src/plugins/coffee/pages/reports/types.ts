export type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'

export interface DateRange {
  from: string
  to: string
}

export interface ReportFilters {
  startDate?: string
  endDate?: string
  limit?: number
}

export interface Overview {
  totalRevenue: number
  totalDiscount: number
  totalOrders: number
  averageOrderValue: number
  totalItemsSold: number
  totalCogs: number
  operationalExpenses: number
  expenseCount: number
  totalExpenses: number
  grossProfit: number
  netProfitAfterExpenses: number
  grossMarginPct: number
  netMarginPct: number
  avgItemsPerOrder: number
  discountRatePct: number
  deliveryRevenue: number
  payment: Record<string, number>
  orderTypes: Record<string, number>
  peakHour: { hour: number; value: number }
  topCashiers: Array<CashierRow>
  topCustomers: Array<CustomerRow>
  uniqueCustomers: number
  repeatCustomers: number
  repeatCustomerRatePct: number
  lowStockCount: number
  outOfStockCount: number
  expenseByCategory: Array<ExpenseCategoryRow>
  bestDay: { date: string; revenue: number; orders: number }
  worstDay: { date: string; revenue: number; orders: number }
}

export interface TrendRow {
  date: string
  revenue: number
  orders: number
  discount: number
  profit: number
}

export interface ProductRow {
  productId: string | null
  productName: string
  categoryName: string
  quantity: number
  revenue: number
  cogs: number
  grossProfit: number
  marginPct: number
}

export interface CategoryRow {
  categoryId: string | null
  categoryName: string
  quantity: number
  revenue: number
  cogs: number
  grossProfit: number
  marginPct: number
}

export interface CustomerRow {
  id: string
  name: string
  orders: number
  spent: number
  deliveryOrders: number
  lastVisit: string
}

export interface CashierRow {
  id: string
  name: string
  orders: number
  revenue: number
  avgOrderValue: number
}

export interface CustomerInsights {
  topCustomers: Array<CustomerRow>
  totalCustomers: number
  repeatCustomers: number
  repeatRatePct: number
  newCustomers: number
  avgSpendPerCustomer: number
}

export interface ExpenseCategoryRow {
  category: string
  total: number
  count: number
  pct: number
}

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'print'

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  key: string
  direction: SortDirection
}

export type StatTone = 'revenue' | 'profit' | 'orders' | 'customers' | 'items' | 'discount' | 'expense' | 'neutral'
