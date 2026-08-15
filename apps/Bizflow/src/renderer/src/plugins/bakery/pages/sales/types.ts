export interface Recipe {
  id: string
  name: string
  yieldUnit: string
  sellingPrice?: number | null
}

export interface Sale {
  id: string
  itemName: string
  quantity: number
  unitPrice: number
  totalAmount: number
  saleDate: string
  notes: string | null
  recipe: { id: string; name: string; yieldUnit: string; sellingPrice?: number | null } | null
  batch: { id: string; batchDate: string; unitsProduced: number } | null
}

export interface PagedSalesResult {
  data: Sale[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface RecipeSummaryItem {
  recipeId: string | null
  recipe: { id: string; name: string; yieldUnit: string } | null
  totalAmount: number
  quantity: number
  count: number
}

export interface SalesSummary {
  totalRevenue: number
  totalUnitsSold: number
  totalTransactions: number
  byRecipe: RecipeSummaryItem[]
}

export interface SellableBatch {
  id: string
  batchDate: string
  unitsProduced: number
  unitsSold: number
  unitsAvailable: number
  expiresAt: string | null
  recipe: {
    id: string
    name: string
    yieldQty: number
    yieldUnit: string
    sellingPrice?: number | null
    expiryDays: number | null
  }
}

export interface RecipeGroup {
  recipe: SellableBatch['recipe']
  batches: SellableBatch[]
  totalAvailable: number
  earliestExpiry: string | null
}

export type PosFilterType = '' | 'expiring' | 'noprice'
export type SalesSubTab = 'sell' | 'history'

export interface CustomSaleFormData {
  recipeId: string
  itemName: string
  quantity: string
  unitPrice: string
  saleDate: string
  notes: string
}