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

export function convertToBaseUnit(
  qty: number,
  unit: string
): { normalizedQty: number; baseUnit: string } {
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

/**
 * Rewrites a quantity expressed in `fromUnit` into `toUnit`.
 *
 * Returns the input unchanged when the two units belong to different families
 * (mass vs volume) or are unknown, because there is no correct answer there and
 * a silent nonsense number would be worse than the raw figure.
 */
export function convertBetweenUnits(qty: number, fromUnit: string, toUnit: string): number {
  const value = Number(qty) || 0
  const from = convertToBaseUnit(value, fromUnit)
  const to = convertToBaseUnit(1, toUnit)

  if (from.baseUnit !== to.baseUnit || !to.normalizedQty) return value

  return from.normalizedQty / to.normalizedQty
}

/**
 * Cost of a single recipe line.
 *
 * `costPerUnit` is priced per the *ingredient's own* unit, so a line written in a
 * different unit has to be converted before multiplying. A recipe that calls for
 * 200 g of an ingredient priced per kg costs 0.2 × price, not 200 × price.
 */
export function computeRecipeLineCost(
  quantity: number,
  lineUnit: string,
  ingredientUnit: string,
  costPerUnit: number
): number {
  return roundMoney(
    convertBetweenUnits(quantity, lineUnit, ingredientUnit) * (Number(costPerUnit) || 0)
  )
}

/**
 * Total ingredient cost of one batch, from recipe lines joined to their ingredient.
 */
export function computeRecipeBatchCost(
  lines: Array<{
    quantity: number
    unit: string
    ingredient?: { unit?: string | null; costPerUnit?: number | null } | null
  }>
): number {
  return roundMoney(
    lines.reduce(
      (sum, line) =>
        sum +
        computeRecipeLineCost(
          line.quantity,
          line.unit,
          line.ingredient?.unit || line.unit,
          line.ingredient?.costPerUnit || 0
        ),
      0
    )
  )
}

/**
 * Per-portion (dish) cost. A batch that yields nothing is treated as one portion.
 */
export function computePortionCost(batchCost: number, yieldCount: number): number {
  const yield_ = Number(yieldCount) > 0 ? Number(yieldCount) : 1
  return roundMoney((Number(batchCost) || 0) / yield_)
}
