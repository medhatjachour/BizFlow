import { PeriodPreset, SessionPaymentStatus } from './types'
import { BUILTIN_VISIT_TYPES } from './constants'

export function computeSessionRange(preset: PeriodPreset): { from: string; to: string } {
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

export function formatSessionMoney(amount: number | string | undefined | null, currency = '$'): string {
  const n = Number(amount) || 0
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatSessionDate(iso: string | undefined | null, locale = 'en'): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export function computeSessionPaymentStatus(charged: number, paid: number, waived: boolean): SessionPaymentStatus {
  if (waived) return 'waived'
  if (charged > 0 && paid >= charged) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

export function getVisitTypeLabel(type: string, locale = 'en'): string {
  const item = BUILTIN_VISIT_TYPES.find((v) => v.value === type)
  if (item) return locale === 'ar' ? item.labelAr : item.labelEn
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}