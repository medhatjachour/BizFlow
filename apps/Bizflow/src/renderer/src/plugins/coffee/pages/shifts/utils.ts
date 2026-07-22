import type { Shift, Preset } from './types'

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

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

export function applyPreset(preset: Preset): { from: string; to: string } {
  if (preset === 'all') return { from: '', to: '' }
  const to = endOfToday()
  const from = startOfToday()
  if (preset === 'week')  from.setDate(from.getDate() - 6)
  if (preset === 'month') from.setDate(1)
  return { from: fmtDate(from), to: fmtDate(to) }
}

export function shiftDurationMinutes(shift: Shift): number {
  const end = shift.closedAt ? new Date(shift.closedAt) : new Date()
  return Math.floor((end.getTime() - new Date(shift.openedAt).getTime()) / 60000)
}

export function shiftDuration(shift: Shift): string {
  const mins = shiftDurationMinutes(shift)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function shiftDurationDetailed(shift: Shift): string {
  const mins = shiftDurationMinutes(shift)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} minutes`
  if (m === 0) return `${h} hour${h > 1 ? 's' : ''}`
  return `${h}h ${m}m`
}

export function shiftDurationSeconds(shift: Shift): string {
  const end = shift.closedAt ? new Date(shift.closedAt) : new Date()
  const totalSecs = Math.floor((end.getTime() - new Date(shift.openedAt).getTime()) / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function avgOrdersPerHour(shift: Shift): string {
  const mins = Math.max(shiftDurationMinutes(shift), 1)
  return (shift.totalOrders / (mins / 60)).toFixed(1)
}

export function avgTicket(shift: Shift): string {
  return shift.totalOrders > 0
    ? (shift.totalSales / shift.totalOrders).toFixed(2)
    : '0.00'
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function varianceColor(v: number): string {
  if (v < 0) return 'text-red-500'
  if (v > 0) return 'text-blue-600'
  return 'text-emerald-600'
}

export function varianceBg(v: number): string {
  if (v < 0) return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  if (v > 0) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
  return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
}

export function varianceLabel(v: number): { label: string; sub: string } {
  if (v === 0) return { label: 'Balanced', sub: 'Drawer matches expected amount' }
  if (v > 0)   return { label: `Over by ${formatMoney(v)}`, sub: 'More cash than expected' }
  return { label: `Short by ${formatMoney(Math.abs(v))}`, sub: 'Less cash than expected' }
}
