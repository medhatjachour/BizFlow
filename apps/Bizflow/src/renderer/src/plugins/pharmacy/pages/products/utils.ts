import { PharmacyProductItem, ProductsMetrics, ProductFormData } from './types'

type TranslateFn = (key: string, params?: Record<string, any>) => string

export function computeExpiryDays(dateStr?: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

export function computeProductsMetrics(items: PharmacyProductItem[]): ProductsMetrics {
  return items.reduce(
    (acc, p) => {
      acc.totalSkus += 1
      acc.totalValue += p.stockValue || 0
      if (p.isLowStock || p.isOutOfStock) acc.lowStockCount += 1
      const days = computeExpiryDays(p.nearestExpiry)
      if (days !== null && days <= 30) acc.expiringCount += 1
      return acc
    },
    { totalSkus: 0, totalValue: 0, lowStockCount: 0, expiringCount: 0 }
  )
}

export function initialProductForm(initial?: PharmacyProductItem | null): ProductFormData {
  return {
    name: initial?.name ?? '',
    genericName: initial?.genericName ?? '',
    category: initial?.category ?? 'general',
    unit: initial?.unit ?? 'box',
    subUnit: initial?.subUnit ?? '',
    subUnitsPerContainer: initial?.subUnitsPerContainer ? String(initial.subUnitsPerContainer) : '',
    subUnitPrice: initial?.subUnitPrice != null ? String(initial.subUnitPrice) : '',
    barcode: initial?.barcode ?? '',
    sellingPrice: initial?.sellingPrice != null ? String(initial.sellingPrice) : '',
    minimumStock: initial?.minimumStock != null ? String(initial.minimumStock) : '10',
    description: initial?.description ?? '',
    isActive: initial?.isActive ?? true,
  }
}

export function exportProductsToCSV(products: PharmacyProductItem[], t: TranslateFn) {
  const headers = [
    t('phName'), t('phPrCsvGenericName'), t('phCategory'), t('phBarcode'), t('phUnit'), t('phPrCsvSubUnit'),
    t('phPrCsvRatio'), t('phStock'), t('phPrCsvMinStock'), t('phPrice'), t('phPrCsvSubPrice'), t('inventoryUiStockValue'), t('phNearestExpiry'), t('phStatus')
  ]
  const rows = products.map(p => [
    p.name,
    p.genericName || '',
    p.category,
    p.barcode || '',
    p.unit,
    p.subUnit || '',
    p.subUnitsPerContainer || '',
    p.totalStock,
    p.minimumStock,
    p.sellingPrice,
    p.subUnitPrice || '',
    p.stockValue,
    p.nearestExpiry ? new Date(p.nearestExpiry).toLocaleDateString() : '',
    p.isActive ? t('active') : t('phPrDisabled'),
  ])
  return [headers, ...rows]
}