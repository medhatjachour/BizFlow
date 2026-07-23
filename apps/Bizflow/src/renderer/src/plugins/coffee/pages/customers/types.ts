export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
  totalSpent: number
  visitCount: number
  lastVisit?: string
  isVip?: boolean
  _count?: { orders: number }
}

export interface CustomerOrder {
  id: string
  orderNumber: string
  type: string
  total: number
  paymentMethod?: string
  deliveryAddress?: string
  closedAt?: string
  items: { productName: string; quantity: number; total: number }[]
}

export interface CustomerDetail extends Customer {
  orders: CustomerOrder[]
}

export interface CustomerFilters {
  search: string
  sort: CustomerSortOption
}

export interface CustomerListResponse {
  items: Customer[]
  total: number
  page: number
  totalPages: number
}

export type CustomerSortOption = 'recent' | 'name_asc' | 'spent_desc' | 'visits_desc'
