import { CATEGORY_BADGES } from './constants'

/**
 * Formats monetary amounts with fixed 2 decimals and thousands separators
 */
export function formatMoney(amount?: number | null, fallback = '0.00'): string {
  if (amount == null || !Number.isFinite(amount)) return fallback
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Formats rounded integer counts
 */
export function formatCount(count?: number | null): string {
  if (count == null || !Number.isFinite(count)) return '0'
  return count.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

/**
 * Returns badge class for an expense category
 */
export function getCategoryBadgeClass(category: string): string {
  return CATEGORY_BADGES[category] ?? CATEGORY_BADGES.other
}

/**
 * Formats initials from patient name
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Normalizes paginated or array payloads to typed array
 */
export function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown[] }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}