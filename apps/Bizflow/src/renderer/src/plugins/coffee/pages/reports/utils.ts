import { DatePreset, DateRange, Overview, TrendRow, ProductRow, CategoryRow, CustomerInsights, ExportFormat } from './types'
import { PAYMENT_METHODS, ORDER_TYPES } from './constants'

// ==================== DATE UTILITIES ====================

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function fmtDateTime(date: Date): string {
  return date.toISOString()
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

export function applyPreset(preset: DatePreset): DateRange {
  if (preset === 'all') return { from: '', to: '' }

  const to = endOfToday()
  const from = startOfToday()

  switch (preset) {
    case 'today':
      break
    case 'week':
      from.setDate(from.getDate() - 6)
      break
    case 'month':
      from.setDate(1)
      break
    case 'quarter':
      const month = from.getMonth()
      from.setMonth(Math.floor(month / 3) * 3)
      from.setDate(1)
      break
    case 'year':
      from.setMonth(0)
      from.setDate(1)
      break
  }

  return { from: fmtDate(from), to: fmtDate(to) }
}

export function getDateRangeLabel(from: string, to: string, t: (key: string) => string): string {
  if (!from && !to) return t('cfAllTime')
  if (from && to) {
    const fromStr = new Date(`${from}T00:00:00`).toLocaleDateString()
    const toStr = new Date(`${to}T00:00:00`).toLocaleDateString()
    return `${fromStr} → ${toStr}`
  }
  return from || to || t('cfAllTime')
}

export function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T23:59:59`).getTime()
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}

// ==================== FORMATTING UTILITIES ====================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value || 0).toFixed(decimals)}%`
}

export function formatHour(hour: number): string {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ==================== CALCULATION UTILITIES ====================

export function calcMarginPct(revenue: number, cogs: number): number {
  if (revenue === 0) return 0
  return ((revenue - cogs) / revenue) * 100
}

export function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

// ==================== SORTING UTILITIES ====================

export function sortData<T>(data: T[], key: keyof T, direction: 'asc' | 'desc'): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    const aStr = String(aVal ?? '')
    const bStr = String(bVal ?? '')
    return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
  })
}

// ==================== EXPORT UTILITIES ====================

export function buildExportData(
  overview: Overview | null,
  trend: TrendRow[],
  topProducts: ProductRow[],
  categories: CategoryRow[],
  customers: CustomerInsights | null,
  from: string,
  to: string,
  t: (key: string) => string
) {
  return {
    meta: {
      title: t('cfCoffeeReports'),
      generatedAt: new Date().toISOString(),
      dateRange: { from, to },
      dateRangeLabel: getDateRangeLabel(from, to, t),
    },
    summary: overview
      ? [
          { metric: t('cfRevenueLabel'), value: overview.totalRevenue },
          { metric: t('cfGrossProfitLabel'), value: overview.grossProfit },
          { metric: 'Gross Margin %', value: overview.grossMarginPct },
          { metric: t('cfNetProfitLabel'), value: overview.netProfitAfterExpenses },
          { metric: 'Net Margin %', value: overview.netMarginPct },
          { metric: 'Total Orders', value: overview.totalOrders },
          { metric: 'Items Sold', value: overview.totalItemsSold },
          { metric: 'Avg Order Value', value: overview.averageOrderValue },
          { metric: 'Avg Items / Order', value: overview.avgItemsPerOrder },
          { metric: 'Unique Customers', value: overview.uniqueCustomers },
          { metric: 'Repeat Customer Rate %', value: overview.repeatCustomerRatePct },
          { metric: 'Total Expenses', value: overview.totalExpenses },
          { metric: 'Discount Rate %', value: overview.discountRatePct },
        ]
      : [],
    trend: trend.map(row => ({
      Date: formatDateDisplay(row.date),
      Revenue: row.revenue,
      Orders: row.orders,
      Discount: row.discount,
      Profit: row.profit,
    })),
    topProducts: topProducts.map(p => ({
      Product: p.productName,
      Category: p.categoryName,
      Quantity: p.quantity,
      Revenue: p.revenue,
      COGS: p.cogs,
      'Gross Profit': p.grossProfit,
      // FIX: Calculate margin if missing from backend
      'Margin %': p.marginPct ?? calcMarginPct(p.revenue, p.cogs),
    })),
    categories: categories.map(c => ({
      Category: c.categoryName,
      Quantity: c.quantity,
      Revenue: c.revenue,
      COGS: c.cogs,
      'Gross Profit': c.grossProfit,
      // FIX: Calculate margin if missing from backend
      'Margin %': c.marginPct ?? calcMarginPct(c.revenue, c.cogs),
    })),
    customers: customers?.topCustomers.map(c => ({
      Customer: c.name,
      Orders: c.orders,
      Spent: c.spent,
      'Delivery Orders': c.deliveryOrders,
      'Last Visit': formatDateDisplay(c.lastVisit),
    })) ?? [],
    cashiers: overview?.topCashiers.map(c => ({
      Cashier: c.name,
      Orders: c.orders,
      Revenue: c.revenue,
      'Avg Order Value': c.avgOrderValue,
    })) ?? [],
    expenses: overview?.expenseByCategory.map(e => ({
      Category: e.category,
      Total: e.total,
      Count: e.count,
      'Percentage %': e.pct ?? calcPercentage(e.total, overview.totalExpenses),
    })) ?? [],
    paymentMix: overview
      ? PAYMENT_METHODS.map(pm => ({
          Method: pm.label,
          Amount: overview.payment[pm.key] || 0,
          'Percentage %': calcPercentage(overview.payment[pm.key] || 0, overview.totalRevenue),
        }))
      : [],
    orderTypes: overview
      ? ORDER_TYPES.map(ot => ({
          Type: t(ot.labelKey),
          Count: overview.orderTypes[ot.key] || 0,
        }))
      : [],
  }
}

export function exportToCsv(data: ReturnType<typeof buildExportData>, filename: string) {
  const lines: string[] = []

  lines.push(data.meta.title)
  lines.push(`Date Range,${data.meta.dateRangeLabel}`)
  lines.push(`Generated,${new Date(data.meta.generatedAt).toLocaleString()}`)
  lines.push('')

  lines.push('SUMMARY')
  lines.push('Metric,Value')
  data.summary.forEach(s => lines.push(`${s.metric},${s.value}`))
  lines.push('')

  lines.push('REVENUE TREND')
  lines.push('Date,Revenue,Orders,Discount,Profit')
  data.trend.forEach(r => lines.push(`${r.Date},${r.Revenue},${r.Orders},${r.Discount},${r.Profit}`))
  lines.push('')

  lines.push('TOP PRODUCTS')
  lines.push('Product,Category,Quantity,Revenue,COGS,Gross Profit,Margin %')
  data.topProducts.forEach(p =>
    lines.push(`${p.Product},${p.Category},${p.Quantity},${p.Revenue},${p.COGS},${p['Gross Profit']},${p['Margin %']}`)
  )
  lines.push('')

  lines.push('CATEGORY PERFORMANCE')
  lines.push('Category,Quantity,Revenue,COGS,Gross Profit,Margin %')
  data.categories.forEach(c =>
    lines.push(`${c.Category},${c.Quantity},${c.Revenue},${c.COGS},${c['Gross Profit']},${c['Margin %']}`)
  )
  lines.push('')

  lines.push('TOP CUSTOMERS')
  lines.push('Customer,Orders,Spent,Delivery Orders,Last Visit')
  data.customers.forEach(c =>
    lines.push(`${c.Customer},${c.Orders},${c.Spent},${c['Delivery Orders']},${c['Last Visit']}`)
  )
  lines.push('')

  lines.push('CASHIERS')
  lines.push('Cashier,Orders,Revenue,Avg Order Value')
  data.cashiers.forEach(c => lines.push(`${c.Cashier},${c.Orders},${c.Revenue},${c['Avg Order Value']}`))
  lines.push('')

  lines.push('EXPENSES BY CATEGORY')
  lines.push('Category,Total,Count,Percentage %')
  data.expenses.forEach(e => lines.push(`${e.Category},${e.Total},${e.Count},${e['Percentage %']}`))

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

export async function exportToExcel(data: ReturnType<typeof buildExportData>, filename: string) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  const summaryWs = XLSX.utils.json_to_sheet(data.summary.map(s => ({ Metric: s.metric, Value: s.value })))
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  const trendWs = XLSX.utils.json_to_sheet(data.trend)
  XLSX.utils.book_append_sheet(wb, trendWs, 'Revenue Trend')

  const productsWs = XLSX.utils.json_to_sheet(data.topProducts)
  XLSX.utils.book_append_sheet(wb, productsWs, 'Top Products')

  const categoriesWs = XLSX.utils.json_to_sheet(data.categories)
  XLSX.utils.book_append_sheet(wb, categoriesWs, 'Categories')

  const customersWs = XLSX.utils.json_to_sheet(data.customers)
  XLSX.utils.book_append_sheet(wb, customersWs, 'Customers')

  const cashiersWs = XLSX.utils.json_to_sheet(data.cashiers)
  XLSX.utils.book_append_sheet(wb, cashiersWs, 'Cashiers')

  const expensesWs = XLSX.utils.json_to_sheet(data.expenses)
  XLSX.utils.book_append_sheet(wb, expensesWs, 'Expenses')

  const paymentWs = XLSX.utils.json_to_sheet(data.paymentMix)
  XLSX.utils.book_append_sheet(wb, paymentWs, 'Payment Mix')

  const orderTypesWs = XLSX.utils.json_to_sheet(data.orderTypes)
  XLSX.utils.book_append_sheet(wb, orderTypesWs, 'Order Types')

  XLSX.writeFile(wb, filename)
}

export async function exportToPdf(data: ReturnType<typeof buildExportData>, filename: string) {
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  // ─────────────────────────────────────────────────────────────────
  // ARABIC FONT SUPPORT INSTRUCTION:
  // jsPDF default fonts don't support Arabic. To fix the garbled text,
  // you must load an Arabic font (like Amiri or Cairo) as base64.
  //
  // 1. Find a .ttf font file.
  // 2. Convert it to base64 (you can use online tools).
  // 3. Add it to jsPDF like this:
  //
  // doc.addFileToVFS('Amiri-Regular.ttf', 'YOUR_BASE64_STRING_HERE');
  // doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  // doc.setFont('Amiri');
  //
  // For now, we proceed with the default font.
  // ─────────────────────────────────────────────────────────────────

  // Header
  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, pageWidth, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(data.meta.title, margin, 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${new Date(data.meta.generatedAt).toLocaleString()}`, margin, 25)

  // Date Range
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Date Range: ${data.meta.dateRangeLabel}`, margin, 40)

  // Summary Table
  autoTable(doc, {
    startY: 45,
    head: [['Metric', 'Value']],
    body: data.summary.map(s => [s.metric, formatCurrency(s.value)]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  })

  // Top Products
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Product', 'Category', 'Qty', 'Revenue', 'Profit', 'Margin %']],
    body: data.topProducts.map(p => [
      p.Product,
      p.Category,
      p.Quantity,
      formatCurrency(p.Revenue),
      formatCurrency(p['Gross Profit']),
      formatPercent(p['Margin %']),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  })

  // Categories
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Category', 'Qty', 'Revenue', 'Profit', 'Margin %']],
    body: data.categories.map(c => [
      c.Category,
      c.Quantity,
      formatCurrency(c.Revenue),
      formatCurrency(c['Gross Profit']),
      formatPercent(c['Margin %']),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246], textColor: 255 },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  })

  // Customers
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Customer', 'Orders', 'Spent', 'Delivery', 'Last Visit']],
    body: data.customers.map(c => [
      c.Customer,
      c.Orders,
      formatCurrency(c.Spent),
      c['Delivery Orders'],
      c['Last Visit'],
    ]),
    theme: 'striped',
    headStyles: { fillColor: [168, 85, 247], textColor: 255 },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  })

  // Cashiers
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Cashier', 'Orders', 'Revenue', 'Avg Order']],
    body: data.cashiers.map(c => [
      c.Cashier,
      c.Orders,
      formatCurrency(c.Revenue),
      formatCurrency(c['Avg Order Value']),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: 255 },
    styles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  })

  // Expenses
  if (data.expenses.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Expense Category', 'Total', 'Count', '% of Total']],
      body: data.expenses.map(e => [
        e.Category,
        formatCurrency(e.Total),
        e.Count,
        formatPercent(e['Percentage %']),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    })
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin - 20,
      doc.internal.pageSize.getHeight() - 10
    )
  }

  doc.save(filename)
}

export function printReport() {
  window.print()
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function generateFilename(format: ExportFormat, from: string, to: string): string {
  const dateStr = new Date().toISOString().slice(0, 10)
  const rangeStr = from && to ? `${from}_to_${to}` : 'all_time'
  const ext = format === 'excel' ? 'xlsx' : format
  return `coffee-report_${rangeStr}_${dateStr}.${ext}`
}
