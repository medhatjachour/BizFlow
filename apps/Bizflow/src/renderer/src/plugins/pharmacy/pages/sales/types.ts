export type PaymentStatus = 'all' | 'paid' | 'partial' | 'unpaid'
export type SaleStatus = 'all' | 'completed' | 'refunded' | 'partially_refunded'

export interface SaleItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  saleUnit?: 'base' | 'sub'
  unit?: string
  subUnit?: string | null
  refundedQty?: number
}

export interface PharmacySale {
  id: string
  saleNumber: string
  saleDate: string
  customerName?: string | null
  customerId?: string | null
  items: SaleItem[]
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  refundedAmount?: number
  paymentMethod: string
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  status: 'completed' | 'refunded' | 'partially_refunded'
  notes?: string
}

export interface SalesMetrics {
  totalSalesCount: number
  totalRevenue: number
  totalOutstanding: number
  totalRefunded: number
}