import { WEIGHT_TO_G, VOLUME_TO_ML } from './constants'
import { Recipe } from './types'

export function formatCurrency(amount: number): string {
  return (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatNumber(num: number, decimals = 2): string {
  return (num || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

/**
 * Convert a cost-per-unit from one unit to another.
 * e.g. convertCost(2, 'kg', 'g') → 0.002 ($2/kg = $0.002/g)
 */
export function convertCost(cost: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return cost
  if (fromUnit in WEIGHT_TO_G && toUnit in WEIGHT_TO_G) {
    return (cost * WEIGHT_TO_G[toUnit]) / WEIGHT_TO_G[fromUnit]
  }
  if (fromUnit in VOLUME_TO_ML && toUnit in VOLUME_TO_ML) {
    return (cost * VOLUME_TO_ML[toUnit]) / VOLUME_TO_ML[fromUnit]
  }
  return null
}

export function calculateBatchCost(recipe: Recipe): number {
  return recipe.ingredients.reduce(
    (sum, ing) => sum + (Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0),
    0
  )
}

export function calculateCostPerUnit(recipe: Recipe): number {
  const batchCost = calculateBatchCost(recipe)
  return recipe.yieldQty > 0 ? batchCost / recipe.yieldQty : 0
}

export function calculateMargin(
  sellingPrice: number | null | undefined,
  costPerUnit: number
): number | null {
  if (!sellingPrice || sellingPrice <= 0 || costPerUnit <= 0) return null
  return ((sellingPrice - costPerUnit) / sellingPrice) * 100
}

export function getMarginBadgeClass(margin: number | null): string {
  if (margin === null) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  if (margin < 0) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
  if (margin < 20) return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800'
  if (margin < 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
}