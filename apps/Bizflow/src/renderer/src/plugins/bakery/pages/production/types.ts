export interface Recipe {
  id: string
  name: string
  yieldQty: number
  yieldUnit: string
  sellingPrice?: number | null
}

export interface ProductionBatch {
  id: string
  recipeId: string
  batchDate: string
  quantity: number
  unitsProduced: number
  unitsSold: number
  unitsLost: number
  unitsAvailable: number
  totalCost: number
  expiresAt: string | null
  notes?: string | null
  recipe: {
    id: string
    name: string
    yieldUnit: string
    sellingPrice?: number | null
  }
}

export interface AvailableBatchCapacity {
  recipeId: string
  recipeName: string
  yieldQty: number
  yieldUnit: string
  availableBatches: number | null
  expectedUnits: number | null
  limitedBy: string | null
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
    pantryStock: number | null
    pantryUnit: string | null
    maxBatches: number | null
  }>
}

export interface PagedBatchesResult {
  data: ProductionBatch[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface IngredientRequirement {
  ingredientId: string
  name: string
  needed: number
  unit: string
  currentStock: number | null
  remaining: number | null
  status: 'ok' | 'low' | 'empty' | 'unlinked'
  pantryLinked: boolean
}

export interface ProductionRequirementsResult {
  requirements: IngredientRequirement[]
  recipeName: string
}

export type LossReason = 'expired' | 'shrinkage' | 'damaged' | 'other'