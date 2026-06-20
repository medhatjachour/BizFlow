/**
 * Smart unit conversion for the Bakery plugin.
 * Used wherever a quantity in one unit must be applied to a pantry store in another unit.
 */

const WEIGHT_TO_G: Record<string, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 }
const VOLUME_TO_ML: Record<string, number> = { ml: 1, L: 1000, tsp: 4.92892, tbsp: 14.7868, cup: 236.588 }

/**
 * Convert a quantity from one unit to another.
 * e.g. convertQuantity(500, 'g', 'kg') → 0.5
 * Returns null if units are incompatible (e.g. g → ml).
 */
export function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return quantity
  if (fromUnit in WEIGHT_TO_G && toUnit in WEIGHT_TO_G)
    return quantity * WEIGHT_TO_G[fromUnit] / WEIGHT_TO_G[toUnit]
  if (fromUnit in VOLUME_TO_ML && toUnit in VOLUME_TO_ML)
    return quantity * VOLUME_TO_ML[fromUnit] / VOLUME_TO_ML[toUnit]
  return null
}

/**
 * Convert a cost-per-unit from one unit to another.
 * e.g. convertCost(2, 'kg', 'g') → 0.002   ($2/kg = $0.002/g)
 * Returns null if units are incompatible.
 */
export function convertCost(cost: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return cost
  if (fromUnit in WEIGHT_TO_G && toUnit in WEIGHT_TO_G)
    return cost * WEIGHT_TO_G[toUnit] / WEIGHT_TO_G[fromUnit]
  if (fromUnit in VOLUME_TO_ML && toUnit in VOLUME_TO_ML)
    return cost * VOLUME_TO_ML[toUnit] / VOLUME_TO_ML[fromUnit]
  return null
}
