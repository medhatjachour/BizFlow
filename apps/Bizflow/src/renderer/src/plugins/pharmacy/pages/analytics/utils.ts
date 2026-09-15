import { DateRange, DateRangePreset, SalesReportData, InventoryReportData } from './types'

/** `t()` from the language context, injected so report exports follow the UI language. */
type Translator = (key: string, params?: Record<string, unknown>) => string

const pad = (n: number) => String(n).padStart(2, '0')
export const formatIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function computePresetDateRange(preset: DateRangePreset): DateRange {
  const now = new Date()
  const todayStr = formatIsoDate(now)

  if (preset === 'today') {
    return { from: todayStr, to: todayStr }
  }

  if (preset === 'yesterday') {
    const y = new Date(now)
    y.setDate(now.getDate() - 1)
    const yStr = formatIsoDate(y)
    return { from: yStr, to: yStr }
  }

  if (preset === 'week') {
    const d = new Date(now)
    d.setDate(now.getDate() - 6)
    return { from: formatIsoDate(d), to: todayStr }
  }

  if (preset === 'quarter') {
    const d = new Date(now)
    d.setDate(now.getDate() - 89)
    return { from: formatIsoDate(d), to: todayStr }
  }

  if (preset === 'year') {
    const d = new Date(now)
    d.setFullYear(now.getFullYear() - 1)
    d.setDate(now.getDate() + 1)
    return { from: formatIsoDate(d), to: todayStr }
  }

  // Default: month (30 days)
  const d = new Date(now)
  d.setDate(now.getDate() - 29)
  return { from: formatIsoDate(d), to: todayStr }
}

export function buildSalesExportCSV(sales: SalesReportData, range: DateRange, t: Translator) {
  const headers = [
    [t('phAnCsvSalesTitle'), t('phAnCsvTimeline', { from: range.from, to: range.to })],
    [t('phAnCsvGeneratedAt'), new Date().toLocaleString()],
    [],
    [t('phAnCsvRevenueHeader'), t('phAnCsvValueHeader')],
    [t('phAnGrossRevenue'), sales.revenue.toFixed(2)],
    [t('phAnCogsSold'), sales.cogs.toFixed(2)],
    [t('phAnGrossOperatingProfit'), sales.grossProfit.toFixed(2)],
    [t('phAnNetMargin'), `${(sales.margin || 0).toFixed(2)}%`],
    [t('phAnTotalTransactions'), sales.saleCount],
    [t('phAnUnitsAcrossLines'), sales.unitsSold],
    [t('phAnCashCollected'), sales.collected.toFixed(2)],
    [t('phAnOutstandingReceivables'), sales.outstanding.toFixed(2)],
    [],
    [t('phAnTopMedicinesHeader'), t('phAnCsvUnitsSoldHeader'), t('phAnCsvGrossRevenueHeader')],
    ...(sales.topProducts ?? []).map(p => [p.name, p.units, p.revenue.toFixed(2)]),
  ]
  return headers
}

export function buildInventoryExportCSV(inv: InventoryReportData, t: Translator) {
  const headers = [
    [t('phAnCsvInventoryTitle'), new Date().toLocaleString()],
    [],
    [t('phAnCsvInventoryMetric'), t('phAnCsvValue')],
    [t('phAnTotalCatalogSkus'), inv.totalProducts],
    [t('phAnTotalInventoryCost'), inv.stockValue.toFixed(2)],
    [t('phAnPotentialRetailValuation'), inv.retailValue.toFixed(2)],
    [t('phAnLowStockAlerts'), inv.lowStock],
    [t('phAnOutOfStockSkus'), inv.outOfStock],
    [t('phAnExpiredBatchesPlain'), inv.expiredBatches],
    [t('phAnExpiredStockLoss'), inv.expiredValue.toFixed(2)],
    [t('phAnExpiringIn30'), inv.expiringSoon],
    [t('phAnExpiringStockValue'), inv.expiringValue.toFixed(2)],
    [],
    [t('phAnCsvCategoryBreakdown'), t('phAnCsvProductCount'), t('phAnCsvTotalAssetValue')],
    ...(inv.byCategory ?? []).map(c => [c.category, c.count, c.value.toFixed(2)]),
  ]
  return headers
}