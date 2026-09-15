/**
 * Settings and licence screens: no hardcoded language choices, no raw date or
 * number formatting.
 *
 * The licence panel and the software-update block were English strings baked
 * into JSX inside an otherwise-translated screen, and licence dates went through
 * a hand-written `toLocaleDateString(isAr ? 'ar' : 'en-GB')` that emitted bidi
 * marks into text the user copies out. Neither regression was visible to the HR
 * coverage test, because that one only reads `pages/Employees/**`.
 *
 * This file polices the licence surface and the Settings directory. Most of the
 * Settings directory still carries the same anti-pattern in older screens
 * (Backup, Email Reports, Tax & Receipts), so that backlog is frozen by count
 * rather than ignored: it is allowed to shrink, never to grow. Lower the caps as
 * the backlog is paid down; never raise one without saying why in the commit.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MODULE_REGISTRY } from '../../shared/modules'
import { ar } from '../../renderer/src/i18n/ar'
import { arPart14 } from '../../renderer/src/i18n/ar.part.14'
import { en } from '../../renderer/src/i18n/en'
import { enPart14 } from '../../renderer/src/i18n/en.part.14'

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')
const i18nSrc = join(rendererSrc, 'i18n')

function filesUnder(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...filesUnder(full))
    else if (/\.tsx?$/.test(entry)) found.push(full)
  }
  return found
}

/**
 * Drop block comments and comment-only lines. The code that was fixed documents
 * the very pattern it removed (`toLocaleDateString('ar')`), and a scan that
 * cannot tell a comment from code would punish writing the reason down.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
}

interface Offender {
  file: string
  line: number
  text: string
}

const formatOffenders = (offenders: Offender[]): string[] =>
  offenders.map(o => `${o.file}:${o.line} — ${o.text}`)

function scan(dir: string, pattern: RegExp): Offender[] {
  const offenders: Offender[] = []
  for (const file of filesUnder(dir)) {
    stripComments(readFileSync(file, 'utf8'))
      .split('\n')
      .forEach((line, index) => {
        if (pattern.test(line)) {
          offenders.push({ file: relative(rendererSrc, file), line: index + 1, text: line.trim() })
        }
      })
  }
  return offenders
}

function scanFiles(files: string[], dir: string, pattern: RegExp): Offender[] {
  const offenders: Offender[] = []
  for (const file of files) {
    stripComments(readFileSync(join(dir, file), 'utf8'))
      .split('\n')
      .forEach((line, index) => {
        if (pattern.test(line)) offenders.push({ file, line: index + 1, text: line.trim() })
      })
  }
  return offenders
}

const settingsDir = join(rendererSrc, 'pages', 'Settings')
const licenseDir = join(rendererSrc, 'components', 'license')
const formatFile = join(rendererSrc, 'lib', 'format.ts')

/** `isAr ? 'عربي' : 'English'` — copy that can only ever support two languages. */
const LITERAL_TERNARY = /(^|[^.\w])isAr\s*\?\s*['`"]/
/** A raw Intl call — dates, times and figures belong to `lib/format.ts`. */
const RAW_LOCALE = /toLocale(Date|Time)?String\s*\(/

const licenseTernaries = scan(licenseDir, LITERAL_TERNARY)
const licenseLocale = scan(licenseDir, RAW_LOCALE)
const settingsTernaries = scan(settingsDir, LITERAL_TERNARY)
const settingsLocale = scan(settingsDir, RAW_LOCALE)

describe('The licence surface is fully translatable', () => {
  it('reads the directory it is supposed to police', () => {
    expect(filesUnder(licenseDir).length).toBeGreaterThan(3)
  })

  it('picks no displayed copy with a language ternary', () => {
    expect(formatOffenders(licenseTernaries)).toEqual([])
  })

  it('formats no date or number with a raw Intl call', () => {
    expect(formatOffenders(licenseLocale)).toEqual([])
  })

  // The two screens rebuilt in this change are asserted at zero on their own, so
  // they cannot quietly regress behind the directory-wide cap below.
  const rebuilt = scanFiles(['LicenseActivation.tsx', 'GeneralSettings.tsx'], settingsDir, LITERAL_TERNARY)
  const rebuiltLocale = scanFiles(['LicenseActivation.tsx', 'GeneralSettings.tsx'], settingsDir, RAW_LOCALE)

  it('uses no bilingual ternary in the rebuilt settings screens', () => {
    expect(formatOffenders(rebuilt)).toEqual([])
  })

  it('formats no date with a raw Intl call in the rebuilt settings screens', () => {
    expect(formatOffenders(rebuiltLocale)).toEqual([])
  })
})

describe('The Settings backlog is frozen, not ignored', () => {
  it('keeps the language-ternary count from growing', () => {
    // Measured after the licence panel and the software-update block were moved
    // onto dictionary keys.
    const SETTINGS_TERNARY_CAP = 133
    const found = settingsTernaries.length
    expect(
      found,
      `Settings language ternaries grew to ${found}:\n${formatOffenders(settingsTernaries).join('\n')}`
    ).toBeLessThanOrEqual(SETTINGS_TERNARY_CAP)
  })

  it('keeps the raw Intl count from growing', () => {
    const SETTINGS_LOCALE_CAP = 3
    const found = settingsLocale.length
    expect(
      found,
      `Settings raw toLocale* calls grew to ${found}:\n${formatOffenders(settingsLocale).join('\n')}`
    ).toBeLessThanOrEqual(SETTINGS_LOCALE_CAP)
  })
})

describe('lib/format.ts is the single formatting module', () => {
  const source = readFileSync(formatFile, 'utf8')

  it('is the module that owns the Intl calls', () => {
    expect(RAW_LOCALE.test(source)).toBe(true)
  })

  it('drives every formatter from the active language', () => {
    expect(source).toMatch(/export function localeFor/)
    expect(source).toMatch(/export function formatDate/)
    expect(source).toMatch(/export function formatTime/)
    expect(source).toMatch(/export function formatCount/)
  })
})

// ─── Settings → Modules ──────────────────────────────────────────────────────
//
// This screen was the last page in Settings that was English end to end: an
// Arabic build rendered "Business Modules", "Enable"/"Disable", and English
// module names, descriptions and feature bullets. Its copy now lives in two
// halves — the chrome in `i18n/*.part.14`, the module metadata in
// `src/shared/modules.ts` — and both halves are asserted below.

const modulesScreenFile = join(settingsDir, 'ModulesSettings.tsx')
const modulesScreen = stripComments(readFileSync(modulesScreenFile, 'utf8'))

/** Latin copy sitting between two tags, e.g. `>Software update<`. */
const JSX_TEXT_COPY = />\s*([A-Za-z][A-Za-z0-9 ,.'&()/-]*[A-Za-z0-9.?!])\s*</
/** Copy in a user-visible attribute instead of a `t()` call. */
const LITERAL_COPY_ATTR = /\b(title|placeholder|aria-label|alt|label)="[^"]*[A-Za-z]{2}/

/** All matches of `pattern` (applied fresh, so lastIndex never leaks). */
function matches(source: string, pattern: RegExp): string[][] {
  const found: string[][] = []
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    found.push(match.slice())
    if (match.index === re.lastIndex) re.lastIndex++
  }
  return found
}

function jsxCopyOffenders(source: string): string[] {
  const offenders = matches(source, JSX_TEXT_COPY).map(m => m[1].trim())
  source.split('\n').forEach((line, index) => {
    if (LITERAL_COPY_ATTR.test(line)) offenders.push(`line ${index + 1}: ${line.trim()}`)
  })
  return offenders
}

/** Every `mods…` dictionary key the screen references, from `t()` or a map. */
const moduleScreenKeys = [
  ...new Set(matches(modulesScreen, /'(mods[A-Za-z0-9]*)'/).map(m => m[1])),
].sort()

/** The palette the screen can actually render. */
const paletteSource = modulesScreen.slice(
  modulesScreen.indexOf('const COLOR_MAP'),
  modulesScreen.indexOf('\n}', modulesScreen.indexOf('const COLOR_MAP'))
)
const COLOR_PALETTE = matches(paletteSource, /^\s{2}([a-z]+):\s*\{/m).map(m => m[1])

describe('The Modules screen is translated, not just translated-looking', () => {
  it('scans the screen it is supposed to police', () => {
    expect(modulesScreen).toContain('moduleMetaText')
    expect(moduleScreenKeys.length).toBeGreaterThanOrEqual(20)
  })

  it('would notice English copy if it came back', () => {
    // Non-vacuity: the pattern must catch the exact shape of the regression.
    expect(jsxCopyOffenders('<p title="Show details">Software update</p>')).toEqual([
      'Software update',
      'line 1: <p title="Show details">Software update</p>',
    ])
    expect(jsxCopyOffenders('<p>{t(\'modsTitle\')}</p>')).toEqual([])
  })

  it('leaves no English literal in JSX text or in a visible attribute', () => {
    expect(jsxCopyOffenders(modulesScreen)).toEqual([])
  })

  it('resolves every key it renders in both dictionaries', () => {
    const missing = moduleScreenKeys.filter(
      key => typeof en[key] !== 'string' || typeof ar[key] !== 'string' || ar[key] === ''
    )
    expect(missing, `keys with no English or Arabic copy: ${missing.join(', ')}`).toEqual([])
  })

  it('renders every registry colour through a palette entry that exists', () => {
    // `gym` asked for `orange` and `pharmacy` for `emerald` while the map only
    // had six colours, so both silently rendered as blue.
    expect(COLOR_PALETTE.length).toBeGreaterThanOrEqual(6)
    const unmapped = Object.values(MODULE_REGISTRY)
      .filter(meta => !COLOR_PALETTE.includes(meta.color))
      .map(meta => `${meta.id} → ${meta.color}`)
    expect(unmapped, `colours with no COLOR_MAP entry: ${unmapped.join(', ')}`).toEqual([])
  })
})

describe('Every module carries its own Arabic copy', () => {
  const entries = Object.values(MODULE_REGISTRY)

  it('covers the whole registry', () => {
    expect(entries.length).toBeGreaterThanOrEqual(9)
  })

  it('names and describes each module in Arabic', () => {
    for (const meta of entries) {
      expect(meta.nameAr, `${meta.id} has no Arabic name`).toBeTruthy()
      expect(meta.descriptionAr, `${meta.id} has no Arabic description`).toBeTruthy()
      expect(meta.nameAr, `${meta.id} reused the English name`).not.toBe(meta.name)
      expect(meta.descriptionAr, `${meta.id} reused the English description`).not.toBe(
        meta.description
      )
    }
  })

  it('keeps the Arabic feature list the same length as the English one', () => {
    for (const meta of entries) {
      expect(
        meta.featuresAr.length,
        `${meta.id}: ${meta.features.length} English features vs ${meta.featuresAr.length} Arabic`
      ).toBe(meta.features.length)
      for (const feature of meta.featuresAr) {
        expect(feature.trim(), `${meta.id} has an empty Arabic feature`).not.toBe('')
      }
    }
  })
})

describe('The Modules dictionary ships identically in both languages', () => {
  const enKeys = Object.keys(enPart14).sort()
  const arKeys = Object.keys(arPart14).sort()

  it('ships the same keys in both files', () => {
    expect(arKeys).toEqual(enKeys)
    expect(enKeys.length).toBeGreaterThanOrEqual(25)
  })

  it('actually translates every key', () => {
    const untranslated = enKeys.filter(key => arPart14[key] === enPart14[key])
    expect(untranslated, `keys still carrying English copy: ${untranslated.join(', ')}`).toEqual([])
  })

  it('keeps everything else in the dictionary too', () => {
    // A key added to `en.part.14` but forgotten in the merged dictionaries would
    // fall back to the key name on screen.
    const orphaned = enKeys.filter(key => !(key in en) || !(key in ar))
    expect(orphaned, `keys missing from the merged dictionaries: ${orphaned.join(', ')}`).toEqual([])
  })

  it('writes the Arabic file as UTF-8 with no byte order mark', () => {
    // A BOM on this file makes the first key `\ufeffmodsTitle` and silently
    // blanks the whole file's first string literal.
    const bytes = readFileSync(join(i18nSrc, 'ar.part.14.ts'))
    expect([bytes[0], bytes[1], bytes[2]]).not.toEqual([0xef, 0xbb, 0xbf])
  })
})
