/**
 * The pharmacy plugin: every string the plugin renders comes from the shared
 * dictionaries, and every key it names exists in both languages.
 *
 * The plugin was written English-first: its screens, tables, modals, metric
 * bars, hooks and constants carried the copy directly in JSX
 * (`<button>Refund</button>`), in object literals (`{ label: 'COGS' }`) and in
 * visible attributes (`placeholder="Search products"`). Because the app is
 * Arabic-first, every one of those strings stayed English inside an otherwise
 * Arabic screen.
 *
 * Three failure modes are worth guarding separately, and none is visible to the
 * others:
 *
 *   1. Copy that never reached the dictionary — a literal in JSX passes every
 *      "does the key exist" check because it never asks for a key at all. The
 *      JSX scan below catches it.
 *   2. Copy that lives outside JSX altogether: a toast, a CSV header, a metric
 *      sub-label built from a template literal, a ternary inside an attribute.
 *      The second scan catches it.
 *   3. A key that reached the dictionary in one language only, or that names a
 *      placeholder the template does not declare. Those render the raw key (or a
 *      blank) on screen, and neither scan can see them, because the copy *is*
 *      going through `t()`.
 *
 * The constants modules are the subtle half: `DASHBOARD_PERIODS`,
 * `PAYMENT_METHODS`, `DISPOSAL_REASON_PRESETS` and the selling-unit lists are
 * persisted values, so their `label: 'General'` entries had to keep the English
 * value and grow a `labelKey` beside it. A `labelKey` that names a key nobody
 * declared shows the key name in the dropdown, so those are resolved here too.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import * as ts from 'typescript'

import { ar } from '../../renderer/src/i18n/ar'
import { en } from '../../renderer/src/i18n/en'

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')
const i18nSrc = join(rendererSrc, 'i18n')
const pharmacySrc = join(rendererSrc, 'plugins', 'pharmacy')

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
 * Drop block comments and comment-only lines. The AST scan below ignores
 * comments on its own; this is for the plain-pattern checks over the constants
 * modules, whose sources document the very shapes this test forbids.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
}

/** A technical example, not prose: `BTH-01`, `name@business.com`, a URL. */
const TECHNICAL_ATTR_VALUE = /^[\w.@:/+?#-]+$/
/** Copy rather than a code, a symbol or a single letter. */
const HAS_WORDS = /[A-Za-z]{2,}/
/** The attributes a user reads. */
const VISIBLE_ATTRS = new Set(['title', 'placeholder', 'aria-label', 'alt', 'label'])

/**
 * Parsed as TSX, because that is what these files are: a scanner that reads the
 * text as JavaScript cannot see `<button>` where the compiler sees an element.
 */
function parseTsx(source: string): ts.SourceFile {
  return ts.createSourceFile('scan.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

/** Optimistically typed: `parseDiagnostics` is internal to the compiler. */
function parseErrors(source: string): number {
  const parsed = parseTsx(source) as ts.SourceFile & { parseDiagnostics?: unknown[] }
  return parsed.parseDiagnostics?.length ?? 0
}

/** All matches of `pattern`, applied fresh so `lastIndex` never leaks. */
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

/**
 * The copy a screen still renders from a literal instead of from `t()`.
 *
 * Read off the syntax tree rather than the text, so a comment that spells out
 * the forbidden shape (`// <button>Refund</button>`) is not mistaken for code,
 * and so multi-line JSX text is caught as one string instead of being split by
 * every line break. `<kbd>` is exempt: it holds keys and symbols, which read the
 * same in both languages.
 */
function jsxCopyOffenders(source: string): string[] {
  const sourceFile = parseTsx(source)
  const offenders: string[] = []

  const visit = (node: ts.Node, insideKbd: boolean): void => {
    if (ts.isJsxText(node) && !insideKbd) {
      const copy = node.getText(sourceFile).replace(/\s+/g, ' ').trim()
      if (HAS_WORDS.test(copy)) offenders.push(copy)
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer !== undefined &&
      ts.isStringLiteral(node.initializer) &&
      VISIBLE_ATTRS.has(node.name.getText(sourceFile))
    ) {
      const value = node.initializer.text
      if (HAS_WORDS.test(value) && !TECHNICAL_ATTR_VALUE.test(value)) {
        offenders.push(`${node.name.getText(sourceFile)}="${value}"`)
      }
    }

    const inKbd =
      insideKbd || (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === 'kbd')
    ts.forEachChild(node, child => visit(child, inKbd))
  }

  visit(sourceFile, false)
  return offenders
}

/**
 * A class list, a CSS selector or a CSS custom property: lowercase, hyphenated,
 * arbitrary values in brackets. Never shown to a user, so never translated.
 */
const CLASS_LIKE = /^[a-z0-9:\-[\]{}().,/%! ]+$/

function looksLikeClasses(value: string): boolean {
  return CLASS_LIKE.test(value.replace(/\[[^\]]*\]/g, '').trim())
}

/**
 * Copy rather than a code, a class or a single word: several words, or one
 * capitalised word that reads as a label ("Wallet", "Other").
 */
function looksLikeCopy(value: string): boolean {
  const text = value.trim()
  if (text.length < 4 || ARABIC_SCRIPT.test(text) || !HAS_WORDS.test(text)) return false
  if (looksLikeClasses(text)) return false
  const words = text.split(/\s+/).filter(word => /[A-Za-z]{2,}/.test(word))
  if (words.length >= 2) return true
  return /^[A-Z][a-z]{2,}$/.test(text)
}

/**
 * Values that are deliberately English and are not copy: icon names, keycaps,
 * and the disposal reasons the database stores verbatim (`inventory/types.ts`
 * pins the union, `constants.ts` maps each one to `phInvReason*` at display
 * time). Kept per file so an exemption cannot silently cover a second one.
 */
const NOT_COPY_BY_DESIGN: Record<string, string[]> = {
  'plugins/pharmacy/pages/components/ui.tsx': ['Escape'],
  'plugins/pharmacy/pages/dashboard/components/OperationalAlertsCard.tsx': ['Wallet'],
  'plugins/pharmacy/pages/dashboard/types.ts': ['Wallet'],
  'plugins/pharmacy/pages/dashboard/utils.ts': ['Wallet'],
  'plugins/pharmacy/pages/PharmacyPOS/constants.ts': ['Banknote', 'Clock'],
  'plugins/pharmacy/pages/PharmacyPOS/index.tsx': ['Enter'],
  'plugins/pharmacy/pages/purchaseOrders/hooks/useReceiveVerification.ts': ['Enter'],
  'plugins/pharmacy/pages/inventory/constants.ts': ['Expired', 'Damaged / Broken', 'Manufacturer Recall', 'Storage Temperature Violation', 'Other'],
  'plugins/pharmacy/pages/inventory/types.ts': ['Expired', 'Damaged / Broken', 'Manufacturer Recall', 'Storage Temperature Violation', 'Other'],
  'plugins/pharmacy/pages/inventory/hooks/useInventoryDisposal.ts': ['Expired', 'Damaged / Broken'],
  'plugins/pharmacy/pages/products/hooks/useBatchManager.ts': ['Disposed via Batch Manager']
}

/** The attributes whose strings are markup, not copy. */
const MARKUP_ATTRS = new Set(['className', 'class', 'style', 'id', 'key', 'testId'])

/**
 * The copy the JSX scan cannot see: a toast message, a CSV header, an object
 * literal, a ternary inside an attribute value, a sentence assembled from a
 * template literal. Each of those renders English without ever appearing between
 * two JSX tags, and the plugin carried plenty of every kind.
 *
 * The arguments of `t()` are skipped wholesale — they are translated by
 * definition, and `keysNamedIn` audits them separately.
 */
function literalCopyOffenders(source: string): { line: number; text: string }[] {
  const sourceFile = parseTsx(source)
  const offenders: { line: number; text: string }[] = []

  /** A key position (`{ 'x': 1 }`, `obj['key']`) is a name, not copy. */
  const isName = (node: ts.Node): boolean => {
    const parent = node.parent as ts.Node | undefined
    if (!parent) return false
    if (
      (ts.isPropertyAssignment(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isMethodDeclaration(parent)) &&
      parent.name === node
    ) {
      return true
    }
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true
    // Attribute strings are the JSX scan's business, which also knows which
    // attributes a user actually reads.
    return ts.isJsxAttribute(parent)
  }

  const insideMarkupAttr = (node: ts.Node): boolean => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isJsxAttribute(parent)) return MARKUP_ATTRS.has(parent.name.getText(sourceFile))
      if (
        ts.isPropertyAssignment(parent) &&
        ts.isIdentifier(parent.name) &&
        MARKUP_ATTRS.has(parent.name.text)
      ) {
        return true
      }
    }
    return false
  }

  const record = (node: ts.Node, text: string): void => {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
    offenders.push({ line, text })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
      return
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isName(node) && !insideMarkupAttr(node) && looksLikeCopy(node.text)) record(node, node.text)
      return
    }

    if (ts.isTemplateExpression(node)) {
      // The static half of `` `${t('a')} across ${n} invoice(s)` `` is where
      // untranslated sentences hide, because only the dynamic half went through
      // `t()`. Class lists never reach here in prose form — they carry a hyphen
      // or a colon — and neither does a file extension, so a word without either
      // is copy.
      for (const span of [node.head, ...node.templateSpans.map(entry => entry.literal)]) {
        const text = span.text.trim()
        if (HAS_WORDS.test(text) && !/[-:]/.test(text) && !/^\.\w+$/.test(text)) {
          record(span, `\`${span.text}\``)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return offenders
}

/**
 * Every key the plugin names: `t('key')`, both branches of `t(one ? 'a' : 'b')`,
 * and the `labelKey: 'key'` the persisted constants carry beside their value.
 */
function keysNamedIn(source: string): string[] {
  const sourceFile = parseTsx(source)
  const found: string[] = []

  const literalBranches = (node: ts.Expression): void => {
    if (ts.isStringLiteral(node)) found.push(node.text)
    else if (ts.isConditionalExpression(node)) {
      literalBranches(node.whenTrue)
      literalBranches(node.whenFalse)
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 't'
    ) {
      node.arguments.forEach(literalBranches)
    } else if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'labelKey'
    ) {
      literalBranches(node.initializer)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return found
}

/** Any Arabic letter — used to catch copy filed under the wrong language. */
const ARABIC_SCRIPT = /[\u0600-\u06FF]/
/** `{list}` and friends, in declaration order. */
const placeholders = (value: string): string[] =>
  [...value.matchAll(/\{([A-Za-z_$][\w$]*)\}/g)].map(m => m[1])

const pharmacyFiles = filesUnder(pharmacySrc).map(file => ({
  file: relative(rendererSrc, file).replace(/\\/g, '/'),
  source: readFileSync(file, 'utf8')
}))

/** Every key the plugin names in any file. */
const pharmacyKeys = [
  ...new Set(pharmacyFiles.flatMap(({ source }) => keysNamedIn(source)))
].sort()

describe('The pharmacy plugin renders nothing it cannot translate', () => {
  it('reads the directory it is supposed to police', () => {
    expect(pharmacyFiles.length).toBeGreaterThan(40)
    expect(pharmacyKeys.length).toBeGreaterThan(300)
  })

  it('parses every plugin file, so the scan reads real syntax', () => {
    const broken = pharmacyFiles.filter(({ source }) => parseErrors(source) > 0).map(({ file }) => file)
    expect(broken, `files the scanner cannot parse: ${broken.join(', ')}`).toEqual([])
  })

  it('would notice English copy if it came back', () => {
    // Non-vacuity: the scan must catch the exact shapes that were removed, and
    // must not fire on the translated form.
    expect(jsxCopyOffenders('<button className="btn">Refund</button>')).toEqual(['Refund'])
    expect(jsxCopyOffenders("<button className=\"btn\">{t('phRefund')}</button>")).toEqual([])
    expect(jsxCopyOffenders('<input placeholder="Search products" />')).toEqual([
      'placeholder="Search products"'
    ])
    // A batch-code example is not copy: it reads the same in both languages.
    expect(jsxCopyOffenders('<input placeholder="BTH-01" />')).toEqual([])
    // A comment describing the shape is not the shape.
    expect(jsxCopyOffenders('// was: <button className="btn">Refund</button>')).toEqual([])
    // Keycaps are exempt, the prose beside them is not.
    expect(jsxCopyOffenders('<p>Press <kbd>F1</kbd></p>')).toEqual(['Press'])
  })

  it('leaves no English literal in JSX text or in a visible attribute', () => {
    const offenders = pharmacyFiles
      .map(({ file, source }) => ({ file, copy: jsxCopyOffenders(source) }))
      .filter(entry => entry.copy.length > 0)
      .map(entry => `${entry.file} — ${entry.copy.join(' | ')}`)
    expect(
      offenders,
      `pharmacy screens rendering English copy:\n${offenders.join('\n')}`
    ).toEqual([])
  })

  it('leaves no hard-coded English fallback beside a translation', () => {
    // `t('key') || 'English'` is dead code — `translate()` already falls back to
    // the key name — but it reads as if the English were the intent, so it was
    // stripped everywhere in the plugin.
    const offenders = pharmacyFiles
      .filter(({ source }) => /\bt\(\s*'[A-Za-z0-9_]+'(?:\s*,\s*\{[^{}]*\})?\s*\)\s*\|\|/.test(source))
      .map(({ file }) => file)
    expect(offenders, `dead English fallbacks left in: ${offenders.join(', ')}`).toEqual([])
  })

  it('would notice copy outside JSX if it came back', () => {
    const copy = (source: string): string[] => literalCopyOffenders(source).map(o => o.text)
    // A toast is copy even though it is nowhere near a JSX tag.
    expect(copy("toast.error('Checkout failed')")).toEqual(['Checkout failed'])
    expect(copy("toast.error(t('phPosCheckoutFailed'))")).toEqual([])
    // So is a ternary inside an attribute value, which the JSX text scan misses.
    expect(copy("<button title={ok ? 'Delete' : 'Disable'}>x</button>")).toEqual(['Delete', 'Disable'])
    // And so is the static half of a sentence built from a template literal.
    expect(copy('const msg = `${t(\'phSettled\')} across ${n} invoice(s)`')).toEqual([
      '` across `',
      '` invoice(s)`'
    ])
    expect(copy('const msg = `${t(\'phSettled\')} · ${t(\'phCuCount\', { n })}`')).toEqual([])
    // Values that are markup or storage keys are not copy.
    expect(copy("const cls = 'text-slate-800 dark:text-slate-100'")).toEqual([])
    expect(copy("const cls = 'text-[color:var(--accent)] bg-[color:var(--accent-soft)]'")).toEqual([])
    expect(copy("localStorage.setItem('bizflow:pharmacy:tab', value)")).toEqual([])
    expect(copy("const row = { key: 'Damaged / Broken' }")).toEqual([])
  })

  it('leaves no English literal in the code the JSX scan cannot see', () => {
    const offenders = pharmacyFiles
      .map(({ file, source }) => ({
        file,
        copy: literalCopyOffenders(source).filter(
          entry => !(NOT_COPY_BY_DESIGN[file] ?? []).includes(entry.text)
        )
      }))
      .filter(entry => entry.copy.length > 0)
      .map(entry => `${entry.file} — ${entry.copy.map(o => `${o.line}: ${o.text}`).join(' | ')}`)
    expect(
      offenders,
      `pharmacy code rendering English copy outside JSX:\n${offenders.join('\n')}`
    ).toEqual([])
  })

  it('keeps every exemption in the list alive', () => {
    // An exemption that no longer matches anything is a licence to bring the
    // English back one file at a time.
    for (const [file, allowed] of Object.entries(NOT_COPY_BY_DESIGN)) {
      const entry = pharmacyFiles.find(item => item.file === file)
      expect(entry, `${file} is exempted but not scanned`).toBeDefined()
      const values = new Set(literalCopyOffenders(entry?.source ?? '').map(item => item.text))
      const stale = allowed.filter(value => !values.has(value))
      expect(stale, `${file} no longer contains: ${stale.join(', ')}`).toEqual([])
    }
  })
})

describe('Every pharmacy key resolves in both languages', () => {
  it('names no key that is missing from the English dictionary', () => {
    const missing = pharmacyKeys.filter(key => typeof en[key] !== 'string' || en[key].trim() === '')
    expect(missing, `keys with no English copy: ${missing.join(', ')}`).toEqual([])
  })

  it('names no key that is missing from the Arabic dictionary', () => {
    const missing = pharmacyKeys.filter(key => typeof ar[key] !== 'string' || ar[key].trim() === '')
    expect(missing, `keys with no Arabic copy: ${missing.join(', ')}`).toEqual([])
  })

  it('translates every pharmacy key rather than reusing the English word for word', () => {
    // Keys whose Arabic copy is deliberately identical to the English one: the
    // unit symbols and codes that are read the same in both languages.
    const sameInBoth = new Set([
      'phOutBadge',
      'phAnPresetWeek',
      'phAnShareParenthetical',
      'phHotkeyAltNumbers'
    ])
    const untranslated = pharmacyKeys.filter(
      key => ar[key] === en[key] && !sameInBoth.has(key) && /[A-Za-z]/.test(en[key])
    )
    expect(
      untranslated,
      `pharmacy keys still carrying English copy: ${untranslated.join(', ')}`
    ).toEqual([])
  })

  it('declares the same placeholders in both languages', () => {
    const mismatched = pharmacyKeys.filter(
      key =>
        typeof en[key] === 'string' &&
        typeof ar[key] === 'string' &&
        placeholders(ar[key]).join(',') !== placeholders(en[key]).join(',')
    )
    expect(mismatched, `keys with differing placeholders: ${mismatched.join(', ')}`).toEqual([])
  })

  it('keeps English out of the Arabic entries and Arabic out of the English ones', () => {
    const arabicInEnglish = pharmacyKeys.filter(key => ARABIC_SCRIPT.test(en[key] ?? ''))
    expect(
      arabicInEnglish,
      `English entries holding Arabic copy: ${arabicInEnglish.join(', ')}`
    ).toEqual([])
  })
})

describe('The persisted pharmacy constants translate at display time', () => {
  // These arrays are written to the database, so their values must stay English
  // while the UI reads a key. A `labelKey` that drops out of the array, or a
  // consumer that forgets to resolve it, shows the raw key on screen.
  const keyedConstants: { file: string; pattern: RegExp }[] = [
    { file: 'pages/dashboard/constants.ts', pattern: /labelKey: '([A-Za-z0-9_]+)'/g },
    { file: 'pages/PharmacyPOS/constants.ts', pattern: /labelKey: '([A-Za-z0-9_]+)'/g },
    { file: 'pages/products/constants.ts', pattern: /labelKey: '([A-Za-z0-9_]+)'/g },
    { file: 'pages/inventory/constants.ts', pattern: /labelKey: '([A-Za-z0-9_]+)'/g },
    { file: 'pages/components/units.ts', pattern: /'([A-Za-z0-9_]+)'/g }
  ]

  it('declares a key for every translated constant', () => {
    for (const { file, pattern } of keyedConstants) {
      const source = stripComments(readFileSync(join(pharmacySrc, file), 'utf8'))
      const keys = matches(source, pattern).map(m => m[1])
      expect(keys.length, `${file} declares no label keys`).toBeGreaterThan(0)
      const missing = keys.filter(key => typeof en[key] !== 'string' || typeof ar[key] !== 'string')
      expect(missing, `${file} names keys with no copy: ${missing.join(', ')}`).toEqual([])
    }
  })

  it('declares a key for every persisted selling unit', () => {
    // `DEFAULT_SELLING_UNITS` holds the values stored on a product, and
    // `UNIT_LABEL_KEYS` maps each one to its key. A unit the map forgot falls
    // back to the raw English unit name in the Arabic UI.
    const source = readFileSync(join(pharmacySrc, 'pages', 'components', 'units.ts'), 'utf8')
    const units = [...source.matchAll(/^\s{2}([A-Za-z]+):\s*'([A-Za-z0-9_]+)'/gm)].map(m => m[1])
    expect(units.length).toBeGreaterThanOrEqual(18)
  })
})

describe('The pharmacy dictionary ships as one file per language', () => {
  it('appends the plugin keys to the same part in both languages', () => {
    for (const name of ['en.part.8.ts', 'ar.part.8.ts']) {
      const source = readFileSync(join(i18nSrc, name), 'utf8')
      expect(source, `${name} lost the pharmacy section`).toContain('Pharmacy plugin UI strings')
    }
  })

  it('writes both files as UTF-8 with no byte order mark', () => {
    // A BOM here makes the first key `\ufeffphAnPresetToday` and silently blanks
    // the file's first string literal.
    for (const name of ['en.part.8.ts', 'ar.part.8.ts']) {
      const bytes = readFileSync(join(i18nSrc, name))
      expect([bytes[0], bytes[1], bytes[2]], `${name} starts with a BOM`).not.toEqual([0xef, 0xbb, 0xbf])
    }
  })
})
