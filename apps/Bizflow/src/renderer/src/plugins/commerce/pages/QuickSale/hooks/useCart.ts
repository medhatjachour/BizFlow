import { useState, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import type { Product, ProductVariant, CartItem, DiscountData } from '../types'
import {
  getVariantLabel,
  calculateFinalPrice,
  calculateCartTotals,
  canApplyDiscount,
  buildCartItemId,
  isCartItemMatch,
} from '../utils'
import {
  OUT_OF_STOCK_MESSAGE,
  STOCK_LIMIT_MESSAGE,
  DISCOUNTS_DISABLED_MESSAGE,
} from '../constants'
import logger from '@/shared/utils/logger'

export function useCart() {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [discountingItem, setDiscountingItem] = useState<CartItem | null>(null)
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  const { subtotal, tax, taxRate, totalDiscount, total } = useMemo(
    () => calculateCartTotals(cartItems),
    [cartItems]
  )

  const addToCart = useCallback(
    (product: Product, variant?: ProductVariant) => {
      const stock = variant ? variant.stock : product.totalStock
      const price = variant ? variant.price : product.basePrice
      const sku = variant ? variant.sku : product.baseSKU
      const variantLabel = variant ? getVariantLabel(variant) : undefined

      if (stock === 0) {
        showToast('error', OUT_OF_STOCK_MESSAGE)
        return
      }

      setCartItems((prev) => {
        const existingIndex = prev.findIndex((item) =>
          variant
            ? item.productId === product.id && item.variantId === variant.id
            : item.productId === product.id
        )

        if (existingIndex >= 0) {
          const currentQty = prev[existingIndex].quantity
          if (currentQty >= stock) {
            showToast('warning', STOCK_LIMIT_MESSAGE)
            return prev
          }

          const updated = [...prev]
          const priceToUse = updated[existingIndex].finalPrice ?? updated[existingIndex].price
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
            subtotal: priceToUse * (updated[existingIndex].quantity + 1),
          }
          return updated
        }

        return [
          ...prev,
          {
            id: buildCartItemId(product.id, variant?.id),
            productId: product.id,
            variantId: variant?.id,
            name: product.name,
            sku,
            price,
            quantity: 1,
            discount: 0,
            subtotal: price,
            availableStock: stock,
            variantLabel,
            discountType: 'NONE',
            discountValue: 0,
            finalPrice: price,
          },
        ]
      })
    },
    [showToast]
  )

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string) => {
      if (quantity <= 0) {
        removeFromCart(productId, variantId)
        return
      }

      setCartItems((prev) =>
        prev.map((item) => {
          if (!isCartItemMatch(item, productId, variantId)) return item

          if (item.availableStock && quantity > item.availableStock) {
            showToast('warning', STOCK_LIMIT_MESSAGE)
            const priceToUse = item.finalPrice ?? item.price
            return {
              ...item,
              quantity: item.availableStock,
              subtotal: priceToUse * item.availableStock,
            }
          }

          const priceToUse = item.finalPrice ?? item.price
          return { ...item, quantity, subtotal: priceToUse * quantity }
        })
      )
    },
    [showToast]
  )

  const removeFromCart = useCallback((productId: string, variantId?: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !isCartItemMatch(item, productId, variantId))
    )
  }, [])

  const clearCart = useCallback(() => {
    if (cartItems.length === 0) return
    if (confirm('Clear all items from cart?')) {
      setCartItems([])
      showToast('success', 'Cart cleared')
    }
  }, [cartItems.length, showToast])

  const openDiscountModal = useCallback(
    (item: CartItem) => {
      if (!canApplyDiscount()) {
        showToast('error', DISCOUNTS_DISABLED_MESSAGE)
        return
      }
      setDiscountingItem(item)
      setShowDiscountModal(true)
    },
    [showToast]
  )

  const handleApplyDiscount = useCallback(
    (discountData: DiscountData) => {
      if (!discountingItem) return

      const finalPrice = calculateFinalPrice(
        discountingItem.price,
        discountData.type,
        discountData.value
      )

      setCartItems((prev) =>
        prev.map((item) => {
          if (!isCartItemMatch(item, discountingItem.productId, discountingItem.variantId)) {
            return item
          }

          return {
            ...item,
            discountType: discountData.type,
            discountValue: discountData.value,
            finalPrice,
            discountReason: discountData.reason,
            discountAppliedBy: user?.id,
            subtotal: finalPrice * item.quantity,
          }
        })
      )

      const label =
        discountData.type === 'PERCENTAGE'
          ? `${discountData.value}%`
          : `$${discountData.value}`
      showToast('success', `Discount applied: ${label}`)
      setDiscountingItem(null)
      setShowDiscountModal(false)
    },
    [discountingItem, user?.id, showToast]
  )

  const refreshCartStock = useCallback(async () => {
    if (cartItems.length === 0) return

    try {
      const productIds = cartItems.map((item) => item.productId)

      for (const productId of productIds) {
        const response = await (window as any).api['search:products']({
          query: productId,
          limit: 1,
          includeImages: false,
        })

        const results = response?.items || []
        if (results.length > 0) {
          const product = results[0]
          setCartItems((prev) =>
            prev.map((item) =>
              item.productId === productId
                ? { ...item, availableStock: product.totalStock }
                : item
            )
          )
        }
      }
    } catch (error) {
      logger.error('Error refreshing stock:', error)
    }
  }, [cartItems])

  const resetCart = useCallback(() => {
    setCartItems([])
  }, [])

  return {
    cartItems,
    setCartItems,
    subtotal,
    tax,
    taxRate,
    totalDiscount,
    total,
    discountingItem,
    showDiscountModal,
    setShowDiscountModal,
    setDiscountingItem,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    openDiscountModal,
    handleApplyDiscount,
    refreshCartStock,
    resetCart,
  }
}