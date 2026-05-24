/**
 * Product Data Transfer Objects
 * 
 * Type-safe interfaces for API communication
 * Separates internal models from external API contracts
 */

/**
 * Create Product Request
 */
export interface CreateProductDTO {
  name: string
  baseSKU: string
  category: string
  description?: string
  basePrice: number
  baseCost: number
  hasVariants: boolean
  storeId?: string
  variants?: CreateVariantDTO[]
  images?: CreateImageDTO[]
}

/**
 * Update Product Request
 */
export interface UpdateProductDTO {
  name?: string
  baseSKU?: string
  category?: string
  description?: string
  basePrice?: number
  baseCost?: number
  hasVariants?: boolean
  storeId?: string
}

/**
 * Product Response
 */
export interface ProductResponseDTO {
  id: string
  name: string
  baseSKU: string
  category: string
  description: string | null
  basePrice: number
  baseCost: number
  hasVariants: boolean
  storeId: string | null
  totalStock: number
  stockValue: number
  retailValue: number
  variantCount: number
  stockStatus: 'out' | 'low' | 'normal' | 'high'
  createdAt: string
  updatedAt: string
  variants: VariantResponseDTO[]
  images: ImageResponseDTO[]
}

/**
 * Create Variant Request
 */
export interface CreateVariantDTO {
  sku: string
  price: number
  stock: number
  attributes?: { name: string; value: string }[]
}

/**
 * Variant Response
 */
export interface VariantResponseDTO {
  id: string
  sku: string
  price: number
  stock: number
  color?: string | null
  size?: string | null
  attributeValues?: { attributeId: string; value: string; attribute?: { name: string } }[]
  createdAt: string
  updatedAt: string
}

/**
 * Create Image Request
 */
export interface CreateImageDTO {
  imageData: string
  order: number
}

/**
 * Image Response
 */
export interface ImageResponseDTO {
  id: string
  imageData: string
  order: number
  createdAt: string
}

/**
 * Product List Query
 */
export interface ProductQueryDTO {
  search?: string
  category?: string
  storeId?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated Product Response
 */
export interface PaginatedProductsDTO {
  data: ProductResponseDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

/**
 * Stock Update Request
 */
export interface UpdateStockDTO {
  variantId: string
  stock: number
  reason?: string
}

/**
 * Bulk Stock Update Request
 */
export interface BulkUpdateStockDTO {
  updates: Array<{
    variantId: string
    stock: number
  }>
}
