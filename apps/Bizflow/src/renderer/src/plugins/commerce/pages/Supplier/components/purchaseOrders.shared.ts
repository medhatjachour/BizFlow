// Shared types and status config for the commerce PurchaseOrders component.
import { Edit, Clock, CheckCircle, XCircle } from 'lucide-react'

export interface PurchaseOrderFormData {
  supplierId: string
  expectedDate: string
  taxAmount: number
  shippingCost: number
  notes: string
  items: {
    productId: string
    variantId?: string
    quantity: number
    unitCost: number
  }[]
}

export interface PurchaseOrderItemForm {
  productId: string
  variantId?: string
  quantity: number
  unitCost: number
}

export const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'gray', icon: Edit },
  ordered: { label: 'Ordered', color: 'blue', icon: Clock },
  received: { label: 'Received', color: 'green', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle }
} as const

export interface PrefilledPurchaseOrder {
  productId: string
  variantId: string
  productName: string
  variantName: string
  suggestedQty: number
  supplierInfo?: {
    supplierId?: string
    supplierName: string
    cost: number
    leadTime: number
  }
}

export interface PurchaseOrdersProps {
  prefilledData?: PrefilledPurchaseOrder | null
  onClearPrefilled?: () => void
}
