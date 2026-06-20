import { describe, it, expect } from 'vitest'
import {
  calculateRefundedAmount,
  calculateNetRevenue,
  isItemRefunded,
  calculateNetQuantity,
  type RefundableItem
} from '../../../shared/utils/refundCalculations'

describe('refundCalculations', () => {
  describe('calculateRefundedAmount', () => {
    it('should return 0 for empty items array', () => {
      const result = calculateRefundedAmount([])
      expect(result).toBe(0)
    })

    it('should return 0 when no items have refunded quantities', () => {
      const items: RefundableItem[] = [
        { price: 100 },
        { price: 200, refundedQuantity: 0 }
      ]
      const result = calculateRefundedAmount(items)
      expect(result).toBe(0)
    })

    it('should calculate refunded amount using price when finalPrice is not provided', () => {
      const items: RefundableItem[] = [
        { price: 100, refundedQuantity: 2 },
        { price: 50, refundedQuantity: 1 }
      ]
      const result = calculateRefundedAmount(items)
      expect(result).toBe(250) // (100 * 2) + (50 * 1)
    })

    it('should calculate refunded amount using finalPrice when provided', () => {
      const items: RefundableItem[] = [
        { price: 100, finalPrice: 90, refundedQuantity: 2 },
        { price: 50, finalPrice: 45, refundedQuantity: 1 }
      ]
      const result = calculateRefundedAmount(items)
      expect(result).toBe(225) // (90 * 2) + (45 * 1)
    })

    it('should handle mixed items with and without finalPrice', () => {
      const items: RefundableItem[] = [
        { price: 100, finalPrice: 90, refundedQuantity: 1 },
        { price: 50, refundedQuantity: 2 }
      ]
      const result = calculateRefundedAmount(items)
      expect(result).toBe(190) // (90 * 1) + (50 * 2)
    })

    it('should handle decimal prices', () => {
      const items: RefundableItem[] = [
        { price: 99.99, refundedQuantity: 1 },
        { price: 49.50, refundedQuantity: 2 }
      ]
      const result = calculateRefundedAmount(items)
      expect(result).toBe(198.99) // 99.99 + (49.50 * 2)
    })

    it('should handle large numbers', () => {
      const items: RefundableItem[] = [
        { price: 1000000, refundedQuantity: 1 },
        { price: 500000, refundedQuantity: 2 }
      ]
      const result = calculateRefundedAmount(items)
      expect(result).toBe(2000000) // 1000000 + (500000 * 2)
    })
  })

  describe('calculateNetRevenue', () => {
    it('should calculate net revenue when no refunds', () => {
      const items: RefundableItem[] = [
        { price: 100 },
        { price: 200 }
      ]
      const result = calculateNetRevenue(300, items)
      expect(result).toBe(300)
    })

    it('should calculate net revenue after refunds', () => {
      const items: RefundableItem[] = [
        { price: 100, refundedQuantity: 1 },
        { price: 200, refundedQuantity: 1 }
      ]
      const result = calculateNetRevenue(300, items)
      expect(result).toBe(0) // 300 - (100 + 200)
    })

    it('should handle partial refunds', () => {
      const items: RefundableItem[] = [
        { price: 100, refundedQuantity: 0.5 },
        { price: 200, refundedQuantity: 1 }
      ]
      const result = calculateNetRevenue(300, items)
      expect(result).toBe(50) // 300 - (50 + 200)
    })

    it('should use finalPrice for refund calculations', () => {
      const items: RefundableItem[] = [
        { price: 100, finalPrice: 90, refundedQuantity: 1 }
      ]
      const result = calculateNetRevenue(100, items)
      expect(result).toBe(10) // 100 - 90
    })

    it('should handle empty items array', () => {
      const result = calculateNetRevenue(500, [])
      expect(result).toBe(500)
    })
  })

  describe('isItemRefunded', () => {
    it('should return false for undefined refundedQuantity', () => {
      const result = isItemRefunded({})
      expect(result).toBe(false)
    })

    it('should return false for zero refundedQuantity', () => {
      const result = isItemRefunded({ refundedQuantity: 0 })
      expect(result).toBe(false)
    })

    it('should return true for positive refundedQuantity', () => {
      const result = isItemRefunded({ refundedQuantity: 1 })
      expect(result).toBe(true)
    })

    it('should return true for decimal refundedQuantity', () => {
      const result = isItemRefunded({ refundedQuantity: 0.5 })
      expect(result).toBe(true)
    })

    it('should return false for negative refundedQuantity (edge case)', () => {
      const result = isItemRefunded({ refundedQuantity: -1 })
      expect(result).toBe(false)
    })
  })

  describe('calculateNetQuantity', () => {
    it('should return original quantity when no refunds', () => {
      const result = calculateNetQuantity(10, undefined)
      expect(result).toBe(10)
    })

    it('should return original quantity when refundedQuantity is 0', () => {
      const result = calculateNetQuantity(10, 0)
      expect(result).toBe(10)
    })

    it('should calculate net quantity after full refund', () => {
      const result = calculateNetQuantity(10, 10)
      expect(result).toBe(0)
    })

    it('should calculate net quantity after partial refund', () => {
      const result = calculateNetQuantity(10, 3)
      expect(result).toBe(7)
    })

    it('should handle decimal quantities', () => {
      const result = calculateNetQuantity(10.5, 2.5)
      expect(result).toBe(8)
    })

    it('should handle negative refundedQuantity (edge case)', () => {
      const result = calculateNetQuantity(10, -2)
      expect(result).toBe(12)
    })

    it('should handle zero original quantity', () => {
      const result = calculateNetQuantity(0, 5)
      expect(result).toBe(-5)
    })

    it('should handle large numbers', () => {
      const result = calculateNetQuantity(1000000, 500000)
      expect(result).toBe(500000)
    })
  })

  describe('integration tests', () => {
    it('should work together for a complete refund scenario', () => {
      const items: RefundableItem[] = [
        { price: 100, refundedQuantity: 2 }, // 2 items refunded at $100 each
        { price: 50, refundedQuantity: 1 },  // 1 item refunded at $50
        { price: 75, refundedQuantity: 0 }   // No refund
      ]

      const totalRevenue = 450 // 2*100 + 1*50 + 1*75
      const refundedAmount = calculateRefundedAmount(items) // Should be 250
      const netRevenue = calculateNetRevenue(totalRevenue, items) // Should be 200

      expect(refundedAmount).toBe(250)
      expect(netRevenue).toBe(200)

      // Check individual items
      expect(isItemRefunded(items[0])).toBe(true)  // refundedQuantity: 2
      expect(isItemRefunded(items[1])).toBe(true)  // refundedQuantity: 1
      expect(isItemRefunded(items[2])).toBe(false) // refundedQuantity: 0

      // Check net quantities
      expect(calculateNetQuantity(5, items[0].refundedQuantity)).toBe(3) // 5 - 2
      expect(calculateNetQuantity(3, items[1].refundedQuantity)).toBe(2) // 3 - 1
      expect(calculateNetQuantity(2, items[2].refundedQuantity)).toBe(2) // 2 - 0
    })

    it('should handle complex pricing with discounts', () => {
      const items: RefundableItem[] = [
        { price: 100, finalPrice: 80, refundedQuantity: 1 }, // Discounted item refunded
        { price: 50, finalPrice: 45, refundedQuantity: 2 }   // Two discounted items refunded
      ]

      const originalTotal = 200 // 100 + 50*2
      const discountedTotal = 170 // 80 + 45*2

      const refundedAmount = calculateRefundedAmount(items) // Should use finalPrice
      const netRevenue = calculateNetRevenue(discountedTotal, items)

      expect(refundedAmount).toBe(170) // 80 + 90 = 170
      expect(netRevenue).toBe(0) // 170 - 170
    })
  })
})