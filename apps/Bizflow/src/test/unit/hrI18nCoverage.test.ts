/**
 * Translation coverage for the HR module.
 *
 * `t()` falls back to returning the key itself, so a typo or a renamed key does
 * not throw — it prints "empDocExpiresOn" in the middle of an Arabic screen, in
 * production, and only an Arabic-speaking user notices. Two things guard that:
 *
 *   1. every key the module references must resolve in *both* dictionaries;
 *   2. no HR key may be defined twice across the dictionary parts, because a
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
const partFiles = filesUnder(i18nDir, name => /\.part\.\d+\.ts$/.test(name))

const en = translations.en as Record<string, string | undefined>
const ar = translations.ar as Record<string, string | undefined>

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
    expect(partFiles.length).toBeGreaterThan(5)
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
  it('defines each HR key exactly once per language across the dictionary parts', () => {
    const seen = new Map<string, string[]>()
    const declared = new RegExp(`^\\s{2,6}'?(${HR_KEY_PREFIX}[A-Z][A-Za-z0-9]*)'?\\s*:`, 'gm')
    for (const file of partFiles) {
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
