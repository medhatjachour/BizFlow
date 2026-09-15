/**
 * The vet point-of-sale terminal (`plugins/vet/pages/vet-sales`): every string
 * the counter screen renders comes from the shared dictionaries, and every key
 * it names exists in both languages.
 *
 * The POS was the last English-first corner of the vet plugin. Its copy lived in
 * three places at once — JSX text (`<span>Complete Sale</span>`), visible
 * attributes (`title="Clear Cart"`, `placeholder="Amount received..."`) and
 * object literals fed back into props (`{ label: 'All', icon: Sparkles }`) — so
 * a key-existence check alone proves nothing: a literal never asks for a key.
 *
 * Four failures are guarded separately because none is visible to the others:
 *
 *   1. Copy rendered from a literal in JSX. The AST scan below reads the syntax
 *      tree, not the text, so a comment spelling out the forbidden shape is not
 *      mistaken for copy and multi-line JSX text stays one string.
 *   2. Copy rendered from a literal attribute the user reads — a `title`, a
 *      `placeholder`, an `aria-label`.
 *   3. A key that reached the dictionary in one language only, so the other
 *      language renders the raw key name.
 *   4. A key whose Arabic copy dropped (or renamed) the `{placeholder}` the
 *      template declares, so the sentence renders without its number.
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
const posSrc = join(rendererSrc, 'plugins', 'vet', 'pages', 'vet-sales')

/** Every source file the terminal renders from. */
function filesUnder(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...filesUnder(full))
    else if (/\.tsx?$/.test(entry)) found.push(full)
  }
  return found
}

/** Keyed by the path the dictionaries and this test both understand. */
const SOURCES = filesUnder(posSrc).map(file => ({
  path: relative(rendererSrc, file).replace(/\\/g, '/'),
  source: readFileSync(file, 'utf8')
}))

function parseTsx(source: string): ts.SourceFile {
  return ts.createSourceFile('scan.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

/** Copy rather than a code, a symbol or a single letter. */
const HAS_WORDS = /[A-Za-z]{2,}/
/** A technical example, not prose: `BTH-01`, `name@business.com`, a URL. */
const TECHNICAL_VALUE = /^[\w.@:/+?#-]+$/
/** The attributes a user actually reads. */
const VISIBLE_ATTRS = new Set(['title', 'placeholder', 'aria-label', 'alt', 'label'])

/**
 * The copy a screen still renders from a literal instead of from `t()`.
 * `<kbd>` is exempt: it holds keys and symbols, which read the same in both
 * languages.
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
      if (HAS_WORDS.test(value) && !TECHNICAL_VALUE.test(value)) {
        offenders.push(`${node.name.getText(sourceFile)}="${value}"`)
      }
    }

    const inKbd =
      insideKbd ||
      (ts.isJsxElement(node) && node.openingElement.tagName.getText(sourceFile) === 'kbd')
    ts.forEachChild(node, child => visit(child, inKbd))
  }

  visit(sourceFile, false)
  return offenders
}

/** The key every `t('…')` call in a source file names. */
function keysNamedIn(source: string): string[] {
  const sourceFile = parseTsx(source)
  const keys: string[] = []

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 't' &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      keys.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return keys
}

const EN = en as Record<string, string>
const AR = ar as Record<string, string>

/** The `{placeholder}` names a translated string declares. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
}

const POS_KEYS = [
  ...new Set(SOURCES.flatMap(({ source }) => keysNamedIn(source)))
].sort()

describe('vet POS i18n — no copy left in the JSX', () => {
  it('scans the terminal sources', () => {
    // A scanner that silently matched nothing would make every check below
    // vacuous, so the file list is pinned.
    expect(SOURCES.length).toBeGreaterThanOrEqual(12)
  })

  it('renders no literal text or attribute copy', () => {
    const offenders = SOURCES.flatMap(({ path, source }) =>
      jsxCopyOffenders(source).map(copy => `${path}: ${copy}`)
    )
    expect(offenders).toEqual([])
  })

  it('would catch copy that came back', () => {
    // Mutation check: the scan is only worth trusting if it fails on the shape
    // it forbids.
    expect(jsxCopyOffenders('<button title="Clear Cart">Complete Sale</button>')).toEqual([
      'title="Clear Cart"',
      'Complete Sale'
    ])
    expect(jsxCopyOffenders("<span>{t('vetPosOut')}</span>")).toEqual([])
  })
})

describe('vet POS i18n — the keys the terminal names', () => {
  it('names keys at all', () => {
    expect(POS_KEYS.length).toBeGreaterThanOrEqual(60)
  })

  it('resolves every key in both languages', () => {
    const missing = POS_KEYS.filter(key => !(key in EN) || !(key in AR))
    expect(missing).toEqual([])
  })

  it('keeps the Arabic copy distinct from the English copy', () => {
    // A value that never made it into `ar.*` renders English inside an Arabic
    // screen; the fallback hides it only until someone compares the two.
    const untranslated = POS_KEYS.filter(key => EN[key] === AR[key] && HAS_WORDS.test(EN[key]))
    expect(untranslated).toEqual([])
  })

  it('declares the same placeholders in both languages', () => {
    const mismatched = POS_KEYS.filter(
      key => JSON.stringify(placeholders(EN[key] ?? '')) !== JSON.stringify(placeholders(AR[key] ?? ''))
    )
    expect(mismatched).toEqual([])
  })
})

describe('vet POS i18n — the terminal dictionary block', () => {
  const POS_DICTIONARY_KEYS = Object.keys(EN)
    .filter(key => key.startsWith('vetPos'))
    .sort()

  it('carries the whole block in both languages', () => {
    expect(POS_DICTIONARY_KEYS.length).toBeGreaterThanOrEqual(50)
    expect(POS_DICTIONARY_KEYS.filter(key => !(key in AR))).toEqual([])
  })

  it('is used, not just declared', () => {
    // The block exists for this screen; a key nobody names is dead weight.
    const unused = POS_DICTIONARY_KEYS.filter(key => !POS_KEYS.includes(key))
    expect(unused).toEqual([])
  })
})
