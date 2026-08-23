export type PurchaseOrderStatus = 'all' | 'draft' | 'ordered' | 'received' | 'cancelled'

export interface SupplierItem {
  id: string
  name: string
  phone?: string
  email?: string
}

export interface POLineItem {
  id?: string
  productId: string
  productName: string
  quantity: string
  costPerUnit: string
  sellingPrice: string
  expiryDate: string
}

export interface PurchaseOrderItem {
  id: string
  orderNumber: string
  orderDate: string
  supplierId?: string
  supplier?: SupplierItem
  itemCount: number
  total: number
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  notes?: string
  items?: {
    id: string
    productId?: string
    productName: string
    quantity: number
    costPerUnit: number
    sellingPrice?: number
    expiryDate?: string
  }[]
}

export interface PurchaseOrdersMetrics {
  totalOrders: number
  draftsCount: number
  pendingOrderedValue: number
  receivedValue: number
}   