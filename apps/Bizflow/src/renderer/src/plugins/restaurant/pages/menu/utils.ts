// src/pages/menu/utils.ts
import { MenuItemData } from './types'

export interface FoodCostAnalysis {
  cost: number
  price: number
  profit: number
  costPercent: number
  marginPercent: number
  rating: 'high' | 'medium' | 'low' // high = < 30% cost, medium = 30-40%, low = > 40% (high expense)
}

export function analyzeDishFinancials(price: number, cost: number): FoodCostAnalysis {
  const safePrice = Number(price) || 0
  const safeCost = Number(cost) || 0
  const profit = Math.max(0, safePrice - safeCost)
  const costPercent = safePrice > 0 ? Math.round((safeCost / safePrice) * 100) : 0
  const marginPercent = safePrice > 0 ? Math.round((profit / safePrice) * 100) : 0

  let rating: 'high' | 'medium' | 'low' = 'high'
  if (costPercent > 40) rating = 'low'
  else if (costPercent > 30) rating = 'medium'

  return {
    cost: safeCost,
    price: safePrice,
    profit,
    costPercent,
    marginPercent,
    rating
  }
}

/**
 * Calculates how many portions of this dish can be made before running out of ingredients
 */
export function calculateAvailablePortions(item: MenuItemData): {
  availablePortions: number | null
  bottleneckIngredient: string | null
} {
  const recipe = item.recipe
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
    return { availablePortions: null, bottleneckIngredient: null }
  }

  let minPortions = Infinity
  let bottleneck = ''

  for (const ri of recipe.ingredients) {
    const rawStock = ri.ingredient?.currentStock || 0
    const qtyNeeded = ri.quantity / (recipe.yieldCount || 1)

    if (qtyNeeded <= 0) continue

    const portionsForThis = Math.floor(rawStock / qtyNeeded)
    if (portionsForThis < minPortions) {
      minPortions = portionsForThis
      bottleneck = ri.ingredient?.name || 'Raw Material'
    }
  }

  return {
    availablePortions: minPortions === Infinity ? null : Math.max(0, minPortions),
    bottleneckIngredient: bottleneck || null
  }
}

export function formatCurrency(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`
}