// src/pages/menu/types.ts

export interface ModifierOptionData {
  id?: string
  name: string
  priceDelta: number
}

export interface ModifierGroupData {
  id?: string
  title: string
  minSelect: number
  maxSelect: number
  options: ModifierOptionData[]
}

export interface RecipeIngredientItem {
  id?: string
  ingredientId: string
  quantity: number
  unit: string
  ingredient?: {
    id: string
    name: string
    unit: string
    costPerUnit: number
    currentStock: number
    minStockAlert: number
  }
}

export interface MenuItemRecipeData {
  id?: string
  menuItemId?: string
  yieldCount: number
  prepNotes?: string | null
  ingredients: RecipeIngredientItem[]
}

export interface MenuItemData {
  id: string
  name: string
  category: string
  description?: string | null
  price: number
  cost: number
  taxRate?: number
  preparationTime: number
  station: string
  isAvailable: boolean
  displayOrder: number
  colorTag?: string | null
  notes?: string | null
  modifierGroups?: ModifierGroupData[]
  recipe?: MenuItemRecipeData | null
  createdAt: string
  updatedAt: string
}