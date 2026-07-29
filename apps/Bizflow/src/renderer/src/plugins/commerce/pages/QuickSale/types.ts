import type { Customer } from '../POS/types'

export type ProductVariant = {
  id: string
  color?: string
  size?: string
  attributeValues?: Array<{ attribute: { name: string }; value: string }>
  sku: string
  barcode?: string
  price: number
  stock: number
}

export type Product = {
  id: string
  name: string
  baseSKU: string
  basePrice: number
  totalStock: number
  imageUrl?: string
  category?: string
  hasVariants?: boolean
  variants?: ProductVariant[]
}

export type CartItem = {
  id: string
  productId: string
  variantId?: string
  name: string
  sku: string
  price: number
  quantity: number
  discount: number
  subtotal: number
  availableStock?: number
  variantLabel?: string
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE'
  discountValue?: number
  finalPrice?: number
  discountReason?: string
  discountAppliedBy?: string
}

export type QuickSaleProps = {
  onCompleteSale?: (
    items: CartItem[],
    customer: Customer | null,
    paymentMethod: string
  ) => Promise<void>
}

export type DiscountData = {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE'
  value: number
  reason?: string
}