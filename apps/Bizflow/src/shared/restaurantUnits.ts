/**
 * Unit-of-measure arithmetic and recipe costing, shared verbatim by the main
 * process and the renderer.
 *
 * These rules used to exist only in the main process, so the recipe builder kept
 * its own naive `quantity × costPerUnit` preview and disagreed with the cost the
 * backend actually persisted to the dish. Anything that prices food must go
 * through this module: one unit table, one rounding rule, one answer.
 */

/** Standard monetary 2-decimal precision rounder to prevent float leaks */
export function roundMoney(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100
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
 * True when two units measure the same physical quantity, so a figure can be
 * rewritten from one into the other without inventing a number.
 *
 * This is the guard callers need before they reinterpret stored values: a
 * `convertBetweenUnits` that silently returns its input because the families
 * differ would corrupt the record rather than fail loudly.
 */
export function sameUnitFamily(a: string, b: string): boolean {
  return convertToBaseUnit(1, a).baseUnit === convertToBaseUnit(1, b).baseUnit
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
