import { UNITS_STORAGE_KEY, DEFAULT_UNITS } from './constants'

export function loadStoredUnits(): string[] {
  try {
    const raw = localStorage.getItem(UNITS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return [...DEFAULT_UNITS]
}

export function saveStoredUnits(units: string[]): void {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units))
  } catch {}
}

export function daysUntil(dateString?: string | null): number {
  if (!dateString) return 0
  const target = new Date(dateString).setHours(0, 0, 0, 0)
  const today = new Date().setHours(0, 0, 0, 0)
  return Math.floor((target - today) / 86400000)
}

export function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return '$0.00'
  return `$${value.toFixed(2)}`
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—'
  const d = new Date(dateString)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export function formatAuditChange(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return formatDate(v)
  }
  return String(v)
}