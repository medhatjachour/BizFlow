import { EXPENSE_CATEGORIES, PAYMENT_METHODS, RECURRENCE_OPTIONS } from './constants'

/**
 * Returns localized category label
 */
export function getCategoryLabel(category: string, language: string): string {
  const found = EXPENSE_CATEGORIES.find((c) => c.value === category)
  if (!found) return category.replace(/_/g, ' ')
  return language === 'ar' ? found.labelAr : found.label
}

/**
 * Returns localized payment method label
 */
export function getPaymentMethodLabel(method: string, language: string): string {
  const found = PAYMENT_METHODS.find((m) => m.value === method)
  if (!found) return method
  return language === 'ar' ? found.labelAr : found.label
}

/**
 * Returns localized recurrence label
 */
export function getRecurrenceLabel(recurrence: string, language: string): string {
  const found = RECURRENCE_OPTIONS.find((r) => r.value === recurrence)
  if (!found) return recurrence
  return language === 'ar' ? found.labelAr : found.label
}

/**
 * Formats ISO date string to localized readable date
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Formats numeric monetary amounts with 2 decimals
 */
export function formatMoney(amount?: number | null, fallback = '0.00'): string {
  if (amount == null || !Number.isFinite(amount)) return fallback
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}