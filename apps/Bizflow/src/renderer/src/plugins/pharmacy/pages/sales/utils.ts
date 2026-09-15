import { PharmacySale, SalesMetrics } from './types'
import { PAYMENT_STATUS_LABEL_KEYS, SALE_STATUS_LABEL_KEYS, statusLabel } from '../components/_shared'

type TranslateFn = (key: string, params?: Record<string, any>) => string

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

export function exportSalesToCSV(sales: PharmacySale[], t: TranslateFn) {
  const headers = [
    t('phSaSaleNumber'), t('phDate'), t('phCustomer'), t('phPoItemsCount'), t('phSubtotal'), t('phDiscount'),
    t('phTotal'), t('phPaid'), t('phRefunded'), t('phOutstanding'), t('paymentStatus'), t('phSaCsvSaleStatus'),
  ]
  const rows = sales.map(s => [
    s.saleNumber ?? '',
    new Date(s.saleDate).toLocaleString(),
    s.customerName || t('phWalkIn'),
    s.items?.length ?? 0,
    s.subtotal ?? 0,
    s.discount ?? 0,
    s.total ?? 0,
    s.amountPaid ?? 0,
    s.refundedAmount ?? 0,
    computeOutstanding(s).toFixed(2),
    statusLabel(t, PAYMENT_STATUS_LABEL_KEYS, s.paymentStatus),
    statusLabel(t, SALE_STATUS_LABEL_KEYS, s.status),
  ])
  return [headers, ...rows]
}