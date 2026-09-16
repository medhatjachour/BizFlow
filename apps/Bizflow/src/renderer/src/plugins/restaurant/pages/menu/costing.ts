// src/pages/menu/costing.ts
//
// Live cost preview for the recipe (BOM) editor.
//
// The authoritative numbers are produced in the main process by
// `plugins/restaurant/utils/mathEngine.ts` when a recipe is saved; this module
// mirrors that maths so the editor can show the portion cost before saving.
// `src/test/unit/restaurantRecipeCosting.test.ts` asserts the two agree.

import { RecipeLineData } from './types'

/** Base-unit multipliers, mirroring `UOM_CONVERSIONS` in the main engine. */
const UOM_FACTORS: Record<string, { baseUnit: string; multiplier: number }> = {
  kg: { baseUnit: 'g', multiplier: 1000 },
  g: { baseUnit: 'g', multiplier: 1 },
  mg: { baseUnit: 'g', multiplier: 0.001 },
  oz: { baseUnit: 'g', multiplier: 28.3495 },
  lb: { baseUnit: 'g', multiplier: 453.592 },
  l: { baseUnit: 'ml', multiplier: 1000 },
  ml: { baseUnit: 'ml', multiplier: 1 },
  cl: { baseUnit: 'ml', multiplier: 10 },
  floz: { baseUnit: 'ml', multiplier: 29.5735 },
  pcs: { baseUnit: 'pcs', multiplier: 1 },
  can: { baseUnit: 'can', multiplier: 1 },
  bottle: { baseUnit: 'bottle', multiplier: 1 }
}

/** Units offered in the recipe editor, grouped for the picker. */
export const RECIPE_UNITS = [
  'g',
  'kg',
  'mg',
  'oz',
  'lb',
  'ml',
  'l',
  'cl',
  'floz',
  'pcs',
  'can',
  'bottle'
]

export function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

/**
 * Rewrites a quantity from one unit into another. Unrelated families (grams vs
 * millilitres) and unknown units are returned unchanged rather than guessed at.
 */
export function convertBetweenUnits(qty: number, fromUnit: string, toUnit: string): number {
  const value = Number(qty) || 0
  const from =
    UOM_FACTORS[
      String(fromUnit || '')
        .trim()
        .toLowerCase()
    ]
  const to =
    UOM_FACTORS[
      String(toUnit || '')
        .trim()
        .toLowerCase()
    ]

  if (!from || !to || from.baseUnit !== to.baseUnit) return value

  return (value * from.multiplier) / to.multiplier
}

export interface DishCostPreview {
  batchCost: number
  portionCost: number
  /** True when at least one line could not be costed (no price or no ingredient). */
  incomplete: boolean
}

/**
 * Cost of a single line, priced against the ingredient's own unit. Mirrors
 * `computeRecipeLineCost` in the main engine.
 */
export function computeLineCost(
  quantity: number | string,
  lineUnit: string,
  ingredientUnit: string,
  costPerUnit: number
): number {
  return roundMoney(
    convertBetweenUnits(Number(quantity) || 0, lineUnit, ingredientUnit) *
      (Number(costPerUnit) || 0)
  )
}

/**
 * Batch + per-portion cost for the current editor state.
 *
 * `ingredients` is keyed by id so a line whose ingredient was deleted (or never
 * picked) is reported instead of silently costing nothing.
 */
export function computeDishCost(
  lines: RecipeLineData[],
  yieldCount: number,
  ingredients: Record<string, { unit: string; costPerUnit: number }>
): DishCostPreview {
  let batchCost = 0
  let incomplete = false

  for (const line of lines) {
    const ingredient = line.ingredientId ? ingredients[line.ingredientId] : undefined
    const quantity = Number(line.quantity)

    if (!ingredient || !quantity) {
      incomplete = true
      continue
    }

    // Each line is rounded before summing so this matches `computeRecipeBatchCost`
    // in the main engine exactly rather than to within a cent.
    batchCost += computeLineCost(quantity, line.unit, ingredient.unit, ingredient.costPerUnit)
  }

  const safeYield = Number(yieldCount) > 0 ? Number(yieldCount) : 1
  const batch = roundMoney(batchCost)

  return {
    batchCost: batch,
    // Divided from the *rounded* batch so this matches `computePortionCost` exactly.
    portionCost: roundMoney(batch / safeYield),
    incomplete
  }
}
