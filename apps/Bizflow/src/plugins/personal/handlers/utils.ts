// ─── Personal Work: Handler utilities ────────────────────────────────────────
// Small pure helpers shared by the personal-work handlers.
// ─────────────────────────────────────────────────────────────────────────────

/** Midnight of the given day (local time) — the bucket key used by work logs. */
export function startOfDay(input: Date | string = new Date()): Date {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
  return d
}

/** `YYYY-MM-DD` in local time. */
export function dayKey(input: Date | string = new Date()): string {
  const d = new Date(input)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Inclusive list of `YYYY-MM-DD` keys between two dates. */
export function dayKeysBetween(from: Date | string, to: Date | string): string[] {
  const start = startOfDay(from)
  const end = startOfDay(to)
  const out: string[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(dayKey(d))
  }
  return out
}

export function addDays(input: Date | string, days: number): Date {
  const d = new Date(input)
  d.setDate(d.getDate() + days)
  return d
}

/** Whole days between two dates (never negative). */
export function daysBetween(from: Date | string, to: Date | string): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function parseJsonArray<T = string>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (typeof raw !== 'string' || raw.trim() === '') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function toDate(value: unknown): Date | null {
  if (!value) return null
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

export function monthBounds(input: Date | string = new Date()): { start: Date; end: Date } {
  const d = new Date(input)
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function weekBounds(input: Date | string = new Date()): { start: Date; end: Date } {
  const d = startOfDay(input)
  const dow = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - dow)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Standard list envelope used by every personal list endpoint. */
export function paginate<T>(items: T[], total: number, page = 1, pageSize = 50) {
  return {
    data: items,
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
}

export function nextInvoiceNumber(seq: number, prefix = 'INV'): string {
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}
