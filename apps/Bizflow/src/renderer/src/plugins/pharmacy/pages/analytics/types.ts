export type ReportViewType = 'sales' | 'inventory' | 'financial'

export type DateRangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year'

export interface DateRange {
  from: string
  to: string
}

export interface TopProductMetric {
  id: string
  name: string
  units: number
  revenue: number
  cogs?: number
  profit?: number
  margin?: number
}

export interface SalesReportData {
  saleCount: number
  revenue: number
  cogs: number
  grossProfit: number
  margin: number
  unitsSold: number
  collected: number
  outstanding: number
  averageBasketValue?: number
  topProducts?: TopProductMetric[]
  paymentBreakdown?: { method: string; total: number; count: number }[]
}

export interface CategoryValuationMetric {
  category: string
  count: number
  value: number
  retailValue?: number
}

export interface InventoryReportData {
  totalProducts: number
  stockValue: number
  retailValue: number
  lowStock: number
  outOfStock: number
  expiredBatches: number
  expiredValue: number
  expiringSoon: number
  expiringValue: number
  byCategory?: CategoryValuationMetric[]
}