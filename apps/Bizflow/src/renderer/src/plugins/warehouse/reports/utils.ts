import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ReportType } from './types'
import { REPORT_OPTIONS } from './constants'

export function generateWarehousePDF(
  reportType: ReportType,
  startDate: string,
  endDate: string,
  rawItems: any[]
): string {
  const doc = new jsPDF()
  const config = REPORT_OPTIONS.find(r => r.id === reportType) || REPORT_OPTIONS[0]
  const dateRangeStr = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`

  let currentY = 20

  // Title Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Warehouse Report — ${config.label}`, 105, currentY, { align: 'center' })
  currentY += 7

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Period: ${dateRangeStr}  |  Generated: ${new Date().toLocaleString()}`, 105, currentY, { align: 'center' })
  currentY += 12
  doc.setTextColor(0)

  if (reportType === 'stock' || reportType === 'valuation') {
    const totalVal = rawItems.reduce((acc, item) => {
      const cost = Number(item.product?.baseCost || item.unitCost || 0)
      return acc + Number(item.quantity || 0) * cost
    }, 0)

    autoTable(doc, {
      startY: currentY,
      head: [['Summary Metric', 'Value']],
      body: [
        ['Total SKUs Tracked', rawItems.length.toString()],
        ['Total Estimated Capital Asset Value', `$${totalVal.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: config.pdfThemeColor },
      styles: { fontSize: 9 }
    })

    currentY = (doc as any).lastAutoTable.finalY + 10

    autoTable(doc, {
      startY: currentY,
      head: [['Product Name', 'SKU', 'Qty', 'Unit Cost', 'Total Value']],
      body: rawItems.slice(0, 100).map((item: any) => {
        const cost = Number(item.product?.baseCost || item.unitCost || 0)
        const total = Number(item.quantity || 0) * cost
        return [
          item.productName || item.product?.name || 'Unknown',
          item.sku || 'N/A',
          (item.quantity || 0).toString(),
          `$${cost.toFixed(2)}`,
          `$${total.toFixed(2)}`
        ]
      }),
      theme: 'striped',
      headStyles: { fillColor: config.pdfThemeColor },
      styles: { fontSize: 8 }
    })
  } else if (reportType === 'transfers') {
    autoTable(doc, {
      startY: currentY,
      head: [['Transfer ID', 'From Location', 'To Location', 'Items Count', 'Date', 'Status']],
      body: rawItems.map((tr: any) => [
        `#${(tr.id || '').slice(-6).toUpperCase()}`,
        tr.fromLocation?.name || tr.fromLocationId || 'Origin',
        tr.toLocation?.name || tr.toLocationId || 'Destination',
        (tr.items?.length || 0).toString(),
        new Date(tr.createdAt || tr.transferDate).toLocaleDateString(),
        (tr.status || 'draft').toUpperCase()
      ]),
      theme: 'striped',
      headStyles: { fillColor: config.pdfThemeColor },
      styles: { fontSize: 8 }
    })
  } else if (reportType === 'critical') {
    autoTable(doc, {
      startY: currentY,
      head: [['Product Name', 'Location', 'Current Qty', 'Min Threshold', 'Alert Level']],
      body: rawItems.map((item: any) => [
        item.productName || item.product?.name || 'Unknown',
        item.location?.name || 'General',
        (item.quantity || 0).toString(),
        (item.minQuantity || item.minThreshold || 0).toString(),
        Number(item.quantity) <= 0 ? 'OUT OF STOCK' : 'CRITICAL LOW'
      ]),
      theme: 'striped',
      headStyles: { fillColor: config.pdfThemeColor },
      styles: { fontSize: 8 }
    })
  }

  const filename = `Warehouse_${config.id}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
  return filename
}