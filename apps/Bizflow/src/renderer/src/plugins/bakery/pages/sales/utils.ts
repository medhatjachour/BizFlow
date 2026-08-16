export function formatCurrency(amount: number): string {
  return (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(isoString: string): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysUntil(dateString: string): number {
  return Math.ceil((new Date(dateString).getTime() - Date.now()) / 86400000)
}

export function getExpiryUrgency(earliestExpiry: string | null): 'none' | 'expired' | 'critical' | 'warn' | 'ok' {
  if (!earliestExpiry) return 'none'
  const days = daysUntil(earliestExpiry)
  if (days <= 0) return 'expired'
  if (days <= 1) return 'critical'
  if (days <= 3) return 'warn'
  return 'ok'
}