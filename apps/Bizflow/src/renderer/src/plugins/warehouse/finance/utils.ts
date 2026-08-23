import { FinanceStockItem, LocationQtyMetric, CriticalImpactItem } from './types'

export function computeLocationBreakdown(stockItems: FinanceStockItem[]): LocationQtyMetric[] {
  const map = new Map<string, { quantity: number; skuCount: number; code?: string; estimatedValue: number }>()

  let totalQty = 0

  stockItems.forEach(item => {
    const locName = item.location?.name || 'Unassigned Facility'
    const locCode = item.location?.code
    const qty = Number(item.quantity || 0)
    const unitCost = Number(item.product?.baseCost || item.unitCost || 0)
    const val = qty * unitCost

    totalQty += qty

    const current = map.get(locName) || { quantity: 0, skuCount: 0, code: locCode, estimatedValue: 0 }
    map.set(locName, {
      quantity: current.quantity + qty,
      skuCount: current.skuCount + 1,
      code: locCode || current.code,
      estimatedValue: current.estimatedValue + val
    })
  })

  const safeTotal = Math.max(totalQty, 1)

  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      code: data.code,
      quantity: data.quantity,
      skuCount: data.skuCount,
      percentage: Number(((data.quantity / safeTotal) * 100).toFixed(1)),
      estimatedValue: data.estimatedValue
    }))
    .sort((a, b) => b.quantity - a.quantity)
}

export function computeCriticalImpacts(items: FinanceStockItem[]): CriticalImpactItem[] {
  return items.map(item => {
    const qty = Number(item.quantity || 0)
    const min = Number(item.minQuantity || 0)
    const deficit = Math.max(0, min - qty)
    const unitCost = Number(item.product?.baseCost || item.unitCost || 0)

    return {
      id: item.id,
      productName: item.productName || item.product?.name || 'Unknown Item',
      sku: item.sku,
      quantity: qty,
      minQuantity: min,
      unit: item.unit || 'pcs',
      locationName: item.location?.name || 'Unassigned',
      deficitQty: deficit,
      estimatedReplenishmentCost: deficit * unitCost
    }
  })
}