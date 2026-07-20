export interface ShiftOrder {
  id: string
  orderNumber: string
  type: string
  status: string
  total: number
  subtotal?: number
  paymentMethod?: string
  customerName?: string
  openedAt: string
  closedAt?: string
  table?: { number: number; name?: string }
  items?: { productName: string; quantity: number; total: number }[]
}

export interface Shift {
  id: string
  status: string
  cashier: { id: string; username: string; fullName?: string }
  openingCash: number
  closingCash?: number
  totalSales: number
  totalOrders: number
  cashTotal: number
  cardTotal: number
  vodafoneCashTotal: number
  cashDifference?: number
  notes?: string
  openedAt: string
  closedAt?: string
  orders?: ShiftOrder[]
  _count?: { orders: number }
}

export interface ShiftSummary {
  totalShifts: number
  closedShifts: number
  totalSales: number
  totalOrders: number
  averageShiftSales: number
  averageOrdersPerShift: number
  averageOpeningCash: number
  averageCashDifference: number
  longestShiftMinutes: number
  topCashiers: Array<{ cashierId: string; cashierName: string; totalSales: number; shiftCount: number }>
}

export type Preset = 'today' | 'week' | 'month' | 'all'
export type StatusFilter = 'all' | 'open' | 'closed'

export interface OpenForm {
  openingCash: string
  notes: string
}

export interface CloseForm {
  closingCash: string
  notes: string
}
