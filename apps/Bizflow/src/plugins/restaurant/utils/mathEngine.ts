// src/restaurant/utils/mathEngine.ts

import { roundMoney } from '../../../shared/restaurantUnits'

/**
 * Recalculates order subtotal, discount, tax, service charge, and grand total.
 */
export interface CalculationResult {
  subtotal: number
  discountValue: number
  discountedSubtotal: number
  tax: number
  serviceCharge: number
  total: number
}

export function computeOrderTotals(params: {
  items: Array<{ unitPrice: number; quantity: number; status: string; totalPrice?: number }>
  discountType?: 'percentage' | 'fixed' | null
  discountAmount?: number
  taxRate?: number
  serviceCharge?: number
}): CalculationResult {
  const activeItems = params.items.filter((i) => i.status !== 'voided')

  // 1. Gross Subtotal
  const subtotal = roundMoney(
    activeItems.reduce(
      (sum, item) =>
        sum + (item.totalPrice !== undefined ? item.totalPrice : item.unitPrice * item.quantity),
      0
    )
  )

  // 2. Discount
  let discountValue = 0
  if (params.discountType === 'percentage') {
    discountValue = roundMoney((subtotal * Number(params.discountAmount || 0)) / 100)
  } else if (params.discountType === 'fixed') {
    discountValue = roundMoney(Math.min(subtotal, Number(params.discountAmount || 0)))
  }

  const discountedSubtotal = Math.max(0, roundMoney(subtotal - discountValue))

  // 3. Tax & Service Charge (Compounded on Discounted Subtotal)
  const tax = roundMoney(discountedSubtotal * Number(params.taxRate || 0))
  const serviceCharge = roundMoney(discountedSubtotal * Number(params.serviceCharge || 0))

  // 4. Grand Total
  const total = roundMoney(discountedSubtotal + tax + serviceCharge)

  return {
    subtotal,
    discountValue,
    discountedSubtotal,
    tax,
    serviceCharge,
    total
  }
}

/**
 * Unit-of-measure arithmetic and recipe costing now live in `shared/` so the
 * renderer can price a dish with exactly the same rules the main process uses.
 * Re-exported here so every existing importer keeps working unchanged.
 */
export {
  roundMoney,
  UOM_CONVERSIONS,
  convertToBaseUnit,
  convertBetweenUnits,
  sameUnitFamily,
  computeRecipeLineCost,
  computeRecipeBatchCost,
  computePortionCost
} from '../../../shared/restaurantUnits'
