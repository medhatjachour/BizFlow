// Shared type and empty-form constant for the bakery PantryTab.

export interface PantryIngredient {
  id: string
  name: string
  currentStock: number
  unit: string
  costPerUnit: number
  lowStockThreshold: number | null
  reorderPoint: number | null
  reorderQuantity: number | null
  lastOrderedDate: string | null
  supplierName: string | null
  notes: string | null
  _count?: { recipeIngredients: number }
}

export const EMPTY_FORM = {
  id: undefined as string | undefined,
  name: '',
  currentStock: 0,
  unit: 'kg',
  costPerUnit: 0,
  lowStockThreshold: '' as string | number,
  reorderPoint: '' as string | number,
  reorderQuantity: '' as string | number,
  supplierName: '',
  notes: ''
}
