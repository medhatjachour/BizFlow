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

export function formatCurrency(value: number, currency = 'EGP'): string {
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
  try {
    // Generate HTML report that supports Arabic with proper UTF-8 encoding
    const htmlContent = generatePdfHtml(data)
    
    // Use Electron's print-to-PDF feature via preload API
    // This uses Chromium's rendering which has native Arabic support
    const api = (window as any).api
    
    if (!api?.export?.printPdf) {
      throw new Error('PDF export API not available')
    }
    
    // Send request to main process and wait for response
    const result = await api.export.printPdf(htmlContent, filename)
    
    if (result.success) {
      console.log(`✓ PDF generated successfully: ${result.filePath}`)
      return
    } else {
      throw new Error(result.error || 'Unknown PDF generation error')
    }
  } catch (error) {
    console.error('PDF export error:', error)
    throw error
  }
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

// Generate HTML content for PDF with full Arabic support
function generatePdfHtml(data: ReturnType<typeof buildExportData>): string {
  const tableRowsStyles = `
    background-color: #f9fafb;
  `
  const tableHeaderStyles = `
    background-color: #10b981;
    color: white;
    font-weight: bold;
    text-align: center;
  `

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.meta.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      direction: rtl;
      text-align: right;
    }
    
    @page {
      size: A4;
      margin: 14mm;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 14mm;
      }
    }
    
    .header {
      background-color: #10b981;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    
    .header .meta {
      font-size: 12px;
      opacity: 0.95;
    }
    
    .date-range {
      font-size: 14px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 12px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    table th {
      ${tableHeaderStyles}
      padding: 12px;
      border: 1px solid #e5e7eb;
    }
    
    table td {
      ${tableRowsStyles}
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
    }
    
    table tbody tr:nth-child(even) {
      background-color: #f3f4f6;
    }
    
    table tbody tr:hover {
      background-color: #e5e7eb;
    }
    
    .number {
      text-align: left;
    }
    
    .footer {
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
    }
    
    @media print {
      .no-print {
        display: none;
      }
      
      body {
        font-size: 11px;
      }
      
      table {
        font-size: 10px;
      }
      
      table th {
        padding: 8px;
      }
      
      table td {
        padding: 7px 8px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.meta.title}</h1>
    <div class="meta">
      <p>التاريخ: ${new Date(data.meta.generatedAt).toLocaleString('ar-EG')}</p>
    </div>
  </div>
  
  <div class="date-range">
    النطاق الزمني: ${data.meta.dateRangeLabel}
  </div>
  
  <!-- Summary Section -->
  <div class="section">
    <div class="section-title">الملخص</div>
    <table>
      <thead>
        <tr>
          <th>القيمة</th>
          <th>المقياس</th>
        </tr>
      </thead>
      <tbody>
        ${data.summary.map(s => `
          <tr>
            <td class="number">${s.value}</td>
            <td>${s.metric}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Top Products Section -->
  <div class="section">
    <div class="section-title">أفضل المنتجات</div>
    <table>
      <thead>
        <tr>
          <th>نسبة الهامش %</th>
          <th>الربح الإجمالي</th>
          <th>تكلفة البضاعة المباعة</th>
          <th>الإيرادات</th>
          <th>الكمية</th>
          <th>الفئة</th>
          <th>المنتج</th>
        </tr>
      </thead>
      <tbody>
        ${data.topProducts.map(p => `
          <tr>
            <td class="number">${formatPercent(p['Margin %'])}</td>
            <td class="number">${formatCurrency(p['Gross Profit'])}</td>
            <td class="number">${formatCurrency(p.COGS)}</td>
            <td class="number">${formatCurrency(p.Revenue)}</td>
            <td class="number">${p.Quantity}</td>
            <td>${p.Category}</td>
            <td>${p.Product}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Categories Section -->
  <div class="section">
    <div class="section-title">أداء الفئات</div>
    <table>
      <thead>
        <tr>
          <th>نسبة الهامش %</th>
          <th>الربح الإجمالي</th>
          <th>تكلفة البضاعة المباعة</th>
          <th>الإيرادات</th>
          <th>الكمية</th>
          <th>الفئة</th>
        </tr>
      </thead>
      <tbody>
        ${data.categories.map(c => `
          <tr>
            <td class="number">${formatPercent(c['Margin %'])}</td>
            <td class="number">${formatCurrency(c['Gross Profit'])}</td>
            <td class="number">${formatCurrency(c.COGS)}</td>
            <td class="number">${formatCurrency(c.Revenue)}</td>
            <td class="number">${c.Quantity}</td>
            <td>${c.Category}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Top Customers Section -->
  <div class="section">
    <div class="section-title">أفضل العملاء</div>
    <table>
      <thead>
        <tr>
          <th>آخر زيارة</th>
          <th>طلبات التسليم</th>
          <th>المبلغ المنفق</th>
          <th>عدد الطلبات</th>
          <th>اسم العميل</th>
        </tr>
      </thead>
      <tbody>
        ${data.customers.map(c => `
          <tr>
            <td>${c['Last Visit']}</td>
            <td class="number">${c['Delivery Orders']}</td>
            <td class="number">${formatCurrency(c.Spent)}</td>
            <td class="number">${c.Orders}</td>
            <td>${c.Customer}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Cashiers Section -->
  <div class="section">
    <div class="section-title">الصرافين</div>
    <table>
      <thead>
        <tr>
          <th>متوسط قيمة الطلب</th>
          <th>الإيرادات</th>
          <th>عدد الطلبات</th>
          <th>اسم الصراف</th>
        </tr>
      </thead>
      <tbody>
        ${data.cashiers.map(c => `
          <tr>
            <td class="number">${formatCurrency(c['Avg Order Value'])}</td>
            <td class="number">${formatCurrency(c.Revenue)}</td>
            <td class="number">${c.Orders}</td>
            <td>${c.Cashier}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Expenses Section -->
  ${data.expenses.length > 0 ? `
  <div class="section">
    <div class="section-title">المصروفات حسب الفئة</div>
    <table>
      <thead>
        <tr>
          <th>النسبة المئوية %</th>
          <th>العدد</th>
          <th>الإجمالي</th>
          <th>فئة المصروفات</th>
        </tr>
      </thead>
      <tbody>
        ${data.expenses.map(e => `
          <tr>
            <td class="number">${formatPercent(e['Percentage %'])}</td>
            <td class="number">${e.Count}</td>
            <td class="number">${formatCurrency(e.Total)}</td>
            <td>${e.Category}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  <div class="footer">
    <p>تم إنشاء هذا التقرير بواسطة نظام إدارة المقهى BizFlow</p>
  </div>
</body>
</html>
  `.trim()
}
