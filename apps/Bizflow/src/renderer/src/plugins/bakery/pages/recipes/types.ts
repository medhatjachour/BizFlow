export interface Ingredient {
  id?: string
  name: string
  quantity: number
  unit: string
  costPerUnit: number
  pantryIngredientId?: string | null
}

export interface Recipe {
  id: string
  name: string
  description?: string | null
  yieldQty: number
  yieldUnit: string
  sellingPrice?: number | null
  expiryDays?: number | null
  notes?: string | null
  outputProductId?: string | null
  outputProduct?: {
    id: string
    name: string
    basePrice: number
  } | null
  ingredients: Ingredient[]
  _count?: {
    productionBatches: number
  }
}

export interface PantryItem {
  id: string
  name: string
  unit: string
  costPerUnit: number
  currentStock: number
}

export interface RecipeFormData {
  id?: string
  name: string
  description: string
  yieldQty: number | string
  yieldUnit: string
  sellingPrice: number | string
  expiryDays: number | string
  notes: string
  ingredients: Array<{
    name: string
    quantity: number | string
    unit: string
    costPerUnit: number | string
    pantryIngredientId?: string
  }>
}