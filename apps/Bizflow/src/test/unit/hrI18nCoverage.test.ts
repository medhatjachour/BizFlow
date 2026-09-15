/**
 * Translation coverage for the HR module.
 *
 * `t()` falls back to returning the key itself, so a typo or a renamed key does
 * not throw — it prints "empDocExpiresOn" in the middle of an Arabic screen, in
 * production, and only an Arabic-speaking user notices. Two things guard that:
 *
 *   1. every key the module references must resolve in *both* dictionaries;
 *   2. no HR key may be defined twice across the dictionary files, because a
 *      spread later in the file silently wins and the earlier string disappears;
 *   3. no screen may branch on the language to pick its own copy, and no screen
 *      may format a date or a figure without going through `ui/hrFormat.ts`.
 *
 * The key list is extracted from the source rather than hand-maintained, so
 * adding a screen without its translation fails here.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { arEmployee } from '../../renderer/src/i18n/ar.employee'
import { enEmployee } from '../../renderer/src/i18n/en.employee'
import { translations } from '../../renderer/src/i18n/translations'

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')
const hrDir = join(rendererSrc, 'pages', 'Employees')
const i18nDir = join(rendererSrc, 'i18n')

function filesUnder(dir: string, filter: (name: string) => boolean): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...filesUnder(full, filter))
    else if (filter(entry)) found.push(full)
  }
  return found
}

const hrFiles = filesUnder(hrDir, name => /\.tsx?$/.test(name))
// The numbered parts, plus the merged per-domain dictionaries: HR copy lives in
// `{en,ar}.employee.ts` and must not be declared a second time anywhere else.
const dictionaryFiles = filesUnder(
  i18nDir,
  name => /\.part\.\d+\.ts$/.test(name) || /\.(employee|settings)\.ts$/.test(name)
)

const en = translations.en as Record<string, string | undefined>
const ar = translations.ar as Record<string, string | undefined>

/** Arabic letters — used to catch copy filed under the wrong language. */
const ARABIC_SCRIPT = /[\u0600-\u06FF]/

/**
 * Keys whose copy is deliberately the same in both languages: a sample address
 * or a score range carries no prose, so the "an Arabic file holds Arabic
 * characters" rule steps around it.
 */
const TECHNICAL_EXAMPLES: Record<string, string> = {
  emailPlaceholder: 'a sample address, not prose',
  phonePlaceholder: 'a sample phone number, not prose',
  empFormEmailPlaceholder: 'a sample address, not prose',
  empFormScorePlaceholder: 'a score range, not prose'
}

/** The namespaces this test polices: employee screens, tabs, lifecycle, panels. */
const HR_KEY_PREFIX = '(?:emp|tab|lc|hr)'

/** Keys referenced as `t('key')`, plus bare `'empX'` / `'tabX'` / `'lcX'` map values. */
function referencedKeys(source: string): string[] {
  const keys: string[] = []
  for (const match of source.matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'/g)) keys.push(match[1])
  const bare = new RegExp(`'(${HR_KEY_PREFIX}[A-Z][A-Za-z0-9]*)'`, 'g')
  for (const match of source.matchAll(bare)) keys.push(match[1])
  return keys
}

describe('HR screen translations', () => {
  it('reads every HR source file it is supposed to police', () => {
    expect(hrFiles.length).toBeGreaterThan(10)
    expect(dictionaryFiles.length).toBeGreaterThan(20)
  })

  const referenced = (() => {
    const byKey = new Map<string, Set<string>>()
    for (const file of hrFiles) {
      for (const key of referencedKeys(readFileSync(file, 'utf8'))) {
        const where = byKey.get(key) ?? new Set<string>()
        where.add(relative(hrDir, file))
        byKey.set(key, where)
      }
    }
    return byKey
  })()

  it('finds the keys to check', () => {
    expect(referenced.size).toBeGreaterThan(50)
  })

  const missingEn: string[] = []
  const missingAr: string[] = []
  for (const [key, where] of referenced) {
    const seen = `${key} (${Array.from(where).join(', ')})`
    if (!en[key]) missingEn.push(seen)
    if (!ar[key]) missingAr.push(seen)
  }

  it('has no key that renders untranslated in English', () => {
    expect(missingEn).toEqual([])
  })

  it('has no key that renders untranslated in Arabic', () => {
    expect(missingAr).toEqual([])
  })
})

describe('HR dictionary integrity', () => {
  it('defines each HR key exactly once per language across the dictionary files', () => {
    const seen = new Map<string, string[]>()
    const declared = new RegExp(`^\\s{2,6}'?(${HR_KEY_PREFIX}[A-Z][A-Za-z0-9]*)'?\\s*:`, 'gm')
    for (const file of dictionaryFiles) {
      const name = relative(i18nDir, file)
      const language = name.split('.')[0]
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(declared)) {
        const id = `${language}:${match[1]}`
        const list = seen.get(id) ?? []
        list.push(name)
        seen.set(id, list)
      }
    }
    const duplicated = Array.from(seen.entries())
      .filter(([, files]) => files.length > 1)
      .map(([id, files]) => `${id} defined in ${files.join(', ')}`)
    expect(duplicated).toEqual([])
  })
})

/**
 * HR copy used to be scattered over the numbered parts. It is one file per
 * language now, and this keeps the two files honest: same key list, no empty
 * strings, no English left standing in the Arabic file, no placeholder that
 * exists on one side only.
 */
describe('The Employee dictionary ships identically in both languages', () => {
  const keys = Object.keys(enEmployee).sort()

  it('ships the same keys in both files', () => {
    expect(Object.keys(arEmployee).sort()).toEqual(keys)
    expect(keys.length).toBeGreaterThan(700)
  })

  it('carries copy for every key', () => {
    const empty = keys.filter(key => enEmployee[key].trim() === '' || arEmployee[key].trim() === '')
    expect(empty, `keys with no copy: ${empty.join(', ')}`).toEqual([])
  })

  it('actually translates every key', () => {
    const untranslated = keys.filter(
      key => arEmployee[key] === enEmployee[key] && !(key in TECHNICAL_EXAMPLES)
    )
    expect(untranslated, `keys still carrying English copy: ${untranslated.join(', ')}`).toEqual([])
  })

  it('keeps each language on its own side', () => {
    const englishHoldingArabic = keys.filter(key => ARABIC_SCRIPT.test(enEmployee[key]))
    expect(
      englishHoldingArabic,
      `English entries holding Arabic copy: ${englishHoldingArabic.join(', ')}`
    ).toEqual([])

    const arabicHoldingEnglish = keys.filter(
      key =>
        /[A-Za-z]/.test(enEmployee[key]) &&
        !ARABIC_SCRIPT.test(arEmployee[key]) &&
        !(key in TECHNICAL_EXAMPLES)
    )
    expect(
      arabicHoldingEnglish,
      `Arabic entries holding no Arabic copy: ${arabicHoldingEnglish.join(', ')}`
    ).toEqual([])
  })

  it('declares the same placeholders in both languages', () => {
    const placeholdersOf = (value: string): string =>
      Array.from(
        value.matchAll(/\{([A-Za-z_$][\w$]*)\}/g),
        match => match[1]
      ).join()
    const mismatched = keys.filter(
      key => placeholdersOf(arEmployee[key]) !== placeholdersOf(enEmployee[key])
    )
    expect(mismatched, `keys with differing placeholders: ${mismatched.join(', ')}`).toEqual([])
  })

  it('writes the Arabic file as UTF-8 with no byte order mark', () => {
    const bytes = readFileSync(join(i18nDir, 'ar.employee.ts'))
    expect([bytes[0], bytes[1], bytes[2]]).not.toEqual([0xef, 0xbb, 0xbf])
  })
})

/**
 * Two ways copy used to bypass the dictionary. Both still "work" — they just
 * only ever work for exactly two languages, and no translation tool can see
 * them — so they need a test rather than a code review.
 */
describe('HR screens do not hardcode language choices', () => {
  const sources = hrFiles
    // `ui/hrFormat.ts` is where the Intl calls are supposed to live.
    .filter(file => !join(hrDir, 'ui', 'hrFormat.ts').endsWith(file))
    .map(file => ({
      file: relative(hrDir, file),
      source: readFileSync(file, 'utf8'),
    }))

  const offendersOf = (pattern: RegExp): string[] =>
    sources
      .map(({ file, source }) =>
        source
          .split('\n')
          .map((line, index) => ({ line, number: index + 1 }))
          .filter(({ line }) => pattern.test(line))
          .map(({ number }) => `${file}:${number}`)
      )
      .flat()

  it('uses no isAr / language ternary to pick displayed copy', () => {
    // `fmt.isAr` (a layout flag) is allowed; `isAr ? 'عربي' : 'English'` is not.
    expect(offendersOf(/(^|[^.\w])isAr\s*\?/)).toEqual([])
  })

  it('formats no date or number with a raw toLocale* call', () => {
    // Dates and figures go through useHrFormat(), which follows the active
    // language and the store's currency instead of the machine's settings.
    expect(offendersOf(/toLocale(Date|Time)?String\s*\(/)).toEqual([])
  })
})
