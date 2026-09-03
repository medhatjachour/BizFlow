import type { 
  SupplierResponseDTO, 
  CreateSupplierDTO, 
  UpdateSupplierDTO, 
  SupplierProductResponseDTO, 
  CreateSupplierProductDTO 
} from '@/shared/dtos/supplier.dto'
import type { 
  PurchaseOrderResponseDTO, 
  CreatePurchaseOrderDTO, 
  UpdatePurchaseOrderDTO, 
  PurchaseOrderSummaryDTO 
} from '@/shared/dtos/purchase-order.dto'
import type { ProductResponseDTO } from '@/shared/dtos/product.dto'

export type SupplierTab = 'suppliers' | 'purchase-orders' | 'reorders'

export interface SupplierFormData {
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  paymentTerms: string
  notes: string
}

export interface AddProductToSupplierForm {
  productId: string
  cost: string
  leadTime: string
  minOrderQty: string
  isPreferred: boolean
}

export interface PurchaseOrderItemForm {
  productId: string
  variantId?: string
  quantity: number
  unitCost: number
}

export interface PurchaseOrderFormData {
  supplierId: string
  expectedDate: string
  taxAmount: number
  shippingCost: number
  notes: string
  items: PurchaseOrderItemForm[]
}

export type POStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export interface StatusStyleConfig {
  label: string
  badgeClass: string
  iconClass: string
  dotClass: string
}

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

export interface SupplierFilterState {
  search: string
  status: 'all' | 'active' | 'inactive'
}

export interface PurchaseOrderFilterState {
  search: string
  status: 'all' | POStatus
  supplierId: string
}

export type {
  SupplierResponseDTO,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierProductResponseDTO,
  CreateSupplierProductDTO,
  PurchaseOrderResponseDTO,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  PurchaseOrderSummaryDTO,
  ProductResponseDTO
}



export interface PurchaseOrdersProps {
  prefilledData?: PrefilledPurchaseOrder | null
  onClearPrefilled?: () => void
}
