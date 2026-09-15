// Language translations for the app (English and Arabic only).
// The two language dictionaries live in ./en and ./ar; this module combines
// them and keeps the original public shape (translations.en / .ar) and types.
import { en } from './en'
import { ar } from './ar'

export const translations = { en, ar }

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.en

const ARABIC: Language = 'ar'

const DICTIONARIES: Record<Language, Record<string, string>> = {
  en: en as Record<string, string>,
  ar: ar as Record<string, string>
}

/**
 * Translates outside React so data modules and helpers never have to hand-roll
 * a two-language lookup. Mirrors the `t()` returned by `useLanguage`: falls back
 * to English (then to the key itself) and supports `{placeholder}` interpolation.
 */
export function translate(
  language: Language = ARABIC,
  key: string,
  params?: Record<string, unknown>
): string {
  let text = DICTIONARIES[language][key] || DICTIONARIES.en[key] || key

  if (params) {
    for (const name of Object.keys(params)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(params[name]))
    }
  }

  return text
}
