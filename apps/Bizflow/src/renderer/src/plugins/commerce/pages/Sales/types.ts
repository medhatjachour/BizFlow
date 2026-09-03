/**
 * Shared types for the Sales page and its sub-views.
 * Extracted from Sales.tsx to keep that file focused on component logic.
 */

export type SaleItem = {
  id: string
  productId: string
  variantId?: string | null
  quantity: number
  refundedQuantity?: number
  price: number
  total: number
  refundedAt?: string | null
  discountType?: string
  discountValue?: number
  finalPrice?: number
  discountReason?: string
  discountAppliedBy?: string
  product?: {
    name: string
    category: string | { name: string }
    baseSKU: string
  }
  variant?: {
    variantSKU: string
    size?: string
    color?: string
  }
}

export type Installment = {
  id: string
  amount: number
  dueDate: string | number
  status: 'pending' | 'paid' | 'overdue'
  paidDate?: string
  notes?: string
  customerId: string
  saleId?: string
  customer?: {
    id: string
    name: string
  }
}

export type SaleTransaction = {
  id: string
  userId: string
  paymentMethod: string
  status: 'completed' | 'pending' | 'partially_refunded' | 'refunded'
  completionScheduledFor?: string | null
  completionDelayDays?: number | null
  completedAt?: string | null
  customerName?: string | null
  subtotal: number
  tax: number
  total: number
  createdAt: string
  items: SaleItem[]
  deposits?: Array<{
    id: string
    amount: number
    date: string
    method: string
    status?: string
    note?: string
  }>
  installments?: Array<{
    id: string
    amount: number
    dueDate: string
    paidDate?: string
    status: string
    note?: string
  }>
  user?: {
    username: string
  }
}

export type SalesTab = 'sales' | 'installments'

export type DateFilter = 'all' | 'today' | 'week' | 'month'

export type InstallmentStatusFilter = 'all' | 'pending' | 'paid' | 'overdue'

export type InstallmentDateFilter = 'all' | 'today' | 'week' | 'month' | 'overdue'

export type SalesStats = {
  totalRevenue: number
  totalSales: number
  totalItems: number
  avgSale: number
  todayRevenue: number
  todayCount: number
  revenueChange: number
  salesChange: number
  weeklyRevenueChange: number
  hasData: boolean
}