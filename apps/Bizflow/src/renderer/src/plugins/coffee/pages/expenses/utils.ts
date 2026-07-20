import type { Period } from './types'

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function dateRange(period: Period) {
  if (period === 'all') return { startDate: undefined, endDate: undefined }
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (period === 'week')  start.setDate(start.getDate() - 6)
  if (period === 'month') start.setDate(1)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

export function hexToRgba(hex: string, alpha = 0.15): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
