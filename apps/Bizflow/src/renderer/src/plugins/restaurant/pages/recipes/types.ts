
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
  }
}

export interface MenuItemRecipeData {
  id: string
  menuItemId: string
  yieldCount: number
  prepNotes?: string | null
  menuItem?: {
    id: string
    name: string
    category: string
    price: number
    cost: number
  }
  ingredients: RecipeIngredientItem[]
}

export interface RecipeFormData {
  menuItemId: string
  yieldCount: number
  prepNotes: string
  ingredients: Array<{
    ingredientId: string
    quantity: number
    unit: string
    notes?: string
  }>
}