/**
 * Formatting for the HR module.
 *
 * Why this exists: the module had grown three date styles
 * (`toLocaleDateString()`, `toLocaleDateString('en-GB')`, `toISOString().split('T')[0]`)
 * and a hardcoded `$` interpolated in a dozen places. A payslip and a KPI tile
 * were formatting the same number differently.
 *
 * The language-neutral half of this module (dates, times, counts) now lives in
 * `lib/format.ts` so Settings and the licence screens can share it, and is
 * re-exported below. What stays here is HR-specific: money in the store's
 * currency, and the label/duration helpers that need HR translation keys.
 *
 * Two deliberate decisions, both worth stating out loud:
 *
 * 1. **Money keeps Latin digits, even in Arabic.** A figure somebody is paid has
 *    to match the receipt, the bank file and the payslip — and Arabic-Indic digits
 *    (`١٢٣`) make that reconciliation harder, not easier. Dates, which are read
 *    rather than reconciled, do follow the active language.
 * 2. **Money that is paid is exact; money on a dashboard may be abbreviated.**
 *    `formatMoney` never rounds. `formatMoneyCompact` may show `$1.2K`, and is only
 *    for tiles where the precise figure is available on the screen behind it.
 */

import { useMemo } from 'react'

import { useLanguage } from '../../../contexts/LanguageContext'
import { DEFAULT_CURRENCY, useStoreCurrency } from '../../../utils/storeCurrency'
import { FIGURE_LOCALE, formatCount, formatDate, formatTime, localeFor, toDateInputValue } from '../../../lib/format'

/**
 * Dates and figures are formatted by `lib/format.ts`, which the licence and
 * Settings screens share. Re-exported so the HR screens that already import them
 * from here keep working.
 */
export { formatCount, formatDate, formatTime, toDateInputValue }

/**
 * The currency used when the store has not configured one.
 *
 * Kept as a named export because callers and tests refer to it, but the real value
 * now comes from Settings → General via `useStoreCurrency()`. These are the same
 * constant so there is one place to change.
 */
export const HR_FALLBACK_CURRENCY = DEFAULT_CURRENCY

export interface MoneyOptions {
  currency?: string
  /** Force a number of decimal places. Defaults to 2 for exact, 0 for compact. */
  decimals?: number
}

/** An exact amount: `$1,451.61`. Use for anything anybody is paid. */
export function formatMoney(value: number | null | undefined, options: MoneyOptions = {}): string {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  const decimals = options.decimals ?? 2
  try {
    return new Intl.NumberFormat(FIGURE_LOCALE, {
      style: 'currency',
      currency: options.currency ?? HR_FALLBACK_CURRENCY,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  } catch {
    // An unknown currency code should not blank out a payslip.
    return `${amount.toFixed(decimals)} ${options.currency ?? HR_FALLBACK_CURRENCY}`
  }
}

/** An abbreviated amount: `$1.5K`. Dashboard tiles only — never a payable figure. */
export function formatMoneyCompact(value: number | null | undefined, options: MoneyOptions = {}): string {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  const symbol = symbolFor(options.currency ?? HR_FALLBACK_CURRENCY)
  const abs = Math.abs(amount)
  if (abs >= 1e9) return `${symbol}${(amount / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${symbol}${(amount / 1e6).toFixed(1)}M`
  if (abs >= 10_000) return `${symbol}${(amount / 1e3).toFixed(1)}K`
  return formatMoney(amount, { ...options, decimals: options.decimals ?? 0 })
}

function symbolFor(currency: string): string {
  try {
    const parts = new Intl.NumberFormat(FIGURE_LOCALE, { style: 'currency', currency }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value ?? ''
  } catch {
    return ''
  }
}

/**
 * Money formatters bound to the active language and the store's currency.
 *
 * `currencyOverride` is for the rare caller that must format a figure in a currency
 * other than the store's (a converted total, say). Everything else should omit it
 * and pick up Settings → General automatically.
 */
export function useHrFormat(currencyOverride?: string) {
  const { language } = useLanguage()
  const storeCurrency = useStoreCurrency()
  const currency = currencyOverride ?? storeCurrency

  return useMemo(
    () => ({
      language,
      isAr: language === 'ar',
      currency,
      /** Exact amount — payslips, settlements, balances. */
      money: (value: number | null | undefined, options?: MoneyOptions) =>
        formatMoney(value, { currency, ...options }),
      /** Abbreviated amount — KPI tiles only. */
      moneyCompact: (value: number | null | undefined) => formatMoneyCompact(value, { currency }),
      date: (value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) =>
        formatDate(value, language, options),
      time: (value: string | Date | null | undefined) => formatTime(value, language),
      count: formatCount,
      toDateInput: toDateInputValue,
      /**
       * Month names in the active language, for period pickers.
       * Was a hardcoded `['Jan','Feb',…]` array, so Arabic users picked from an
       * English list.
       */
      monthNames: (format: 'short' | 'long' = 'short') =>
        Array.from({ length: 12 }, (_, i) =>
          new Intl.DateTimeFormat(localeFor(language), { month: format }).format(
            new Date(2000, i, 1)
          )
        ),
    }),
    [language, currency]
  )
}

/**
 * Employment status as a translated label.
 *
 * `Employee.status` is a Latin enum (`active` / `on-leave` / `terminated`) that was
 * being printed straight into the UI, so Arabic screens showed `on-leave`. The map
 * was copied into three components before ending up here; use this one.
 */
export function employeeStatusLabel(
  status: string | null | undefined,
  t: (key: string) => string
): string {
  if (!status) return '—'
  switch (status) {
    case 'active':     return t('empStatusActive')
    case 'on-leave':   return t('empStatusOnLeave')
    case 'terminated': return t('empStatusTerminated')
    default:           return status
  }
}

/** Signature of `useLanguage().t`, so helpers can format without importing the context. */
export type TranslateFn = (key: string, params?: Record<string, any>) => string

/**
 * A duration held as minutes, written the way the active language writes it.
 *
 * Replaces four separate `${h}h ${m}m` templates scattered across the tabs, none
 * of which produced anything sensible in Arabic and all of which silently said
 * "0h" for a shift whose break had eaten it.
 */
export function formatMinutes(minutes: number | null | undefined, t: TranslateFn): string {
  const total = Number.isFinite(Number(minutes)) ? Math.max(0, Math.round(Number(minutes))) : 0
  if (total === 0) return '—'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return t('empDurMinutes', { m })
  if (m === 0) return t('empDurHours', { h })
  return t('empDurHoursMinutes', { h, m })
}

/**
 * Error codes the main process returns for input it refuses, mapped to copy.
 *
 * Handlers can only speak English — they run with no language context — so the
 * renderer looks their stable `code` up here, and falls back to the caller's
 * generic key for anything it does not recognise. The handler's own English
 * `message` is deliberately not shown: it would sit in the middle of the Arabic
 * UI. Callers log it instead when they need the detail.
 */
const HR_ERROR_KEYS: Record<string, string> = {
  expiry_before_issue: 'empDocErrExpiryBeforeIssue',
  invalid_expiry: 'empDocErrInvalidExpiry',
  invalid_issue: 'empDocErrInvalidIssue',
}

export function hrErrorLabel(
  response: { code?: string; message?: string } | null | undefined,
  t: TranslateFn,
  fallbackKey: string
): string {
  const key = response?.code ? HR_ERROR_KEYS[response.code] : undefined
  return key ? t(key) : t(fallbackKey)
}
