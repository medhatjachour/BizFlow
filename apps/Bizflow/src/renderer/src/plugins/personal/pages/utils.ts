// ─── Personal Work: renderer-side formatting helpers ─────────────────────────
// Kept dependency-free so every tab can share the same number, money, duration
// and date rendering without importing the handlers.
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY = '—'

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Currency symbol used across the plugin; mirrors the handler default. */
export const CURRENCY_SYMBOL = '$'

export function formatMoney(value: number | null | undefined, currency = CURRENCY_SYMBOL): string {
  const n = toNumber(value)
  const sign = n < 0 ? '-' : ''
  return `${sign}${currency}${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  return `${formatNumber(toNumber(value), decimals)}%`
}

/** Minutes rendered as `4h 30m`, collapsing to `45m` under an hour. */
export function formatMinutes(value: number | null | undefined): string {
  const total = Math.max(0, Math.round(toNumber(value)))
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function formatHours(value: number | null | undefined): string {
  return `${(toNumber(value) / 60).toFixed(2)}h`
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return EMPTY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return EMPTY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** `2026-02-14` — the `day` key the worklog and heatmap endpoints speak. */
export function toDayKey(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDays(value: string | Date, days: number): Date {
  const date = typeof value === 'string' ? new Date(value) : new Date(value.getTime())
  date.setDate(date.getDate() + days)
  return date
}

/** Whole days from today; negative when the date has already passed. */
export function daysFromToday(value: string | Date | null | undefined): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.round((date.getTime() - start.getTime()) / 86_400_000)
}

export const USAGE_LEVEL_STYLES: Record<string, string> = {
  clear: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  blocked: 'bg-slate-400',
  off: 'bg-slate-200 dark:bg-slate-700'
}

export const USAGE_LEVEL_TEXT_STYLES: Record<string, string> = {
  clear: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-rose-600 dark:text-rose-400',
  blocked: 'text-slate-500 dark:text-slate-400',
  off: 'text-slate-400 dark:text-slate-500'
}

export function levelBadgeVariant(
  level: string
): 'default' | 'secondary' | 'success' | 'destructive' | 'outline' {
  if (level === 'clear') return 'success'
  if (level === 'amber') return 'default'
  if (level === 'red') return 'destructive'
  return 'secondary'
}

export function statusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'success' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
    case 'in_progress':
    case 'approved':
    case 'paid':
    case 'done':
      return 'success'
    case 'overdue':
    case 'cancelled':
    case 'rejected':
    case 'void':
      return 'destructive'
    case 'draft':
    case 'pending':
    case 'todo':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * Reads a `label`/`labelAr`/`id` triple out of the meta taxonomy for a
 * `<select>`. The taxonomy ships both languages, so the caller's current
 * language picks the label — matching how the other plugins read theirs.
 */
export function asSelectOptions(
  options: { id?: string; value?: string; label: string; labelAr?: string }[] | undefined | null,
  language?: string
): { value: string; label: string }[] {
  if (!options) return []
  return options.map((option) => ({
    value: String(option.id ?? option.value ?? ''),
    label: language === 'ar' && option.labelAr ? option.labelAr : option.label
  }))
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Saves a generated document through a `blob:` URL, so exporting never needs an
 * IPC channel or a filesystem path — the download attribute is enough.
 */
export function downloadTextFile(fileName: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking straight away can cancel the transfer in some engines.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Prints a self-contained HTML document (choosing "Save as PDF" in the print
 * dialog is the export path). A `blob:` iframe is used rather than `srcdoc`
 * because the renderer CSP allows `frame-src blob:` and says nothing about
 * inline frames.
 */
export function printHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('tabindex', '-1')
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    URL.revokeObjectURL(url)
    frame.remove()
  }

  frame.onload = () => {
    const win = frame.contentWindow
    if (!win) {
      cleanup()
      return
    }
    win.addEventListener('afterprint', cleanup)
    win.focus()
    win.print()
    // Fallback: some engines never fire `afterprint`.
    window.setTimeout(cleanup, 60_000)
  }

  frame.src = url
  document.body.appendChild(frame)
}
