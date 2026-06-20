// Language translations for the app (English and Arabic only).
// The two language dictionaries live in ./en and ./ar; this module combines
// them and keeps the original public shape (translations.en / .ar) and types.
import { en } from './en'
import { ar } from './ar'

export const translations = { en, ar }

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.en
