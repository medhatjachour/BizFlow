/**
 * Calculates readable age in years from Date of Birth
 */
export function calculateAge(dateOfBirth?: string | null): string {
  if (!dateOfBirth) return '-'
  const years = Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
  return Number.isFinite(years) && years >= 0 ? `${years}` : '-'
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

/**
 * Formats a default 30-day start date in YYYY-MM-DD
 */
export function getDefaultStartDate(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

/**
 * Formats today's date in YYYY-MM-DD
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}