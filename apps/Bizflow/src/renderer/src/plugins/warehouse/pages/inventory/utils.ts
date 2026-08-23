import { StockEntry, StockFilterMode, SortOption, StockSummary } from './types'

export function computeStockHealth(entry: StockEntry): {
  pct: number
  status: 'ok' | 'low' | 'critical' | 'out'
  colorClass: string
  bgClass: string
  label: string
} {
  if (entry.quantity <= 0) {
    return { pct: 0, status: 'out', colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-500', label: 'Out of Stock' }
  }

  if (entry.minQuantity <= 0) {
    return { pct: 100, status: 'ok', colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500', label: 'In Stock' }
  }

  const ratio = (entry.quantity / entry.minQuantity) * 100
  const pct = Math.max(0, Math.min(100, Math.round(ratio)))

  if (ratio <= 60) {
    return { pct, status: 'critical', colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-500', label: 'Critical' }
  }
  if (ratio <= 100) {
    return { pct, status: 'low', colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500', label: 'Low Stock' }
  }

  return { pct, status: 'ok', colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500', label: 'Healthy' }
}

export function filterAndSortStock(
  items: StockEntry[],
  searchQuery: string,
  locationId: string,
  filterMode: StockFilterMode,
  sortBy: SortOption
): StockEntry[] {
  let result = items

  // 1. Location Filter (blank or 'all' means all locations)
  if (locationId && locationId !== 'all') {
    result = result.filter(item => item.locationId === locationId)
  }

  // 2. Preset Filter Modes
  if (filterMode === 'low_stock') {
    result = result.filter(item => item.quantity <= item.minQuantity && item.quantity > 0)
  } else if (filterMode === 'out_of_stock') {
    result = result.filter(item => item.quantity <= 0)
  } else if (filterMode === 'quarantine') {
    result = result.filter(item => item.isQuarantine || item.isDamaged)
  }

  // 3. Fuzzy Query
  const q = searchQuery.trim().toLowerCase()
  if (q) {
    result = result.filter(item => {
      return (
        item.productName.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.lotNumber && item.lotNumber.toLowerCase().includes(q)) ||
        (item.binCode && item.binCode.toLowerCase().includes(q))
      )
    })
  }

  // 4. Sorting
  const sorted = [...result]
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => a.productName.localeCompare(b.productName))
      break
    case 'qty_desc':
      sorted.sort((a, b) => b.quantity - a.quantity)
      break
    case 'qty_asc':
      sorted.sort((a, b) => a.quantity - b.quantity)
      break
    case 'expiry':
      sorted.sort((a, b) => (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999'))
      break
    case 'risk':
    default:
      sorted.sort((a, b) => {
        const aRisk = a.minQuantity <= 0 ? (a.quantity <= 0 ? 9999 : 0) : (a.minQuantity - a.quantity) / a.minQuantity
        const bRisk = b.minQuantity <= 0 ? (b.quantity <= 0 ? 9999 : 0) : (b.minQuantity - b.quantity) / b.minQuantity
        return bRisk - aRisk
      })
      break
  }

  return sorted
}

export function computeSummary(items: StockEntry[]): StockSummary {
  const totalSKUs = items.length
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const lowStockCount = items.filter(item => item.quantity <= item.minQuantity && item.quantity > 0).length
  const outOfStockCount = items.filter(item => item.quantity <= 0).length
  const quarantineCount = items.filter(item => item.isQuarantine || item.isDamaged).length
  const healthyCount = totalSKUs - (lowStockCount + outOfStockCount)
  const healthRate = totalSKUs === 0 ? 100 : Math.max(0, Math.round((healthyCount / totalSKUs) * 100))

  return { totalSKUs, totalUnits, lowStockCount, outOfStockCount, quarantineCount, healthRate }
}