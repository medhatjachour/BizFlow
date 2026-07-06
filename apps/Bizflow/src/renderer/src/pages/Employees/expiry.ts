/** Days from today until a date (negative = already past). null when no date. */
export function daysUntil(date?: string | null): number | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

export type ExpiryState = 'none' | 'ok' | 'soon' | 'expired'

/** Classify an expiry date: expired (past), soon (≤ threshold days), ok, or none. */
export function expiryState(date?: string | null, thresholdDays = 30): ExpiryState {
  const n = daysUntil(date)
  if (n === null) return 'none'
  if (n < 0) return 'expired'
  if (n <= thresholdDays) return 'soon'
  return 'ok'
}
