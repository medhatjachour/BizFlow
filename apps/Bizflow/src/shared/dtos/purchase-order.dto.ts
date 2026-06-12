import { SupplierResponseDTO } from './supplier.dto'
import { ProductResponseDTO } from './product.dto'

export interface PurchaseOrderItemDTO {
  id: string
  productId: string
  variantId?: string
  quantity: number
  unitCost: number
  totalCost: number
  receivedQty: number
  product: ProductResponseDTO
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseOrderResponseDTO {
  id: string
  poNumber: string
  supplierId: string
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  orderDate: Date
  expectedDate?: Date
  receivedDate?: Date
  totalAmount: number
  taxAmount: number
  shippingCost: number
  notes?: string
  orderedBy: string
  approvedBy?: string
  supplier: SupplierResponseDTO
  items: PurchaseOrderItemDTO[]
  createdAt: Date
  updatedAt: Date
}

export interface CreatePurchaseOrderDTO {
  supplierId: string
  expectedDate?: Date
  taxAmount?: number
  shippingCost?: number
  notes?: string
  items: {
    productId: string
    variantId?: string
    quantity: number
    unitCost: number
  }[]
}

export interface UpdatePurchaseOrderDTO {
  status?: 'draft' | 'ordered' | 'received' | 'cancelled'
  expectedDate?: Date
  receivedDate?: Date
  taxAmount?: number
  shippingCost?: number
  notes?: string
  approvedBy?: string
  items?: {
    productId: string
    variantId?: string
    quantity: number
    unitCost: number
    receivedQty?: number
  }[]
}

export interface PurchaseOrderFilters {
  supplierId?: string
  status?: string
  startDate?: Date
  endDate?: Date
  minAmount?: number
  maxAmount?: number
}

export interface PurchaseOrderSummaryDTO {
  total: number
  draft: number
  ordered: number
  received: number
  cancelled: number
  totalValue: number
  pendingValue: number
}