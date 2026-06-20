/**
 * Type definitions for POS module
 */

export type ProductVariant = {
  id: string
  sku: string
  barcode?: string
  price: number
  stock: number
  color?: string
  size?: string
  attributeValues?: { attributeId: string; value: string; attribute?: { name: string } }[]
}

export type Product = {
  id: string
  name: string
  basePrice: number
  category: string
  hasVariants: boolean
  variants: ProductVariant[]
  images: { imageData: string }[]
  totalStock: number
}

export type CartItem = {
  id: string
  productId: string // Original product ID for database operations
  variantId?: string
  name: string
  variant?: string
  price: number
  quantity: number
  stock: number // Available stock for this item
  // Product snapshot for validation during checkout
  productSnapshot?: Product
  variantSnapshot?: ProductVariant
  // Discount fields
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE'
  discountValue?: number
  finalPrice?: number
  discountReason?: string
  discountAppliedBy?: string
}

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
}

export type PaymentMethod = 'cash' | 'card'
