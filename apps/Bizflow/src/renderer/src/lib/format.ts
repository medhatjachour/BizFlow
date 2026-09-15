/**
 * Locale-aware date and number formatting for the whole renderer.
 *
 * Promoted out of `pages/Employees/ui/hrFormat.ts` because the need is not
 * specific to HR: Settings and the licence screens must answer the same two
 * questions the same way.
 *
 * Two rules, both learned the hard way:
 *
 * 1. **Never call `toLocale*` from a component.** The machine's locale decides
 *    the output, so the same date renders differently on two computers, and the
 *    `ar` locale emits bidi marks that leak into copied text. Everything goes
 *    through here, keyed off the *active language*, not the OS.
 * 2. **Money keeps Latin digits, even in Arabic.** A figure somebody is paid has
 *    to match the receipt and the bank file. Dates, which are read rather than
 *    reconciled, do follow the active language.
 */

/** Locale for Arabic copy. */
export const ARABIC_LOCALE = 'ar'
/** Locale for English copy. `en-GB` on purpose: the target market is day-first. */
export const LATIN_LOCALE = 'en-GB'
/** Digits stay Latin in figures regardless of language — see the note above. */
export const FIGURE_LOCALE = 'en-US'

/** What a null / unparseable value renders as. */
export const EMPTY_VALUE = '—'

/** Default date shape: `14 Sept 2026`. */
export const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

export function localeFor(language: string | null | undefined): string {
  return language === 'ar' ? ARABIC_LOCALE : LATIN_LOCALE
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `14 Sept 2026`, in the active language. */
export function formatDate(
  value: string | Date | null | undefined,
  language = 'en',
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  const date = toDate(value)
  if (!date) return EMPTY_VALUE
  try {
    return new Intl.DateTimeFormat(localeFor(language), options).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

/** `17:05`, in the active language. */
export function formatTime(value: string | Date | null | undefined, language = 'en'): string {
  const date = toDate(value)
  if (!date) return EMPTY_VALUE
  try {
    return new Intl.DateTimeFormat(localeFor(language), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString().slice(11, 16)
  }
}

/**
 * `14 Sept 2026, 17:05`, in the active language.
 *
 * The pairing matters for audit trails — a timestamp read apart from its clock
 * time is ambiguous across a shift change, which is the only place this shows up.
 * `join` keeps the two halves in logical order so an RTL renderer places the
 * separator correctly.
 */
export function formatDateTime(
  value: string | Date | null | undefined,
  language = 'en',
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  const date = toDate(value)
  if (!date) return EMPTY_VALUE
  const separator = language === 'ar' ? '، ' : ', '
  return `${formatDate(date, language, options)}${separator}${formatTime(date, language)}`
}

/** `2026-09-14` — the value an `<input type="date">` expects. */
export function toDateInputValue(value: string | Date | null | undefined): string {
  const date = toDate(value)
  return date ? date.toISOString().slice(0, 10) : ''
}

/** `1,234`. */
export function formatCount(value: number | null | undefined): string {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  return amount.toLocaleString(FIGURE_LOCALE)
}

