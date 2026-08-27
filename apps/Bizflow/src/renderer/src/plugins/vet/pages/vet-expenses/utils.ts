import { PeriodPreset } from './types'

export function computeExpenseRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  let fromDate: Date

  switch (preset) {
    case 'today': {
      fromDate = new Date(now)
      fromDate.setHours(0, 0, 0, 0)
      break
    }
    case 'week': {
      fromDate = new Date(now.getTime() - 7 * 86400000)
      break
    }
    case 'year': {
      fromDate = new Date(now.getTime() - 365 * 86400000)
      break
    }
    case 'month':
    default: {
      fromDate = new Date(now.getTime() - 30 * 86400000)
      break
    }
  }

  return { from: fromDate.toISOString(), to }
}

export function formatExpenseMoney(amount: number | string | undefined | null, currency = '$'): string {
  const n = Number(amount) || 0
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatExpenseDate(iso: string | undefined | null, locale = 'en'): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}