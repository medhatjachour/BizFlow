/**
 * Products Domain Types
 * Page-specific types that extend shared types
 */

import type {
  Product,
  ProductVariant,
  ProductImage
} from '@/shared/types'

// Re-export shared types for convenience
export type {
  Product,
  ProductVariant,
  ProductImage
}

// Page-specific form data types
export interface ProductFormData {
  name: string
  baseSKU: string
  category: string
  description: string
  basePrice: number
  baseCost: number
  baseStock: number
  storeId: string
  images: string[]
  hasVariants: boolean
  variants: ProductVariant[]
}

export interface ProductFormErrors {
  name?: string
  baseSKU?: string
  category?: string
  basePrice?: string
  baseCost?: string
}

export interface ProductFilters {
  searchQuery: string
  category: string
  store: string
  stockStatus: string
}

export interface VariantFormData {
  sku: string
  price: number
  stock: number
  attributes?: { name: string; value: string }[]
}
