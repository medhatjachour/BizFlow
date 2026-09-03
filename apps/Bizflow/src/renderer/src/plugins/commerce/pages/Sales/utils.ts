import { calculateRefundedAmount } from '@/shared/utils/refundCalculations'
import type { DateFilter, SaleTransaction, SalesStats } from './types'
import { DEFAULT_REFUND_PERIOD_DAYS } from './constants'

export function getRefundPeriodDays(): number {
  return parseInt(localStorage.getItem('refundPeriodDays') || String(DEFAULT_REFUND_PERIOD_DAYS), 10)
}

export function isWithinRefundPeriod(
  transactionDate: string,
  refundPeriodDays: number
): boolean {
  if (refundPeriodDays === 0) return false

  const transactionTime = new Date(transactionDate).getTime()
  const now = Date.now()
  const daysDifference = (now - transactionTime) / (1000 * 60 * 60 * 24)

  return daysDifference <= refundPeriodDays
}

export function formatDate(dateStr: string, locale = 'en-US'): string {
  const date = new Date(dateStr)
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success'
    case 'pending':
      return 'bg-accent/10 text-accent'
    case 'partially_refunded':
      return 'bg-warning/10 text-warning'
    case 'refunded':
      return 'bg-error/10 text-error'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function filterTransactionsByDate(
  transactions: SaleTransaction[],
  dateFilter: DateFilter
): SaleTransaction[] {
  if (dateFilter === 'all') return transactions

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.createdAt)
    switch (dateFilter) {
      case 'today':
        return transactionDate >= startOfToday
      case 'week':
        return transactionDate >= startOfWeek
      case 'month':
        return transactionDate >= startOfMonth
      default:
        return true
    }
  })
}

export function filterTransactionsBySearch(
  transactions: SaleTransaction[],
  searchQuery: string
): SaleTransaction[] {
  const query = searchQuery.toLowerCase().trim()
  if (!query) return transactions

  return transactions.filter(
    (transaction) =>
      transaction.customerName?.toLowerCase().includes(query) ||
      transaction.user?.username.toLowerCase().includes(query) ||
      transaction.id.toLowerCase().includes(query) ||
      transaction.items.some((item) =>
        item.product?.name.toLowerCase().includes(query)
      )
  )
}

export function computeSalesStats(
  dateFilteredTransactions: SaleTransaction[]
): SalesStats {
  const activeTransactions = dateFilteredTransactions.filter(
    (t) => t.status === 'completed' || t.status === 'partially_refunded'
  )

  const totalRevenue = activeTransactions.reduce((sum, transaction) => {
    const refundedAmount = calculateRefundedAmount(transaction.items)
    return sum + (transaction.total - refundedAmount)
  }, 0)

  const totalItems = activeTransactions.reduce(
    (sum, transaction) =>
      sum +
      transaction.items.reduce((itemSum, item) => {
        const activeQuantity = item.quantity - (item.refundedQuantity || 0)
        return itemSum + activeQuantity
      }, 0),
    0
  )

  const avgSale =
    activeTransactions.length > 0
      ? totalRevenue / activeTransactions.length
      : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayTransactions = dateFilteredTransactions.filter((t) => {
    const transactionDate = new Date(t.createdAt)
    return (
      transactionDate >= today &&
      (t.status === 'completed' || t.status === 'partially_refunded')
    )
  })
  const todayRevenue = todayTransactions.reduce((sum, transaction) => {
    const refundedAmount = calculateRefundedAmount(transaction.items)
    return sum + (transaction.total - refundedAmount)
  }, 0)
  const todayCount = todayTransactions.length

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayTransactions = dateFilteredTransactions.filter((t) => {
    const transactionDate = new Date(t.createdAt)
    return (
      transactionDate >= yesterday &&
      transactionDate < today &&
      (t.status === 'completed' || t.status === 'partially_refunded')
    )
  })
  const yesterdayRevenue = yesterdayTransactions.reduce((sum, transaction) => {
    const refundedAmount = calculateRefundedAmount(transaction.items)
    return sum + (transaction.total - refundedAmount)
  }, 0)
  const yesterdayCount = yesterdayTransactions.length

  const revenueChange =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : todayRevenue > 0
        ? 100
        : 0
  const salesChange =
    yesterdayCount > 0
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
      : todayCount > 0
        ? 100
        : 0

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const thisWeekTransactions = dateFilteredTransactions.filter((t) => {
    const transactionDate = new Date(t.createdAt)
    return (
      transactionDate >= startOfWeek &&
      (t.status === 'completed' || t.status === 'partially_refunded')
    )
  })
  const thisWeekRevenue = thisWeekTransactions.reduce((sum, transaction) => {
    const refundedAmount = calculateRefundedAmount(transaction.items)
    return sum + (transaction.total - refundedAmount)
  }, 0)

  const lastWeekStart = new Date(startOfWeek)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(startOfWeek)

  const lastWeekTransactions = dateFilteredTransactions.filter((t) => {
    const transactionDate = new Date(t.createdAt)
    return (
      transactionDate >= lastWeekStart &&
      transactionDate < lastWeekEnd &&
      (t.status === 'completed' || t.status === 'partially_refunded')
    )
  })
  const lastWeekRevenue = lastWeekTransactions.reduce((sum, transaction) => {
    const refundedAmount = calculateRefundedAmount(transaction.items)
    return sum + (transaction.total - refundedAmount)
  }, 0)

  const weeklyRevenueChange =
    lastWeekRevenue > 0
      ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
      : thisWeekRevenue > 0
        ? 100
        : 0

  return {
    totalRevenue,
    totalSales: activeTransactions.length,
    totalItems,
    avgSale,
    todayRevenue,
    todayCount,
    revenueChange,
    salesChange,
    weeklyRevenueChange,
    hasData: activeTransactions.length > 0
  }
}

export function buildSalesCsv(transactions: SaleTransaction[]): string {
  const headers = [
    'Transaction ID',
    'Date',
    'Customer',
    'Items',
    'Total Items',
    'Subtotal',
    'Tax',
    'Total',
    'Payment Method',
    'Status',
    'Sold By'
  ]

  const rows = transactions.map((transaction) => {
    const totalItems = transaction.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    )
    const itemsList = transaction.items
      .map(
        (item) => `${item.product?.name || 'Unknown'} (${item.quantity}x)`
      )
      .join('; ')

    return [
      transaction.id,
      formatDate(transaction.createdAt),
      transaction.customerName || 'Walk-in Customer',
      itemsList,
      totalItems,
      `$${transaction.subtotal.toFixed(2)}`,
      `$${transaction.tax.toFixed(2)}`,
      `$${transaction.total.toFixed(2)}`,
      transaction.paymentMethod,
      transaction.status,
      transaction.user?.username || 'Unknown'
    ]
  })

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
  ].join('\n')
}

export function buildInstallmentsCsv(
  installments: Array<{
    id: string
    amount: number
    dueDate: string | number
    status: string
    paidDate?: string
    saleId?: string
    notes?: string
    customer?: { name: string }
  }>
): string {
  const headers = [
    'Installment ID',
    'Customer',
    'Amount',
    'Due Date',
    'Status',
    'Paid Date',
    'Sale ID',
    'Notes'
  ]

  const rows = installments.map((installment) => [
    installment.id,
    installment.customer?.name || 'Unknown Customer',
    `$${installment.amount.toFixed(2)}`,
    formatDate(String(installment.dueDate)),
    installment.status.charAt(0).toUpperCase() + installment.status.slice(1),
    installment.paidDate ? formatDate(installment.paidDate) : 'Not Paid',
    installment.saleId || 'N/A',
    installment.notes || ''
  ])

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
  ].join('\n')
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}