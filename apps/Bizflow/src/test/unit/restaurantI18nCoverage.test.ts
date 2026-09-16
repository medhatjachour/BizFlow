/**
 * Restaurant plugin: the per-language dictionary must stay complete and honest.
 *
 * The restaurant surface ships its own dictionary files (`i18n/en.restaurant.ts`
 * and `i18n/ar.restaurant.ts`) that are spread into the host dictionaries. That
 * merge is silent: `translate()` falls back to English and then to the key
 * itself, so an Arabic string that was never written, a key typo in a component
 * and a key that collides with another plugin all look identical to a user —
 * they just render the wrong words. Nothing failed before this file existed.
 *
 * The contract is:
 *   1. `enRestaurant` and `arRestaurant` expose exactly the same keys, with the
 *      same `{placeholders}`, and no empty strings.
 *   2. No key is declared twice in a dictionary file (a duplicate would be
 *      silently dropped by the object literal).
 *   3. No restaurant key shadows a key another dictionary already owns.
 *   4. Every `t('...')` written inside the restaurant plugin resolves, and every
 *      key in the dictionary is actually referenced somewhere.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ar } from '../../renderer/src/i18n/ar'
import { arEmployee } from '../../renderer/src/i18n/ar.employee'
import { arRestaurant } from '../../renderer/src/i18n/ar.restaurant'
import { arSettings } from '../../renderer/src/i18n/ar.settings'
import { en } from '../../renderer/src/i18n/en'
import { enEmployee } from '../../renderer/src/i18n/en.employee'
import { enRestaurant } from '../../renderer/src/i18n/en.restaurant'
import { enSettings } from '../../renderer/src/i18n/en.settings'
import { translate } from '../../renderer/src/i18n/translations'

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')
const i18nSrc = join(rendererSrc, 'i18n')
const restaurantPluginSrc = join(rendererSrc, 'plugins', 'restaurant')

const enRestaurantSource = readFileSync(join(i18nSrc, 'en.restaurant.ts'), 'utf8')
const arRestaurantSource = readFileSync(join(i18nSrc, 'ar.restaurant.ts'), 'utf8')

/** Keys as written in the file, so a duplicate can be detected before it collapses. */
function declaredKeys(source: string): string[] {
  const keys: string[] = []
  source.split('\n').forEach((line) => {
    const match = /^\s{2}([A-Za-z0-9_]+)\s*:/.exec(line)
    if (match) keys.push(match[1])
  })
  return keys
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort()
}

function filesUnder(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...filesUnder(full))
    else if (/\.tsx?$/.test(full)) found.push(full)
  }
  return found
}

/** Every `t('key')` literal in the plugin, with the file and line that uses it. */
function translationCalls(): { key: string; file: string; line: number }[] {
  const calls: { key: string; file: string; line: number }[] = []
  for (const file of filesUnder(restaurantPluginSrc)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        for (const match of line.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'/g)) {
          calls.push({ key: match[1], file: relative(rendererSrc, file), line: index + 1 })
        }
      })
  }
  return calls
}

/**
 * Dictionary keys reached through a variable (`t(tab.labelKey)`), kept explicit.
 *
 * Only `labelKey` is scanned. A bare `key:` is deliberately excluded: the plugin
 * also uses `key` for domain identifiers (shortcut names like `'F1'`, void-reason
 * codes like `'wrong_item'`), which are not dictionary keys.
 */
function labelKeyReferences(): { key: string; file: string; line: number }[] {
  const references: { key: string; file: string; line: number }[] = []
  for (const file of filesUnder(restaurantPluginSrc)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        for (const match of line.matchAll(/\blabelKey\s*:\s*'([A-Za-z0-9_]+)'/g)) {
          references.push({ key: match[1], file: relative(rendererSrc, file), line: index + 1 })
        }
      })
  }
  return references
}

const enKeys = Object.keys(enRestaurant)
const arKeys = Object.keys(arRestaurant)
const calls = translationCalls()
const referenced = [...calls, ...labelKeyReferences()]

describe('restaurant dictionary completeness', () => {
  it('keeps English and Arabic restaurant keys in lockstep', () => {
    const missingInArabic = enKeys.filter((key) => !(key in arRestaurant))
    const missingInEnglish = arKeys.filter((key) => !(key in enRestaurant))

    expect(missingInArabic, `add these to ar.restaurant.ts: ${missingInArabic.join(', ')}`).toEqual(
      []
    )
    expect(
      missingInEnglish,
      `add these to en.restaurant.ts: ${missingInEnglish.join(', ')}`
    ).toEqual([])
  })

  it('uses the same placeholders in both languages', () => {
    const mismatched = enKeys
      .filter((key) => key in arRestaurant)
      .filter(
        (key) =>
          placeholders(enRestaurant[key as keyof typeof enRestaurant]).join(',') !==
          placeholders(arRestaurant[key as keyof typeof arRestaurant]).join(',')
      )

    expect(
      mismatched,
      `placeholder mismatch — English ${mismatched.map((k) => `${k}: {${placeholders(enRestaurant[k as keyof typeof enRestaurant]).join('}{')}}`).join(', ')}`
    ).toEqual([])
  })

  it('never ships an empty string', () => {
    const empty = [...enKeys, ...arKeys].filter(
      (key) =>
        !String(enRestaurant[key as keyof typeof enRestaurant] ?? 'x').trim() ||
        !String(arRestaurant[key as keyof typeof arRestaurant] ?? 'x').trim()
    )

    expect(empty).toEqual([])
  })

  it('declares each key once per file', () => {
    for (const [name, source] of [
      ['en.restaurant.ts', enRestaurantSource],
      ['ar.restaurant.ts', arRestaurantSource]
    ] as const) {
      const declared = declaredKeys(source)
      const duplicates = declared.filter((key, index) => declared.indexOf(key) !== index)

      expect(
        duplicates,
        `${name} declares duplicates: ${[...new Set(duplicates)].join(', ')}`
      ).toEqual([])
      expect(declared.length, `${name} key count changed shape`).toBe(new Set(declared).size)
    }
  })

  it('does not shadow a key another dictionary already owns', () => {
    const others = {
      enEmployee,
      enSettings,
      arEmployee,
      arSettings
    } as Record<string, Record<string, string>>

    const collisions: string[] = []
    for (const [dictionaryName, dictionary] of Object.entries(others)) {
      for (const key of enKeys) {
        if (key in dictionary) collisions.push(`${key} (${dictionaryName})`)
      }
    }

    expect(collisions).toEqual([])
  })

  it('merges the restaurant dictionary into both host dictionaries', () => {
    const notMerged = enKeys.filter((key) => !(key in en))

    expect(
      notMerged,
      `en.ts is missing the restaurant spread for: ${notMerged.join(', ')}`
    ).toEqual([])
    expect(arKeys.filter((key) => !(key in ar))).toEqual([])
  })

  it('resolves every key in both languages', () => {
    const unresolved = enKeys.filter(
      (key) => translate('en', key) === key || translate('ar', key) === key
    )

    expect(unresolved).toEqual([])
  })

  it('resolves every key the plugin asks for', () => {
    // Shared keys (app chrome, common verbs) live in the host dictionaries, so
    // existence is asserted there rather than in this file's own dictionary.
    const unknown = referenced
      .filter((reference) => !(reference.key in en))
      .map((reference) => `${reference.file}:${reference.line} — ${reference.key}`)

    expect(unknown).toEqual([])
  })

  it('has no orphaned copy', () => {
    // The dictionary is read from several places (the POS, the landing page and
    // the module registry), so the sweep is over the whole renderer.
    const used = new Set<string>()
    for (const file of filesUnder(rendererSrc)) {
      const source = readFileSync(file, 'utf8')
      for (const key of enKeys) {
        if (source.includes(`'${key}'`) || source.includes(`"${key}"`)) used.add(key)
      }
    }

    const orphaned = enKeys.filter((key) => !used.has(key))

    expect(orphaned, `dictionary entries nothing reads: ${orphaned.join(', ')}`).toEqual([])
  })
})
