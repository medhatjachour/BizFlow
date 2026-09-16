export interface RestaurantShiftData {
  id: string
  serverId: string
  serverName: string
  startCash: number
  endCash: number | null
  totalSales: number
  totalTips: number
  notes: string | null
  status: 'active' | 'closed'
  openedAt: string
  closedAt: string | null
}

export interface ZReportData {
  shift: RestaurantShiftData
  /** Checks settled inside the shift window — the only source of revenue. */
  ordersCount: number
  /** Checks opened in the window that are still open/billing. */
  openChecksCount: number
  openChecksTotal: number
  grossSales: number
  netSales: number
  cashSales: number
  cardSales: number
  cashTips: number
  cardTips: number
  totalTips: number
  startCash: number
  endCash: number | null
  expectedCash: number
  variance: number
  totalDiscounts: number
  /** Voided checks + individually voided lines. */
  totalVoids: number
  voidedOrdersCount: number
  voidedLineCount: number
  voidedOrdersTotal: number
  paymentBreakdown: Record<string, number>
  categoryRevenue: Record<string, number>
}

export interface OpenShiftFormData {
  serverId: string
  serverName: string
  startCash: string
}

export interface CloseShiftFormData {
  endCash: string
  notes: string
}
