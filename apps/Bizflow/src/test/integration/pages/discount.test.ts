/**
 * Unit tests for discount calculation functions
 */

import { describe, it, expect } from 'vitest'

// Test discount calculation logic
describe('Discount Calculations', () => {
  const calculateFinalPrice = (price: number, type: string, value: number): number => {
    if (type === 'PERCENTAGE') {
      return price - (price * value / 100)
    } else if (type === 'FIXED_AMOUNT') {
      return Math.max(0, price - value)
    }
    return price
  }

  describe('Percentage Discount', () => {
    it('calculates 10% discount correctly', () => {
      const result = calculateFinalPrice(100, 'PERCENTAGE', 10)
      expect(result).toBe(90)
    })

    it('calculates 50% discount correctly', () => {
      const result = calculateFinalPrice(100, 'PERCENTAGE', 50)
      expect(result).toBe(50)
    })

    it('calculates 25% discount on $80 correctly', () => {
      const result = calculateFinalPrice(80, 'PERCENTAGE', 25)
      expect(result).toBe(60)
    })

    it('calculates 15% discount with decimals', () => {
      const result = calculateFinalPrice(99.99, 'PERCENTAGE', 15)
      expect(result).toBeCloseTo(84.99, 2)
    })

    it('handles 0% discount', () => {
      const result = calculateFinalPrice(100, 'PERCENTAGE', 0)
      expect(result).toBe(100)
    })

    it('handles 100% discount', () => {
      const result = calculateFinalPrice(100, 'PERCENTAGE', 100)
      expect(result).toBe(0)
    })
  })

  describe('Fixed Amount Discount', () => {
    it('calculates $10 discount correctly', () => {
      const result = calculateFinalPrice(100, 'FIXED_AMOUNT', 10)
      expect(result).toBe(90)
    })

    it('calculates $50 discount correctly', () => {
      const result = calculateFinalPrice(100, 'FIXED_AMOUNT', 50)
      expect(result).toBe(50)
    })

    it('calculates $25 discount on $80 correctly', () => {
      const result = calculateFinalPrice(80, 'FIXED_AMOUNT', 25)
      expect(result).toBe(55)
    })

    it('handles discount with decimals', () => {
      const result = calculateFinalPrice(99.99, 'FIXED_AMOUNT', 15.50)
      expect(result).toBeCloseTo(84.49, 2)
    })

    it('handles $0 discount', () => {
      const result = calculateFinalPrice(100, 'FIXED_AMOUNT', 0)
      expect(result).toBe(100)
    })

    it('prevents negative price (discount > price)', () => {
      const result = calculateFinalPrice(50, 'FIXED_AMOUNT', 60)
      expect(result).toBe(0)
    })

    it('handles exact price discount', () => {
      const result = calculateFinalPrice(100, 'FIXED_AMOUNT', 100)
      expect(result).toBe(0)
    })
  })

  describe('No Discount', () => {
    it('returns original price when type is NONE', () => {
      const result = calculateFinalPrice(100, 'NONE', 0)
      expect(result).toBe(100)
    })

    it('returns original price for unknown type', () => {
      const result = calculateFinalPrice(100, 'INVALID', 10)
      expect(result).toBe(100)
    })
  })

  describe('Edge Cases', () => {
    it('handles very small prices', () => {
      const result = calculateFinalPrice(0.01, 'PERCENTAGE', 50)
      expect(result).toBeCloseTo(0.005, 3)
    })

    it('handles very large prices', () => {
      const result = calculateFinalPrice(10000, 'PERCENTAGE', 20)
      expect(result).toBe(8000)
    })

    it('handles very small percentage', () => {
      const result = calculateFinalPrice(100, 'PERCENTAGE', 0.5)
      expect(result).toBe(99.5)
    })

    it('handles negative discount value (should not happen)', () => {
      const result = calculateFinalPrice(100, 'PERCENTAGE', -10)
      expect(result).toBe(110) // Actually increases price
    })
  })
})

describe('Discount Validation', () => {
  const validateDiscount = (
    value: number,
    type: 'PERCENTAGE' | 'FIXED_AMOUNT',
    originalPrice: number,
    maxPercentage: number,
    maxAmount: number,
    requireReason: boolean,
    reason: string
  ): { valid: boolean; error?: string } => {
    if (value <= 0) {
      return { valid: false, error: 'Discount must be greater than 0' }
    }

    if (type === 'PERCENTAGE') {
      if (value > maxPercentage) {
        return { valid: false, error: `Discount cannot exceed ${maxPercentage}%` }
      }
    } else {
      if (value > maxAmount) {
        return { valid: false, error: `Discount cannot exceed $${maxAmount.toFixed(2)}` }
      }
      if (value >= originalPrice) {
        return { valid: false, error: 'Discount cannot be greater than or equal to the price' }
      }
    }

    if (requireReason && !reason.trim()) {
      return { valid: false, error: 'Please provide a reason for the discount' }
    }

    return { valid: true }
  }

  describe('Percentage Validation', () => {
    it('accepts valid percentage within limit', () => {
      const result = validateDiscount(25, 'PERCENTAGE', 100, 50, 100, false, '')
      expect(result.valid).toBe(true)
    })

    it('rejects percentage exceeding max', () => {
      const result = validateDiscount(60, 'PERCENTAGE', 100, 50, 100, false, '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Discount cannot exceed 50%')
    })

    it('rejects zero percentage', () => {
      const result = validateDiscount(0, 'PERCENTAGE', 100, 50, 100, false, '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Discount must be greater than 0')
    })

    it('accepts max percentage exactly', () => {
      const result = validateDiscount(50, 'PERCENTAGE', 100, 50, 100, false, '')
      expect(result.valid).toBe(true)
    })
  })

  describe('Fixed Amount Validation', () => {
    it('accepts valid amount within limit', () => {
      const result = validateDiscount(50, 'FIXED_AMOUNT', 100, 50, 100, false, '')
      expect(result.valid).toBe(true)
    })

    it('rejects amount exceeding max', () => {
      const result = validateDiscount(150, 'FIXED_AMOUNT', 200, 50, 100, false, '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Discount cannot exceed $100.00')
    })

    it('rejects amount equal to price', () => {
      const result = validateDiscount(100, 'FIXED_AMOUNT', 100, 50, 100, false, '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Discount cannot be greater than or equal to the price')
    })

    it('rejects amount greater than price', () => {
      const result = validateDiscount(150, 'FIXED_AMOUNT', 100, 50, 200, false, '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Discount cannot be greater than or equal to the price')
    })

    it('rejects zero amount', () => {
      const result = validateDiscount(0, 'FIXED_AMOUNT', 100, 50, 100, false, '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Discount must be greater than 0')
    })
  })

  describe('Reason Validation', () => {
    it('accepts valid discount with reason when required', () => {
      const result = validateDiscount(10, 'PERCENTAGE', 100, 50, 100, true, 'Loyal customer')
      expect(result.valid).toBe(true)
    })

    it('rejects discount without reason when required', () => {
      const result = validateDiscount(10, 'PERCENTAGE', 100, 50, 100, true, '')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Please provide a reason for the discount')
    })

    it('rejects discount with whitespace-only reason when required', () => {
      const result = validateDiscount(10, 'PERCENTAGE', 100, 50, 100, true, '   ')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Please provide a reason for the discount')
    })

    it('accepts discount without reason when not required', () => {
      const result = validateDiscount(10, 'PERCENTAGE', 100, 50, 100, false, '')
      expect(result.valid).toBe(true)
    })
  })
})

describe('Cart Subtotal Calculations with Discounts', () => {
  type CartItem = {
    price: number
    quantity: number
    finalPrice?: number
  }

  const calculateSubtotal = (cart: CartItem[]): number => {
    return cart.reduce((sum, item) => {
      const priceToUse = item.finalPrice || item.price
      return sum + (priceToUse * item.quantity)
    }, 0)
  }

  it('calculates subtotal without discounts', () => {
    const cart: CartItem[] = [
      { price: 50, quantity: 2 },
      { price: 30, quantity: 1 }
    ]
    expect(calculateSubtotal(cart)).toBe(130)
  })

  it('calculates subtotal with percentage discount', () => {
    const cart: CartItem[] = [
      { price: 100, quantity: 1, finalPrice: 90 }, // 10% off
      { price: 50, quantity: 2 }
    ]
    expect(calculateSubtotal(cart)).toBe(190)
  })

  it('calculates subtotal with fixed discount', () => {
    const cart: CartItem[] = [
      { price: 100, quantity: 1, finalPrice: 85 }, // $15 off
      { price: 50, quantity: 1, finalPrice: 40 } // $10 off
    ]
    expect(calculateSubtotal(cart)).toBe(125)
  })

  it('calculates subtotal with mixed items', () => {
    const cart: CartItem[] = [
      { price: 100, quantity: 2, finalPrice: 90 }, // 10% off, qty 2
      { price: 50, quantity: 1 }, // no discount
      { price: 80, quantity: 3, finalPrice: 70 } // $10 off, qty 3
    ]
    expect(calculateSubtotal(cart)).toBe(180 + 50 + 210)
  })

  it('handles empty cart', () => {
    const cart: CartItem[] = []
    expect(calculateSubtotal(cart)).toBe(0)
  })

  it('handles quantity changes with discounts', () => {
    const cart: CartItem[] = [
      { price: 100, quantity: 5, finalPrice: 80 } // $20 off per item
    ]
    expect(calculateSubtotal(cart)).toBe(400)
  })
})
