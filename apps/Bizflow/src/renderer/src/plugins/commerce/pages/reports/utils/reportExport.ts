import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency } from '@renderer/pages/Reports/types'
import type { ReportFormState, ReportType } from '@renderer/pages/Reports/types'

type ExportContext = {
  reportData: any
  reportForm: ReportFormState
  reportTypes: ReportType[]
}

function buildSummaryRows(reportType: string, reportData: any): string[][] {
  if (reportType === 'sales' && reportData.summary) {
    return [
      ['Total Revenue', formatCurrency(reportData.summary.totalRevenue || 0)],
      ['Total Sales', `${reportData.summary.totalSales || 0}`],
      ['Avg Order', formatCurrency(reportData.summary.averageOrderValue || 0)],
      ['Refunded', formatCurrency(reportData.summary.totalRefunded || 0)],
    ]
  }

  if (reportType === 'inventory' && reportData.summary) {
    return [
      ['Total Value', formatCurrency(reportData.summary.totalValue || 0)],
      ['Products', `${reportData.summary.totalProducts || 0}`],
      ['Low Stock', `${reportData.summary.lowStockCount || 0}`],
      ['Out of Stock', `${reportData.summary.outOfStockCount || 0}`],
    ]
  }

  if (reportType === 'financial' && reportData.summary) {
    return [
      ['Revenue', formatCurrency(reportData.summary.totalRevenue || 0)],
      ['Expenses', formatCurrency(reportData.summary.totalExpenses || 0)],
      ['Net Profit', formatCurrency(reportData.summary.netProfit || 0)],
      ['Margin', `${(reportData.summary.profitMargin || 0).toFixed(2)}%`],
    ]
  }

  if (reportType === 'customer' && reportData.summary) {
    return [
      ['Customers', `${reportData.summary.totalCustomers || 0}`],
      ['Total Spent', formatCurrency(reportData.summary.totalSpent || 0)],
      ['Avg/Customer', formatCurrency(reportData.summary.averageSpent || 0)],
    ]
  }

  return []
}

export function exportReportPdf({ reportData, reportForm, reportTypes }: ExportContext): string {
  if (!reportData || !reportForm.reportType) {
    throw new Error('Missing report data')
  }

  const doc = new jsPDF()
  const rt = reportTypes.find((r) => r.id === reportForm.reportType)
  const dateRange = `${new Date(reportForm.startDate).toLocaleDateString()} - ${new Date(reportForm.endDate).toLocaleDateString()}`

  let y = 20
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(`${rt?.title} Report`, 105, y, { align: 'center' })
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Period: ${dateRange}`, 105, y, { align: 'center' })
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, y + 5, { align: 'center' })
  y += 15

  doc.setTextColor(0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, y)
  y += 8

  const rows = buildSummaryRows(reportForm.reportType, reportData)

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  const filename = `Commerce_${rt?.title}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
  return filename
}

export function exportReportCsv({ reportData, reportForm, reportTypes }: ExportContext): string {
  if (!reportData || !reportForm.reportType) {
    throw new Error('Missing report data')
  }

  const rt = reportTypes.find((r) => r.id === reportForm.reportType)
  let csv = `Commerce ${rt?.title} Report\nGenerated: ${new Date().toLocaleString()}\n\n`

  if (reportForm.reportType === 'sales' && reportData.summary) {
    csv += `Revenue,${reportData.summary.totalRevenue}\n`
    csv += `Sales,${reportData.summary.totalSales}\n`
  } else if (reportForm.reportType === 'financial' && reportData.summary) {
    csv += `Revenue,${reportData.summary.totalRevenue}\n`
    csv += `Expenses,${reportData.summary.totalExpenses}\n`
    csv += `Profit,${reportData.summary.netProfit}\n`
  } else if (reportForm.reportType === 'inventory' && reportData.summary) {
    csv += `Total Value,${reportData.summary.totalValue}\n`
    csv += `Products,${reportData.summary.totalProducts}\n`
  } else if (reportForm.reportType === 'customer' && reportData.summary) {
    csv += `Customers,${reportData.summary.totalCustomers}\n`
    csv += `Total Spent,${reportData.summary.totalSpent}\n`
  }

  const filename = `Commerce_${rt?.title}_${new Date().toISOString().split('T')[0]}.csv`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  return filename
}