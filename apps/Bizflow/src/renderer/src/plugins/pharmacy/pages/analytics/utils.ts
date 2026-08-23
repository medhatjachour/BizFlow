import { DateRange, DateRangePreset, SalesReportData, InventoryReportData } from './types'

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

export function buildSalesExportCSV(sales: SalesReportData, range: DateRange) {
  const headers = [
    ['PHARMACY EXECUTIVE SALES & P&L REPORT', `Timeline: ${range.from} to ${range.to}`],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['EXECUTIVE REVENUE & PROFITABILITY METRIC', 'VALUE ($ / %)'],
    ['Gross Revenue', sales.revenue.toFixed(2)],
    ['Cost of Goods Sold (COGS)', sales.cogs.toFixed(2)],
    ['Gross Operating Profit', sales.grossProfit.toFixed(2)],
    ['Net Margin (%)', `${(sales.margin || 0).toFixed(2)}%`],
    ['Total Transactions', sales.saleCount],
    ['Units Sold Across All Lines', sales.unitsSold],
    ['Cash / Tender Collected', sales.collected.toFixed(2)],
    ['Outstanding Receivables', sales.outstanding.toFixed(2)],
    [],
    ['TOP PERFORMING MEDICINES BY REVENUE', 'UNITS SOLD', 'GROSS REVENUE ($)'],
    ...(sales.topProducts ?? []).map(p => [p.name, p.units, p.revenue.toFixed(2)]),
  ]
  return headers
}

export function buildInventoryExportCSV(inv: InventoryReportData) {
  const headers = [
    ['PHARMACY INVENTORY & ASSET VALUATION AUDIT', new Date().toLocaleString()],
    [],
    ['INVENTORY ASSET METRIC', 'VALUE'],
    ['Total Catalog SKUs', inv.totalProducts],
    ['Total Inventory Cost Value ($)', inv.stockValue.toFixed(2)],
    ['Potential Retail Valuation ($)', inv.retailValue.toFixed(2)],
    ['Low Stock Alerts', inv.lowStock],
    ['Out of Stock SKUs', inv.outOfStock],
    ['Expired Batches Count', inv.expiredBatches],
    ['Expired Stock Loss ($)', inv.expiredValue.toFixed(2)],
    ['Expiring in 30 Days (At Risk)', inv.expiringSoon],
    ['Expiring Stock Value ($)', inv.expiringValue.toFixed(2)],
    [],
    ['CATEGORY BREAKDOWN', 'PRODUCT COUNT', 'TOTAL ASSET VALUE ($)'],
    ...(inv.byCategory ?? []).map(c => [c.category, c.count, c.value.toFixed(2)]),
  ]
  return headers
}