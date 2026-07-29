import type { ProductVariant, CartItem } from './types'
import {
  TAX_RATE_KEY,
  ALLOW_DISCOUNTS_KEY,
  MAX_DISCOUNT_PERCENTAGE_KEY,
  MAX_DISCOUNT_AMOUNT_KEY,
  DEFAULT_TAX_RATE,
  DEFAULT_MAX_DISCOUNT_PERCENTAGE,
  DEFAULT_MAX_DISCOUNT_AMOUNT,
} from './constants'

export function getVariantLabel(variant: ProductVariant): string {
  if (variant.attributeValues && variant.attributeValues.length > 0) {
    return variant.attributeValues
      .map((av) => `${av.attribute.name}: ${av.value}`)
      .join(' / ')
  }
  return [variant.color, variant.size].filter(Boolean).join(' / ')
}

export function calculateFinalPrice(
  price: number,
  discountType: string,
  discountValue: number
): number {
  const value = Math.max(0, discountValue || 0)

  if (discountType === 'PERCENTAGE') {
    return Math.max(0, price - (price * Math.min(value, 100)) / 100)
  }

  if (discountType === 'FIXED_AMOUNT') {
    return Math.max(0, price - value)
  }

  return price
}

export function calculateCartTotals(cartItems: CartItem[]) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)

  const taxRate = parseFloat(localStorage.getItem(TAX_RATE_KEY) || String(DEFAULT_TAX_RATE))
  const tax = (subtotal * taxRate) / 100

  const totalDiscount = cartItems.reduce((sum, item) => {
    if (!item.discountType || item.discountType === 'NONE' || !item.discountValue) {
      return sum
    }

    const originalPrice = item.price
    const finalPrice = item.finalPrice ?? item.price
    const discountPerItem = originalPrice - finalPrice
    return sum + discountPerItem * item.quantity
  }, 0)

  const total = subtotal + tax

  return { subtotal, tax, taxRate, totalDiscount, total }
}

export function canApplyDiscount(): boolean {
  return localStorage.getItem(ALLOW_DISCOUNTS_KEY) === 'true'
}

export function getMaxDiscountPercentage(): number {
  return parseFloat(
    localStorage.getItem(MAX_DISCOUNT_PERCENTAGE_KEY) || String(DEFAULT_MAX_DISCOUNT_PERCENTAGE)
  )
}

export function getMaxDiscountAmount(): number {
  return parseFloat(
    localStorage.getItem(MAX_DISCOUNT_AMOUNT_KEY) || String(DEFAULT_MAX_DISCOUNT_AMOUNT)
  )
}

export function buildCartItemId(productId: string, variantId?: string): string {
  return variantId ? `${productId}-${variantId}` : productId
}

export function isCartItemMatch(
  item: CartItem,
  productId: string,
  variantId?: string
): boolean {
  if (variantId) {
    return item.productId === productId && item.variantId === variantId
  }
  return item.productId === productId && !item.variantId
}