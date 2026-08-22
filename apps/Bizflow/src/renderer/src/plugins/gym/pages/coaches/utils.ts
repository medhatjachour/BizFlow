import { SalaryType } from './types'

export function formatSalary(amount?: number | null, type?: SalaryType): string {
  if (amount == null || isNaN(amount)) return '—'
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const suffixMap: Record<SalaryType, string> = {
    monthly: '/ mo',
    hourly: '/ hr',
    per_session: '/ session'
  }
  return `$${formatted} ${type ? suffixMap[type] : ''}`
}

export function formatDateLabel(isoDate: string): string {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function getWeekRange(offsetWeeks = 0): { start: Date; end: Date; label: string } {
  const now = new Date()
  const currentDay = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const label = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return { start: monday, end: sunday, label }
}