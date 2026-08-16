export const YIELD_UNITS = [
  'pcs',
  'loaves',
  'kg',
  'g',
  'dozen',
  'trays',
  'units',
  'portions',
  'boxes',
  'bags',
  'slices',
  'rolls',
  'buns',
  'sheets',
  'cakes',
]

export const INGREDIENT_UNITS = [
  'g',
  'kg',
  'ml',
  'L',
  'oz',
  'lb',
  'pcs',
  'tsp',
  'tbsp',
  'cup',
  'bunch',
  'clove',
  'pinch',
  'stalk',
  'sheet',
  'slice',
]

export const SCALING_PRESETS = [0.5, 1, 2, 3, 5, 10]

export const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
}

export const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  L: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
}