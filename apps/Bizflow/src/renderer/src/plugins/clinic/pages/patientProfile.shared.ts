// Pure presentation helpers for the clinic Patient Profile page.

export function parseVitals(raw?: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

export function calcAge(dob?: string | null): string {
  if (!dob) return '–'
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))} yrs`
}

export function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export function toArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data as T[]
  }
  return []
}

export function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}
