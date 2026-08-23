import { PharmacySale, SalesMetrics } from './types'

export function computeOutstanding(sale: PharmacySale): number {
  const net = (sale.total || 0) - (sale.refundedAmount || 0)
  return Math.max(0, net - (sale.amountPaid || 0))
}

export function computeSalesMetrics(sales: PharmacySale[]): SalesMetrics {
  return sales.reduce(
    (acc, s) => {
      acc.totalSalesCount += 1
      acc.totalRevenue += s.total || 0
      acc.totalOutstanding += computeOutstanding(s)
      acc.totalRefunded += s.refundedAmount || 0
      return acc
    },
    { totalSalesCount: 0, totalRevenue: 0, totalOutstanding: 0, totalRefunded: 0 }
  )
}

export function exportSalesToCSV(sales: PharmacySale[]) {
  const headers = ['Sale #', 'Date', 'Customer', 'Items Count', 'Subtotal', 'Discount', 'Total', 'Paid', 'Refunded', 'Outstanding', 'Payment Status', 'Sale Status']
  const rows = sales.map(s => [
    s.saleNumber ?? '',
    new Date(s.saleDate).toLocaleString(),
    s.customerName || 'Walk-in',
    s.items?.length ?? 0,
    s.subtotal ?? 0,
    s.discount ?? 0,
    s.total ?? 0,
    s.amountPaid ?? 0,
    s.refundedAmount ?? 0,
    computeOutstanding(s).toFixed(2),
    s.paymentStatus,
    s.status,
  ])
  return [headers, ...rows]
}