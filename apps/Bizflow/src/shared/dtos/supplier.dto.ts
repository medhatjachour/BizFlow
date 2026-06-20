/**
 * Supplier Data Transfer Objects
 *
 * Type-safe interfaces for API communication
 * Separates internal models from external API contracts
 */

/**
 * Create Supplier Request
 */
export interface CreateSupplierDTO {
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
  notes?: string
}

/**
 * Update Supplier Request
 */
export interface UpdateSupplierDTO {
  name?: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
  isActive?: boolean
  notes?: string
}

/**
 * Supplier Response
 */
export interface SupplierResponseDTO {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  paymentTerms: string | null
  isActive: boolean
  notes: string | null
  productCount: number
  totalPurchaseOrders: number
  totalPurchased: number
  createdAt: string
  updatedAt: string
}

/**
 * Supplier List Query
 */
export interface SupplierQueryDTO {
  search?: string
  isActive?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'createdAt' | 'totalPurchased'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated Supplier Response
 */
export interface PaginatedSuppliersDTO {
  data: SupplierResponseDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * Create Supplier Product Link
 */
export interface CreateSupplierProductDTO {
  supplierId: string
  productId: string
  sku?: string
  cost: number
  leadTime?: number
  minOrderQty?: number
  isPreferred?: boolean
}

/**
 * Update Supplier Product Link
 */
export interface UpdateSupplierProductDTO {
  sku?: string
  cost?: number
  leadTime?: number
  minOrderQty?: number
  isPreferred?: boolean
}

/**
 * Supplier Product Response
 */
export interface SupplierProductResponseDTO {
  id: string
  supplierId: string
  productId: string
  productName: string
  productSKU: string
  sku: string | null
  cost: number
  leadTime: number | null
  minOrderQty: number
  isPreferred: boolean
  createdAt: string
  updatedAt: string
}