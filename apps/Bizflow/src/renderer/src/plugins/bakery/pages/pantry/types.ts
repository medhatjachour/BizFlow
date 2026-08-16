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

export type PantryFilterStatus = 'all' | 'low' | 'reorder' | 'healthy'

export interface PantryFormData {
  id?: string
  name: string
  currentStock: string | number
  unit: string
  costPerUnit: string | number
  lowStockThreshold: string | number
  reorderPoint: string | number
  reorderQuantity: string | number
  supplierName: string
  notes: string
}

export type AdjustStockMode = 'add' | 'remove' | 'set'

export interface BulkRestockItem {
  id: string
  name: string
  unit: string
  currentStock: number
  qty: string
  price: string
}