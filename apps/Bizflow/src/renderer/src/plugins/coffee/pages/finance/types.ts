export interface FinanceOverview {
  netSales: number
  grossSales: number
  totalDiscount: number
  totalOrders: number
  averageOrderValue: number
  cogs: number
  operationalExpenses: number
  expenseCount: number
  totalExpenses: number
  grossProfit: number
  netProfitAfterExpenses: number
  grossMarginPct: number
  avgDiscountPerOrder: number
  discountedOrders: number
  discountOrderRatePct: number
  payment: Record<string, number>
  paymentPct: Record<string, number>
  refundsAndVoids: number
  openOrdersCount: number
  openOrdersValue: number
  shiftStats: {
    openingCash: number
    cashSales: number
    closingCash: number
    cashDifference: number
    closedShifts: number
    expectedDrawer: number
    linkedExpenseTotal: number
    expectedAfterExpenses: number
  }
}

export interface Transaction {
  id: string
  orderNumber: string
  type: string
  total: number
  subtotal: number
  discount: number
  paymentMethod?: string
  closedAt?: string
  customerName?: string
  customerPhone?: string
  table?: { number: number; name?: string }
  cashier?: { username: string; fullName?: string }
  items?: { productName: string; quantity: number; total: number }[]
}

export type Preset = 'today' | 'week' | 'month' | 'all'
export type OrderTypeFilter = 'all' | 'dine_in' | 'takeaway' | 'delivery'
export type PaymentFilter = 'all' | 'cash' | 'card' | 'vodafone_cash'

export interface Filters {
  preset: Preset
  from: string
  to: string
  paymentMethod: PaymentFilter
  type: OrderTypeFilter
  search: string
  page: number
}
