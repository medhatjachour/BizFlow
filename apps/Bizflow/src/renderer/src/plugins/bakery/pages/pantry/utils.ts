import { PantryIngredient } from './types'

export function formatCurrency(amount: number): string {
  return (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatQuantity(qty: number, unit?: string): string {
  const formatted = (qty || 0).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })
  return unit ? `${formatted} ${unit}` : formatted
}

export function isLowStock(item: PantryIngredient): boolean {
  return (
    item.lowStockThreshold !== null &&
    item.lowStockThreshold > 0 &&
    item.currentStock <= item.lowStockThreshold
  )
}

export function needsReorder(item: PantryIngredient): boolean {
  return item.reorderPoint !== null && item.currentStock <= item.reorderPoint
}

export function getStockStatus(item: PantryIngredient): 'low' | 'reorder' | 'healthy' {
  if (isLowStock(item)) return 'low'
  if (needsReorder(item)) return 'reorder'
  return 'healthy'
}