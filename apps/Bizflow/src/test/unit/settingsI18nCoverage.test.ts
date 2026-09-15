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
 * This file polices the licence surface and the Settings directory. Older
 * Settings screens (Backup & Restore, Email Reports, Tax & Receipts) used to
 * carry a hand-rolled "bilingual dictionary" — `t('key') || (isAr ? 'عربي' :
 * 'English')` — which could never be translated without a code change. They now
 * read from the shared dictionaries, so the count is asserted at zero and the
 * caps stay at zero: a new language ternary or a raw `toLocale*` call in
 * Settings fails this test rather than quietly joining a backlog.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MODULE_REGISTRY } from '../../shared/modules'
import { ar } from '../../renderer/src/i18n/ar'
import { arSettings } from '../../renderer/src/i18n/ar.settings'
import { en } from '../../renderer/src/i18n/en'
import { enSettings } from '../../renderer/src/i18n/en.settings'
import { translate } from '../../renderer/src/i18n/translations'

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

/** Any Arabic letter — used to catch copy filed under the wrong language. */
const ARABIC_SCRIPT = /[\u0600-\u06FF]/
/** `{list}` and friends, in declaration order. */
const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{([A-Za-z_$][\w$]*)\}/g)].map(m => m[1])

/**
 * Keys whose template deliberately drops a placeholder in one language, with
 * the reason. `permSensitiveOne` is only rendered when the count is exactly 1
 * (`PermissionMatrix.tsx` branches on `page.actions.length === 1`), and Arabic
 * writes that as a word — `إجراء حساس واحد` — rather than as a numeral.
 */
const omittedPlaceholders: Record<string, string> = {
  permSensitiveOne: 'Arabic spells out the count (always 1) instead of printing it'
}

/**
 * Keys whose copy is deliberately identical in both languages, with the reason.
 * A product name and a sample address do not translate, so the "every key is
 * translated" and "Arabic copy holds Arabic characters" rules step around these
 * two rather than being relaxed for the whole file.
 */
const sameInBothLanguages: Record<string, string> = {
  updVersionValue: 'the product name is a proper noun — only the version varies',
  umEmailPlaceholder: 'a sample address, not prose'
}

/** Property names of a `t('key', { … })` argument, shorthand included. */
function passedParams(inner: string): string[] {
  return splitTopLevel(inner)
    .filter(part => part !== '' && !part.startsWith('...'))
    .map(part => {
      let name = ''
      let depth = 0
      let quote = ''
      for (const char of part) {
        if (quote) {
          if (char === quote) quote = ''
          continue
        }
        if (char === "'" || char === '"' || char === '`') {
          quote = char
          continue
        }
        if (char === '(' || char === '[' || char === '{') depth++
        else if (char === ')' || char === ']' || char === '}') depth--
        else if (char === ':' && depth === 0) break
        name += char
      }
      return name.trim()
    })
    .filter(name => name !== '')
}

/** Split on commas that sit outside nested calls, arrays and string literals. */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let quote = ''
  for (const char of inner) {
    if (quote) {
      current += char
      if (char === quote) quote = ''
      continue
    }
    if (char === "'" || char === '"' || char === '`') quote = char
    else if (char === '(' || char === '[' || char === '{') depth++
    else if (char === ')' || char === ']' || char === '}') depth--
    else if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim() !== '') parts.push(current.trim())
  return parts
}

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

describe('The Settings backlog is cleared, and stays cleared', () => {
  it('picks no displayed copy with a language ternary', () => {
    // Measured after Backup & Restore, Email Reports and Tax & Receipts were
    // moved off their local `isAr ? … : …` lookup objects onto dictionary keys,
    // and `userMangement/utils.ts` onto `translate(language, key)`.
    const SETTINGS_TERNARY_CAP = 0
    const found = settingsTernaries.length
    expect(
      found,
      `Settings language ternaries grew to ${found}:\n${formatOffenders(settingsTernaries).join('\n')}`
    ).toBeLessThanOrEqual(SETTINGS_TERNARY_CAP)
  })

  it('formats no date or number with a raw Intl call', () => {
    const SETTINGS_LOCALE_CAP = 0
    const found = settingsLocale.length
    expect(
      found,
      `Settings raw toLocale* calls grew to ${found}:\n${formatOffenders(settingsLocale).join('\n')}`
    ).toBeLessThanOrEqual(SETTINGS_LOCALE_CAP)
  })

  // The per-screen patterns from `ModulesSettings.tsx`, applied to every file in
  // the directory. `JSX_TEXT_COPY` deliberately excludes `(`, `)`, `=` and `[`
  // so that a TypeScript generic in an inline handler — `setTheme(newTheme as
  // Parameters<typeof setTheme>[0])` — is not read as prose.
  const SETTINGS_JSX_COPY = />\s*([A-Za-z][A-Za-z0-9 ,.'&/-]*[A-Za-z0-9.?!])\s*</

  const jsxCopyIn = (file: string): string[] =>
    jsxCopyOffenders(stripComments(readFileSync(join(settingsDir, file), 'utf8')), SETTINGS_JSX_COPY)

  it('leaves no English copy in Settings JSX text or visible attributes', () => {
    const offenders = filesUnder(settingsDir)
      .map(file => ({ file, copy: jsxCopyIn(relative(settingsDir, file)) }))
      .filter(entry => entry.copy.length > 0)
      .map(entry => `${relative(rendererSrc, entry.file)} — ${entry.copy.join(' | ')}`)
    expect(offenders, `Settings screens rendering English copy:\n${offenders.join('\n')}`).toEqual([])
  })

  it('would notice that copy coming back', () => {
    const sample = '<p title="Show details">Software update</p>'
    expect(jsxCopyOffenders(stripComments(sample), SETTINGS_JSX_COPY)).toEqual([
      'Software update',
      'line 1: <p title="Show details">Software update</p>'
    ])
    expect(
      jsxCopyOffenders(
        stripComments('onThemeChange={(next) => setTheme(next as Parameters<typeof setTheme>[0])}'),
        SETTINGS_JSX_COPY
      )
    ).toEqual([])
    // A technical example is not copy: an email address or a path reads the same
    // in both languages.
    expect(
      jsxCopyOffenders(stripComments('<input placeholder="name@business.com" />'), SETTINGS_JSX_COPY)
    ).toEqual([])
    expect(
      jsxCopyOffenders(stripComments('<input placeholder="Enter your email" />'), SETTINGS_JSX_COPY)
    ).toEqual(['line 1: <input placeholder="Enter your email" />'])
  })

  // The sidebar labels live in a `{ id, name, icon }` array, not in JSX text or
  // in a visible attribute, so the scan above read straight past
  // `name: 'Email Reports'` and `name: 'Modules'` sitting in an Arabic sidebar.
  const SETTINGS_TAB = /id:\s*'([a-z]+)'\s+as\s+SettingsTab,\s*name:\s*([^,\n]+)/g

  it('takes every Settings tab label from the dictionary', () => {
    const source = stripComments(readFileSync(join(settingsDir, 'index.tsx'), 'utf8'))
    const tabs = matches(source, SETTINGS_TAB)

    // A scan that finds nothing would pass this test by doing nothing at all.
    expect(tabs.map(tab => tab[1])).toContain('modules')

    const offenders = tabs.flatMap(([, id, name]) => {
      const key = /^t\('([A-Za-z0-9_]+)'\)$/.exec(name.trim())?.[1]
      if (!key) return [`tab "${id}" is labelled ${name.trim()}`]
      if (typeof en[key] !== 'string') return [`tab "${id}" uses unknown key "${key}"`]
      return []
    })
    expect(offenders, `Settings tab labels not coming from the dictionary:\n${offenders.join('\n')}`).toEqual([])
  })
})

describe('Data modules translate through the shared dictionary', () => {
  it('resolves a key per language and falls back to the key itself', () => {
    expect(translate('ar', 'umRoleCustom')).toBe(ar.umRoleCustom)
    expect(translate('en', 'umRoleOwnerAccess')).toBe(en.umRoleOwnerAccess)
    expect(translate('ar', 'aKeyThatDoesNotExist')).toBe('aKeyThatDoesNotExist')
  })

  it('defaults to Arabic, matching the app default', () => {
    expect(translate(undefined, 'umNoPluginAccess')).toBe(ar.umNoPluginAccess)
  })

  it('interpolates the same placeholders as the React hook', () => {
    expect(translate('en', 'umRoleCanDo', { role: 'Cashier' })).toContain('Cashier')
  })

  it('keeps the screens that use it free of local language literals', () => {
    const source = readFileSync(join(settingsDir, 'userMangement', 'utils.ts'), 'utf8')
    expect(source).toContain('translate(language')
    expect(LITERAL_TERNARY.test(source)).toBe(false)
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
// halves — the chrome in `i18n/{en,ar}.settings.ts`, the module metadata in
// `src/shared/modules.ts` — and both halves are asserted below.

const modulesScreenFile = join(settingsDir, 'ModulesSettings.tsx')
const modulesScreen = stripComments(readFileSync(modulesScreenFile, 'utf8'))

/** Latin copy sitting between two tags, e.g. `>Software update<`. */
const JSX_TEXT_COPY = />\s*([A-Za-z][A-Za-z0-9 ,.'&()/-]*[A-Za-z0-9.?!])\s*</
/** Copy in a user-visible attribute instead of a `t()` call. */
const LITERAL_COPY_ATTR = /\b(title|placeholder|aria-label|alt|label)="([^"]*[A-Za-z]{2}[^"]*)"/
/**
 * A technical example rather than copy: `name@business.com`, a URL, a device
 * path. These read the same in every language, so they stay as literals.
 */
const TECHNICAL_ATTR_VALUE = /^[\w.@:/+?#-]+$/

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

function jsxCopyOffenders(source: string, pattern: RegExp = JSX_TEXT_COPY): string[] {
  const offenders = matches(source, pattern).map(m => m[1].trim())
  source.split('\n').forEach((line, index) => {
    const attribute = LITERAL_COPY_ATTR.exec(line)
    if (attribute && !TECHNICAL_ATTR_VALUE.test(attribute[2])) {
      offenders.push(`line ${index + 1}: ${line.trim()}`)
    }
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

// ─── The Settings dictionary ──────────────────────────────────────────────────
//
// Settings copy used to live in five parts: `part.13` (software update),
// `part.14` (Modules), `part.15` (Users & Roles), `part.16` (Backup & Restore)
// and `part.17` (Tax & Receipts, Email Reports). Each of those screens was
// English-only before it moved onto dictionary keys: the last three owned a
// hand-rolled `const i18n = { … }` lookup whose entries read
// `t('key') || (isAr ? 'عربي' : 'English')`, which no translation tool can see
// and no third language can translate. The five parts are one file per language
// now — `i18n/{en,ar}.settings.ts` — so the guard that used to run over three of
// them runs over all of them.

const SETTINGS_KEYS = Object.keys(enSettings).sort()

describe('The Settings dictionary ships identically in both languages', () => {
  it('ships the same keys in both files', () => {
    expect(Object.keys(arSettings).sort()).toEqual(SETTINGS_KEYS)
    expect(SETTINGS_KEYS.length).toBeGreaterThanOrEqual(250)
  })

  it('actually translates every key', () => {
    const untranslated = SETTINGS_KEYS.filter(
      key => arSettings[key] === enSettings[key] && !(key in sameInBothLanguages)
    )
    expect(untranslated, `keys still carrying English copy: ${untranslated.join(', ')}`).toEqual([])
  })

  // A conversion that reads the two halves of `isAr ? 'عربي' : 'English'` in the
  // wrong order produces files where every count above still adds up — the keys
  // match, the values differ, nothing is empty — but the Arabic app shows
  // English. Only looking at the script catches it.
  it('keeps each language on its own side', () => {
    const englishCopy = SETTINGS_KEYS.filter(key => ARABIC_SCRIPT.test(enSettings[key]))
    expect(englishCopy, `English entries holding Arabic copy: ${englishCopy.join(', ')}`).toEqual([])

    const missingArabic = SETTINGS_KEYS.filter(
      key =>
        /[A-Za-z]/.test(enSettings[key]) &&
        !ARABIC_SCRIPT.test(arSettings[key]) &&
        !(key in sameInBothLanguages)
    )
    expect(
      missingArabic,
      `Arabic entries holding no Arabic copy: ${missingArabic.join(', ')}`
    ).toEqual([])
  })

  it('declares the same placeholders in both languages', () => {
    const mismatched = SETTINGS_KEYS.filter(
      key =>
        !(key in omittedPlaceholders) &&
        placeholders(arSettings[key]).join(',') !== placeholders(enSettings[key]).join(',')
    )
    expect(mismatched, `keys with differing placeholders: ${mismatched.join(', ')}`).toEqual([])
  })

  it('carries no empty string', () => {
    const empty = SETTINGS_KEYS.filter(
      key => enSettings[key].trim() === '' || arSettings[key].trim() === ''
    )
    expect(empty, `keys with no copy: ${empty.join(', ')}`).toEqual([])
  })

  it('keeps everything else in the dictionary too', () => {
    // A key added here but forgotten in the merged dictionaries would fall back
    // to the key name on screen.
    const orphaned = SETTINGS_KEYS.filter(key => !(key in en) || !(key in ar))
    expect(orphaned, `keys missing from the merged dictionaries: ${orphaned.join(', ')}`).toEqual([])
  })

  it('writes the Arabic settings file as UTF-8 with no byte order mark', () => {
    // A BOM here makes the first key `\ufeffupdTitle` and silently blanks the
    // file's first string literal.
    const bytes = readFileSync(join(i18nSrc, 'ar.settings.ts'))
    expect([bytes[0], bytes[1], bytes[2]]).not.toEqual([0xef, 0xbb, 0xbf])
  })
})

describe('The screens moved onto those dictionaries read from them', () => {
  const movedScreens = ['BackupSettings.tsx', 'TaxReceiptSettings.tsx', 'EmailSettings.tsx']
  const sources = movedScreens.map(file => ({
    file,
    source: stripComments(readFileSync(join(settingsDir, file), 'utf8'))
  }))

  it('keeps no hand-rolled lookup object', () => {
    const offenders = sources
      .filter(({ source }) => /const\s+i18n\s*=\s*\{/.test(source))
      .map(({ file }) => file)
    expect(offenders, `screens still owning a private copy table: ${offenders.join(', ')}`).toEqual([])
  })

  it('reads every key it renders from the shared dictionaries', () => {
    // `emailReports`, `saveSettings` and `includeCOGSDescription` were missing
    // from every part, so these screens showed raw key names on screen.
    const missing = [
      ...new Set(
        sources.flatMap(({ source }) => matches(source, /\bt\(\s*'([A-Za-z0-9_]+)'/).map(m => m[1]))
      )
    ].filter(key => typeof en[key] !== 'string' || typeof ar[key] !== 'string' || ar[key] === '')

    expect(missing, `keys with no English or Arabic copy: ${missing.join(', ')}`).toEqual([])
  })

  it('really does read the keys, including ones it used to look up locally', () => {
    const taxSource = sources.find(({ file }) => file === 'TaxReceiptSettings.tsx')!.source
    expect(taxSource).toContain("t('taxReceiptSettings')")
    expect(taxSource).toContain("t('storeNameLabel')")
  })

  it('dates every row through lib/format.ts', () => {
    for (const { file, source } of sources) {
      expect(source, `${file} still formatting dates by hand`).not.toMatch(RAW_LOCALE)
    }
  })
})

describe('The dictionaries keep each language on its own side', () => {
  it('never files Arabic copy under English', () => {
    const offenders = Object.keys(en).filter(key => ARABIC_SCRIPT.test(en[key]))
    expect(offenders, `English entries holding Arabic copy: ${offenders.join(', ')}`).toEqual([])
  })

  it('declares the same placeholders in both languages', () => {
    const mismatched = Object.keys(en).filter(
      key =>
        !(key in omittedPlaceholders) &&
        typeof ar[key] === 'string' &&
        placeholders(ar[key]).join(',') !== placeholders(en[key]).join(',')
    )
    expect(mismatched, `keys with differing placeholders: ${mismatched.join(', ')}`).toEqual([])
  })
})

describe('Every parameterised key is called with the parameters it declares', () => {
  // `trDetectedPrinters` used to be a template literal that had been copied into
  // the dictionary verbatim, so `${result.printers...}` sat there as inert text
  // and the toast announced the expression instead of the printers. A key that
  // declares `{list}` must be handed a `list`, and a call that passes a value
  // the template never reads is silently dropping it.
  const CALL = /\bt\(\s*'([A-Za-z0-9_]+)'\s*(?:,\s*\{((?:[^{}]|\{[^{}]*\})*)\})?/g
  const callSites = filesUnder(rendererSrc).map(file => ({
    file: relative(rendererSrc, file),
    source: stripComments(readFileSync(file, 'utf8'))
  }))

  it('reads the directory it is supposed to police', () => {
    expect(callSites.length).toBeGreaterThan(50)
  })

  it('passes every parameter the template reads', () => {
    const offenders: string[] = []
    for (const { file, source } of callSites) {
      for (const [whole, key, params] of matches(source, CALL)) {
        if (typeof en[key] !== 'string') continue
        const declared = placeholders(en[key])
        const provided = params ? passedParams(params) : []
        const missing = declared.filter(
          name => !provided.includes(name) && !(key in omittedPlaceholders)
        )
        if (missing.length > 0) {
          offenders.push(`${file}: ${whole.trim()} needs ${missing.map(n => `{${n}}`).join(', ')}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('passes no parameter the template ignores', () => {
    const offenders: string[] = []
    for (const { file, source } of callSites) {
      for (const [whole, key, params] of matches(source, CALL)) {
        if (typeof en[key] !== 'string' || !params) continue
        const declared = placeholders(en[key])
        const unused = passedParams(params).filter(name => !declared.includes(name))
        if (unused.length > 0) {
          offenders.push(`${file}: ${whole.trim()} passes unused ${unused.join(', ')}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('interpolates a parameterised key instead of printing the braces', () => {
    const enValue = translate('en', 'trDetectedPrinters', { list: 'EPSON TM-T20' })
    const arValue = translate('ar', 'trDetectedPrinters', { list: 'EPSON TM-T20' })
    expect(enValue).toBe('Detected: EPSON TM-T20')
    expect(arValue).toContain('EPSON TM-T20')
    expect(arValue).not.toMatch(/[{}]/)
    expect(enValue).not.toMatch(/[{}]/)
  })
})

describe('Templates are filled by the dictionary, never by hand', () => {
  // `.replace('{name}', value)` on the result of `t()` is the pattern that let
  // `empDocExpired` ship as a stat label reading "Expired {days} days ago": the
  // dictionary value was a sentence, the call site had nothing to substitute,
  // and the braces went to screen. `t(key, { … })` runs the same substitution
  // the other language needs, so it is the only supported way to fill a key.
  const HAND_FILLED_TEMPLATE =
    /\bt\(\s*['"`]([A-Za-z0-9_]+)['"`]\s*(?:,\s*\{[^{}]*\})?\s*\)\s*\.replace\(\s*['"`][^'"`]*\{/g

  const handFilledTemplates = (source: string): string[] =>
    matches(source, HAND_FILLED_TEMPLATE).map(match => match[0].replace(/\s+/g, ' ').trim())

  it('would notice a template filled by hand if it came back', () => {
    expect(
      handFilledTemplates("showToast('success', t('followUpMarkedDone').replace('{name}', fu.patient.name))")
    ).toHaveLength(1)
    expect(
      handFilledTemplates(
        "requested: t('cannotRefundExceeds').replace('\n  {requested}', String(qty))"
      )
    ).toHaveLength(1)
    expect(
      handFilledTemplates("toast.success(t('vetWriteOffSuccess').replace('${amount}', money))")
    ).toHaveLength(1)
    expect(
      handFilledTemplates("t('everyNDays', { days }).replace('{days}', days)")
    ).toHaveLength(1)
  })

  it('leaves the API call alone', () => {
    expect(handFilledTemplates("t('cfStockCannotGoBelowZero', { current: a, trying: b })")).toEqual([])
    expect(handFilledTemplates("values.join(', ').replace('{', '')")).toEqual([])
    expect(
      handFilledTemplates("t('warehouseTransferMovedTo', { status: t(STATUS_CONFIG[s].labelKey) })")
    ).toEqual([])
    expect(handFilledTemplates("t('everyNDays', { days })")).toEqual([])
    expect(
      handFilledTemplates("label={t('empDocExpired')}\n<HrStat value={count} />")
    ).toEqual([])
  })

  it('fills every template through the API', () => {
    const offenders = filesUnder(rendererSrc).flatMap(file => {
      const found = handFilledTemplates(stripComments(readFileSync(file, 'utf8')))
      return found.map(match => `${relative(rendererSrc, file)}: ${match}`)
    })
    expect(offenders).toEqual([])
  })
})
