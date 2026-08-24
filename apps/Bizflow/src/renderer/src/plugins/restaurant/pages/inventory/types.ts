export interface IngredientData {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  minStockAlert: number
  costPerUnit: number
  supplierName?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface IngredientFormData {
  name: string
  category: string
  unit: string
  currentStock: string
  minStockAlert: string
  costPerUnit: string
  supplierName: string
  notes: string
}

export interface AdjustStockFormData {
  ingredientId: string
  type: 'restock' | 'manual_adjustment'
  quantity: string
  unitCost?: string
  notes: string
}