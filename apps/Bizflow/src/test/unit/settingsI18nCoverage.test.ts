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

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')

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
