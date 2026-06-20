/**
 * Refund Calculation Utilities
 * Shared functions for calculating refunded amounts across the application
 */

export interface RefundableItem {
  refundedQuantity?: number
  price: number
  finalPrice?: number
}

/**
 * Calculate the total refunded amount from a list of items
 * @param items Array of items with refundedQuantity and price
 * @returns Total refunded amount
 */
export function calculateRefundedAmount(items: RefundableItem[]): number {
  return items.reduce((sum, item) => {
    const refundedQty = item.refundedQuantity || 0
    return sum + (refundedQty * (item.finalPrice || item.price))
  }, 0)
}

/**
 * Calculate net revenue (total - refunded amount)
 * @param total The total transaction amount
 * @param items Array of items with refundedQuantity and price
 * @returns Net revenue after refunds
 */
export function calculateNetRevenue(total: number, items: RefundableItem[]): number {
  const refundedAmount = calculateRefundedAmount(items)
  return total - refundedAmount
}

/**
 * Check if an item has been refunded (partially or fully)
 * @param item Item with refundedQuantity
 * @returns True if the item has any refunded quantity
 */
export function isItemRefunded(item: { refundedQuantity?: number }): boolean {
  return (item.refundedQuantity || 0) > 0
}

/**
 * Calculate the net quantity (original - refunded)
 * @param quantity Original quantity
 * @param refundedQuantity Refunded quantity
 * @returns Net quantity remaining
 */
export function calculateNetQuantity(quantity: number, refundedQuantity?: number): number {
  return quantity - (refundedQuantity || 0)
}
