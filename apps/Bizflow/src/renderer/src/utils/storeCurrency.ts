/**
 * The store's currency, as configured in Settings → General.
 *
 * Settings writes it to `localStorage` under `currency`. Modules that format money
 * used to hardcode `USD`, so an Egyptian store with a dollar sign on its payslips
 * had no way to fix it short of editing source.
 *
 * Subscriptions exist because `localStorage` writes are invisible to React: a
 * settings screen that saves a new currency must repaint the payslips behind it.
 * `useSettings().saveSettings()` dispatches `bizflow:settings:changed`.
 */

import { useEffect, useState } from 'react'

/** Fired after Settings is saved, so currency-dependent screens can re-read. */
export const SETTINGS_CHANGED_EVENT = 'bizflow:settings:changed'

/** Used when the store has never set one, so a figure is never blank. */
export const DEFAULT_CURRENCY = 'USD'

const STORAGE_KEY = 'currency'

/** Currencies Intl knows about. Anything else falls back rather than throwing. */
function isSupported(code: string): boolean {
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(0)
    return true
  } catch {
    return false
  }
}

/** The configured currency code, or the default when unset/invalid. */
export function readStoreCurrency(): string {
  const stored = localStorage.getItem(STORAGE_KEY)?.trim().toUpperCase()
  return stored && isSupported(stored) ? stored : DEFAULT_CURRENCY
}

/** Call after writing the setting so subscribers re-read. */
export function notifyCurrencyChanged(): void {
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT))
}

/** The store currency, re-read whenever Settings is saved. */
export function useStoreCurrency(): string {
  const [currency, setCurrency] = useState(readStoreCurrency)

  useEffect(() => {
    const sync = () => setCurrency(readStoreCurrency())
    window.addEventListener(SETTINGS_CHANGED_EVENT, sync)
    // Fires when another window of the app writes, which a detached window does.
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return currency
}
