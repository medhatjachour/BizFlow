export type DashboardPeriod = 'today' | 'week' | 'month' | 'year'

export interface CashflowSnapshot {
  cashToday: number
  txToday: number
  receivables: number
  payables: number
  openOrders: number
  outOfStock: number
  lowStock: number
  expiring: number
  expired: number
}

export interface DashboardSalesStats {
  revenue: number
  cogs: number
  grossProfit: number
  margin: number
  saleCount: number
  unitsSold: number
  topProducts?: { id: string; name: string; units: number; revenue: number }[]
}

export interface DashboardOverview {
  today?: { revenue: number; saleCount: number }
  sales?: DashboardSalesStats
  stockValue: number
  activeProducts: number
  outstanding: number
  expiredBatches: number
  expiredValue: number
  outOfStock: number
  expiringSoon: number
  expiringValue: number
  lowStock: number
}

export interface OperationalAlertItem {
  key: string
  tone: 'red' | 'amber'
  title: string
  subtitle: string
  tab: string
  iconKey: 'PackageX' | 'PackageMinus' | 'AlertTriangle' | 'Wallet'
}