// src/restaurant/utils/mathEngine.ts

/**
 * Standard monetary 2-decimal precision rounder to prevent float leaks
 */
export function roundMoney(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100
}

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
      (sum, item) => sum + (item.totalPrice !== undefined ? item.totalPrice : item.unitPrice * item.quantity),
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
 * Unit of Measure (UOM) Normalization Engine
 * Normalizes input quantities to standard base units:
 * Mass -> Grams (g)
 * Volume -> Milliliters (ml)
 * Discrete -> Pieces (pcs), Cans (can), Bottles (bottle)
 */
export const UOM_CONVERSIONS: Record<string, { baseUnit: string; multiplier: number }> = {
  // Mass
  kg: { baseUnit: 'g', multiplier: 1000 },
  g: { baseUnit: 'g', multiplier: 1 },
  mg: { baseUnit: 'g', multiplier: 0.001 },
  oz: { baseUnit: 'g', multiplier: 28.3495 },
  lb: { baseUnit: 'g', multiplier: 453.592 },

  // Volume
  l: { baseUnit: 'ml', multiplier: 1000 },
  L: { baseUnit: 'ml', multiplier: 1000 },
  ml: { baseUnit: 'ml', multiplier: 1 },
  cl: { baseUnit: 'ml', multiplier: 10 },
  floz: { baseUnit: 'ml', multiplier: 29.5735 },

  // Units
  pcs: { baseUnit: 'pcs', multiplier: 1 },
  can: { baseUnit: 'can', multiplier: 1 },
  bottle: { baseUnit: 'bottle', multiplier: 1 }
}

export function convertToBaseUnit(qty: number, unit: string): { normalizedQty: number; baseUnit: string } {
  const normKey = unit.trim().toLowerCase()
  const config = UOM_CONVERSIONS[normKey] || UOM_CONVERSIONS[unit]

  if (!config) {
    return { normalizedQty: qty, baseUnit: unit }
  }

  return {
    normalizedQty: qty * config.multiplier,
    baseUnit: config.baseUnit
  }
}