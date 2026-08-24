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
  ordersCount: number
  totalSales: number
  totalTips: number
  startCash: number
  endCash: number | null
  totalDiscounts: number
  totalVoids: number
  paymentBreakdown: Record<string, number>
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