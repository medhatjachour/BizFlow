export interface Category {
  id: string
  name: string
}

export interface SaleItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  notes?: string
}

export interface Sale {
  id: string
  orderNumber: string
  type: OrderType
  paymentMethod?: PaymentMethod
  customerName?: string
  table?: { number: number }
  cashier?: { username: string; fullName?: string }
  subtotal: number
  discount: number
  tax?: number
  total: number
  items: SaleItem[]
  closedAt?: string
  createdAt?: string
}

export interface SummaryData {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  cash: number
  card: number
  vodafoneCash: number
  dineIn: number
  takeaway: number
  delivery: number
  grossSales?: number
  netSales?: number
  refunds?: number
  totalItems?: number
  avgItemsPerOrder?: number
  topProducts?: { name: string; qty: number; revenue: number }[]
  hourlyBreakdown?: { hour: number; orders: number; revenue: number }[]
  topCategories?: { name: string; revenue: number; percentage: number }[]
}

export interface SalesFilters {
  period: Period
  paymentMethod: PaymentMethod | 'all'
  type: OrderType | 'all'
  categoryId: string | 'all'
  search?: string
  sort?: SortOption
}

export interface SalesResponse {
  items: Sale[]
  totalPages: number
  total: number
  page: number
}

export type Period = 'today' | 'week' | 'month' | 'all'
export type PaymentMethod = 'cash' | 'card' | 'vodafone_cash'
export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type SortOption = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc' | 'items_desc'
