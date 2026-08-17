/**
 * Safely parses vitals JSON string from database
 */
export function parseVitals(raw?: string | null): Record<string, string> {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Calculates human-readable age from ISO Date of Birth
 */
export function calcAge(dob?: string | null): string {
  if (!dob) return '–'
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  return years >= 0 ? `${years} yrs` : '–'
}

/**
 * Extracts 2-letter initials from full name
 */
export function initials(name: string): string {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * Normalizes paginated response data or simple array to a typed array
 */
export function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown[] }).data)) {
    return (value as { data: T[] }).data
  }
  return []
}

/**
 * Returns a clean Date instance pointing to start of today (00:00:00.000)
 */
export function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

/**
 * Formats byte size into readable KB / MB string
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Formats standard monetary values
 */
export function formatCurrency(amount?: number | null, fallback = '0.00'): string {
  if (amount == null || !Number.isFinite(amount)) return fallback
  return amount.toFixed(2)
}