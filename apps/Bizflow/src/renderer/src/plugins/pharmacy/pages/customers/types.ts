export interface PharmacyCustomerItem {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  defaultDiscount?: number
  salesCount: number
  totalSpent: number
  outstanding: number
  lastVisit?: string | null
  createdAt?: string
}

export interface CustomerFormData {
  name: string
  phone: string
  email: string
  address: string
  notes: string
  defaultDiscount: string
}

export interface CustomerFinanceStats {
  totalCharged: number
  totalPaid: number
  outstanding: number
  salesCount: number
  unitsBought: number
}

export interface CustomerSaleRecord {
  id: string
  saleNumber: string
  saleDate: string
  total: number
  amountPaid: number
  refundedAmount?: number
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  status: 'completed' | 'refunded' | 'partially_refunded'
  items?: any[]
}

export interface CustomerProfileData {
  customer: PharmacyCustomerItem
  finance: CustomerFinanceStats
  sales: CustomerSaleRecord[]
}

export interface CustomersMetrics {
  totalCustomers: number
  totalRevenue: number
  totalOutstanding: number
  debtorsCount: number
}