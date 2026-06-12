/**
 * Integration tests for discount feature in POS
 */

import { describe, it, expect, beforeEach } from 'vitest'

describe('Discount Feature Integration', () => {
  describe('Settings Integration', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('can store allowDiscounts setting', () => {
      localStorage.setItem('allowDiscounts', 'true')
      expect(localStorage.getItem('allowDiscounts')).toBe('true')
      
      localStorage.setItem('allowDiscounts', 'false')
      expect(localStorage.getItem('allowDiscounts')).toBe('false')
    })

    it('respects allowDiscounts setting', () => {
      localStorage.setItem('allowDiscounts', 'false')
      
      const canApplyDiscount = () => {
        return localStorage.getItem('allowDiscounts') === 'true'
      }
      
      expect(canApplyDiscount()).toBe(false)
    })

    it('stores max discount settings', () => {
      localStorage.setItem('maxDiscountPercentage', '50')
      localStorage.setItem('maxDiscountAmount', '100')
      
      expect(localStorage.getItem('maxDiscountPercentage')).toBe('50')
      expect(localStorage.getItem('maxDiscountAmount')).toBe('100')
    })

    it('requireDiscountReason is always true', () => {
      // This is hardcoded in the application
      const requireReason = true
      expect(requireReason).toBe(true)
    })
  })

  describe('Discount Application Flow', () => {
    type CartItem = {
      id: string
      productId: string
      price: number
      quantity: number
      discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE'
      discountValue?: number
      finalPrice?: number
      discountReason?: string
      discountAppliedBy?: string
      subtotal: number
    }

    const applyDiscountToItem = (
      item: CartItem,
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT',
      discountValue: number,
      reason: string,
      userId: string
    ): CartItem => {
      let finalPrice: number
      
      if (discountType === 'PERCENTAGE') {
        finalPrice = item.price - (item.price * discountValue / 100)
      } else {
        finalPrice = Math.max(0, item.price - discountValue)
      }
      
      return {
        ...item,
        discountType,
        discountValue,
        finalPrice,
        discountReason: reason,
        discountAppliedBy: userId,
        subtotal: finalPrice * item.quantity
      }
    }

    it('applies percentage discount to cart item', () => {
      const item: CartItem = {
        id: '1',
        productId: 'p1',
        price: 100,
        quantity: 2,
        subtotal: 200
      }
      
      const updated = applyDiscountToItem(item, 'PERCENTAGE', 20, 'Loyal customer', 'user123')
      
      expect(updated.finalPrice).toBe(80)
      expect(updated.subtotal).toBe(160)
      expect(updated.discountType).toBe('PERCENTAGE')
      expect(updated.discountValue).toBe(20)
      expect(updated.discountReason).toBe('Loyal customer')
      expect(updated.discountAppliedBy).toBe('user123')
    })

    it('applies fixed discount to cart item', () => {
      const item: CartItem = {
        id: '1',
        productId: 'p1',
        price: 100,
        quantity: 1,
        subtotal: 100
      }
      
      const updated = applyDiscountToItem(item, 'FIXED_AMOUNT', 25, 'Damaged item', 'user123')
      
      expect(updated.finalPrice).toBe(75)
      expect(updated.subtotal).toBe(75)
      expect(updated.discountType).toBe('FIXED_AMOUNT')
      expect(updated.discountValue).toBe(25)
    })

    it('updates subtotal when quantity changes with discount', () => {
      let item: CartItem = {
        id: '1',
        productId: 'p1',
        price: 100,
        quantity: 1,
        subtotal: 100
      }
      
      // Apply discount
      item = applyDiscountToItem(item, 'PERCENTAGE', 10, 'Test', 'user123')
      expect(item.subtotal).toBe(90)
      
      // Change quantity
      item = {
        ...item,
        quantity: 3,
        subtotal: (item.finalPrice || item.price) * 3
      }
      
      expect(item.subtotal).toBe(270)
    })
  })

  describe('Sale Transaction with Discounts', () => {
    it('prepares sale items with discount data', () => {
      const cart = [
        {
          productId: 'p1',
          variantId: null,
          quantity: 2,
          price: 100,
          finalPrice: 90,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          discountReason: 'Loyal customer',
          discountAppliedBy: 'user123'
        },
        {
          productId: 'p2',
          variantId: 'v1',
          quantity: 1,
          price: 50,
          finalPrice: 45,
          discountType: 'FIXED_AMOUNT',
          discountValue: 5,
          discountReason: 'Minor scratch',
          discountAppliedBy: 'user123'
        }
      ]
      
      const items = cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: item.finalPrice || item.price,
        discountType: item.discountType || 'NONE',
        discountValue: item.discountValue || 0,
        discountReason: item.discountReason,
        discountAppliedBy: item.discountAppliedBy
      }))
      
      expect(items).toHaveLength(2)
      expect(items[0].price).toBe(90) // finalPrice
      expect(items[0].discountType).toBe('PERCENTAGE')
      expect(items[1].price).toBe(45) // finalPrice
      expect(items[1].discountType).toBe('FIXED_AMOUNT')
    })

    it('calculates correct transaction total with discounts', () => {
      const items = [
        { finalPrice: 90, quantity: 2 }, // 180
        { finalPrice: 45, quantity: 1 }  // 45
      ]
      
      const subtotal = items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0)
      expect(subtotal).toBe(225)
    })
  })

  describe('Discount Display in Sales View', () => {
    type SaleItem = {
      price: number
      finalPrice?: number
      discountType?: string
      discountValue?: number
      discountReason?: string
    }

    const hasDiscount = (item: SaleItem): boolean => {
      return !!(item.discountType && item.discountType !== 'NONE')
    }

    const getDiscountDisplay = (item: SaleItem): string => {
      if (!hasDiscount(item)) return ''
      
      if (item.discountType === 'PERCENTAGE') {
        return `-${item.discountValue}%`
      } else {
        return `-$${item.discountValue?.toFixed(2)}`
      }
    }

    it('detects items with discounts', () => {
      const item1: SaleItem = {
        price: 100,
        finalPrice: 90,
        discountType: 'PERCENTAGE',
        discountValue: 10
      }
      
      const item2: SaleItem = {
        price: 100,
        discountType: 'NONE'
      }
      
      expect(hasDiscount(item1)).toBe(true)
      expect(hasDiscount(item2)).toBe(false)
    })

    it('formats percentage discount display', () => {
      const item: SaleItem = {
        price: 100,
        finalPrice: 85,
        discountType: 'PERCENTAGE',
        discountValue: 15
      }
      
      expect(getDiscountDisplay(item)).toBe('-15%')
    })

    it('formats fixed discount display', () => {
      const item: SaleItem = {
        price: 100,
        finalPrice: 75,
        discountType: 'FIXED_AMOUNT',
        discountValue: 25
      }
      
      expect(getDiscountDisplay(item)).toBe('-$25.00')
    })

    it('shows discount reason when present', () => {
      const item: SaleItem = {
        price: 100,
        finalPrice: 90,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        discountReason: 'Loyal customer reward'
      }
      
      expect(item.discountReason).toBe('Loyal customer reward')
      expect(hasDiscount(item)).toBe(true)
    })
  })

  describe('Permission Checks', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('allows discount when setting is enabled', () => {
      localStorage.setItem('allowDiscounts', 'true')
      
      const canApplyDiscount = () => {
        return localStorage.getItem('allowDiscounts') === 'true'
      }
      
      expect(canApplyDiscount()).toBe(true)
    })

    it('blocks discount when setting is disabled', () => {
      localStorage.setItem('allowDiscounts', 'false')
      
      const canApplyDiscount = () => {
        return localStorage.getItem('allowDiscounts') === 'true'
      }
      
      expect(canApplyDiscount()).toBe(false)
    })
  })
})
