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
  notes?: string | null
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

/**
 * One editable line of the recipe (BOM) editor. Numeric inputs are held as
 * strings while the user types.
 */
export interface RecipeLineData {
  ingredientId: string
  quantity: string
  unit: string
  notes: string
}

/** What `RecipeEditorModal` hands to `useMenuManagement.saveRecipe`. */
export interface RecipeFormData {
  yieldCount: string
  prepNotes: string
  lines: RecipeLineData[]
}

export interface RestaurantIngredientData {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  minStockAlert: number
  costPerUnit: number
  supplierName?: string | null
  notes?: string | null
}

/**
 * What `MenuItemFormModal` hands to `useMenuManagement.saveItem`.
 *
 * Numeric inputs are held as strings while the user types, so the hook parses
 * them on save.
 */
export interface MenuItemFormData {
  name: string
  category: string
  description: string
  price: string
  cost: string
  preparationTime: string
  station: string
  colorTag: string
  notes: string
  modifierGroups: ModifierGroupData[]
}
