import type { Period } from './types'

export function periodDates(period: Period): { startDate?: string; endDate?: string } {
  const now = new Date()
  if (period === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    const e = new Date(now); e.setHours(23, 59, 59, 999)
    return { startDate: s.toISOString(), endDate: e.toISOString() }
  }
  if (period === 'week') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0)
    return { startDate: s.toISOString() }
  }
  if (period === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: s.toISOString() }
  }
  return {}
}

export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '0.00'
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return ''
  return `${formatDate(dateStr)} · ${formatTime(dateStr)}`
}

export function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(dateStr)
}

export function getPaymentColor(method?: string): string {
  switch (method) {
    case 'cash': return 'amber'
    case 'card': return 'blue'
    case 'vodafone_cash': return 'rose'
    default: return 'slate'
  }
}

export function exportToCSV(sales: any[], filename = 'sales.csv') {
  const headers = ['Order #', 'Type', 'Payment', 'Customer', 'Table', 'Subtotal', 'Discount', 'Total', 'Items', 'Closed At']
  const rows = sales.map(s => [
    s.orderNumber,
    s.type,
    s.paymentMethod ?? '',
    s.customerName ?? '',
    s.table?.number ?? '',
    s.subtotal,
    s.discount,
    s.total,
    s.items?.length ?? 0,
    s.closedAt ?? ''
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getHourlyPeak(hours?: { hour: number; orders: number }[]): { hour: number; orders: number } | null {
  if (!hours?.length) return null
  return hours.reduce((peak, h) => (h.orders > peak.orders ? h : peak), hours[0])
}
