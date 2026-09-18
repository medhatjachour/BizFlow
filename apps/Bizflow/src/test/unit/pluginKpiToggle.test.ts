/**
 * Every KPI block in every plugin answers to the same switch.
 *
 * The plugins grew nine separate KPI implementations — `KpiCard`, `StatCard`,
 * `KPICards`, `StatsCards`, `MetricsBar`, `KpiStrip` — one per screen, each
 * drawn its own way and none of them hideable. On a laptop that is a wall of
 * numbers above the content the operator actually came for; on a phone it is
 * the whole first screen. The fix is one primitive (`KpiVisibility`) that every
 * block opts into by wrapping itself in `<KpiSection sectionKey="…">`, so a
 * single switch in the header — and a per-block chip — can hide them all.
 *
 * The switch only works when the wiring is exact, and every way it can be wrong
 * is silent at runtime:
 *
 *   1. A key that is missing, duplicated, or not namespaced by plugin makes two
 *      blocks share a preference (hide one, lose the other) or makes the stored
 *      preference collide across plugins. Keys are permanent user data: they
 *      live in `localStorage` and are written by people clicking the chip.
 *   2. An unclosed or self-closed `<KpiSection>` renders the block but leaves
 *      the preference unreadable, or swallows the rest of the page.
 *   3. An import that points somewhere other than the primitive creates a second
 *      context, so the header switch silently does nothing for that block.
 *   4. No provider above the routes means the fallback — always visible — wins,
 *      and the header button appears to be broken.
 *
 * The per-plugin counts below are the wiring as it stands. They are asserted so
 * a screen cannot quietly drop out of the system: if you remove a block, lower
 * the number and say why in the same commit.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')
const pluginsSrc = join(rendererSrc, 'plugins')

const PRIMITIVE = join(rendererSrc, 'components', 'ui', 'KpiVisibility.tsx')
const STORE = join(rendererSrc, 'components', 'ui', 'kpiVisibilityStore.ts')
const APP = join(rendererSrc, 'App.tsx')
const LAYOUT = join(rendererSrc, 'components', 'layout', 'RootLayout.tsx')

/** The primitive, however far away the importing file sits from it. */
const PRIMITIVE_SUFFIX = /ui\/KpiVisibility$/

/** `plugin:path-Component`, with `#n` when a file holds several blocks. */
const KEY_SHAPE = /^[a-z]+:[A-Za-z0-9._#-]+$/

/** Every plugin, and how many blocks it hands to the switch today. */
const WIRED: Record<string, number> = {
  bakery: 14,
  clinic: 12,
  coffee: 9,
  commerce: 9,
  gym: 11,
  personal: 13,
  pharmacy: 10,
  restaurant: 8,
  vet: 15,
  warehouse: 8
}

type Site = {
  /** `plugins/clinic/pages/stats/…` — what a failure prints. */
  rel: string
  /** The plugin the block lives in, which its key has to be namespaced by. */
  plugin: string
  line: number
  key: string | null
  /** True only for a paired `<KpiSection>…</KpiSection>` holding real markup. */
  wrapsContent: boolean
}

function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...sourceFiles(full))
    else if (/\.tsx?$/.test(entry)) found.push(full)
  }
  return found
}

/** `plugins/pharmacy/pages/sales/index.tsx` */
function pluginPath(file: string): string {
  return `plugins/${relative(pluginsSrc, file).split(/[\\/]/).join('/')}`
}

/** The plugin a file belongs to: `plugins/<plugin>/…` -> `<plugin>`. */
function pluginOf(file: string): string {
  return relative(pluginsSrc, file).split(/[\\/]/)[0]
}

function parse(source: string, file: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

/** The literal text of a JSX attribute, or undefined when it is not a literal. */
function literalAttribute(attr: ts.JsxAttribute): string | undefined {
  return attr.initializer && ts.isStringLiteral(attr.initializer) ? attr.initializer.text : undefined
}

/**
 * Every `<KpiSection>` in a file, read from the AST rather than a regex so a
 * wrapped block that is conditional, nested in a map, or split across lines is
 * still seen and its key still resolved.
 */
function sitesIn(file: string): Site[] {
  const text = readFileSync(file, 'utf8')
  const source = parse(text, file)
  const sites: Site[] = []

  const record = (node: ts.JsxElement | ts.JsxSelfClosingElement): void => {
    const opening = ts.isJsxElement(node) ? node.openingElement : node
    const key = opening.attributes.properties
      .filter(ts.isJsxAttribute)
      .filter(attr => attr.name.getText(source) === 'sectionKey')
      .map(literalAttribute)[0]

    sites.push({
      rel: pluginPath(file),
      plugin: pluginOf(file),
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      key: key ?? null,
      wrapsContent:
        ts.isJsxElement(node) &&
        node.children.some(
          child => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)
        )
    })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      if (ts.isIdentifier(opening.tagName) && opening.tagName.text === 'KpiSection') record(node)
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return sites
}

/** A file's imports, as `specifier -> imported names`. */
function importsOf(file: string): Map<string, string[]> {
  const text = readFileSync(file, 'utf8')
  const source = parse(text, file)
  const imports = new Map<string, string[]>()

  source.forEachChild(statement => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return
    const named = statement.importClause?.namedBindings
    const names =
      named && ts.isNamedImports(named) ? named.elements.map(element => element.name.text) : []
    imports.set(statement.moduleSpecifier.text, names)
  })

  return imports
}

/** True when the file imports `name` from the shared primitive. */
function importsPrimitive(file: string, name: string): boolean {
  for (const [specifier, names] of importsOf(file)) {
    if (PRIMITIVE_SUFFIX.test(specifier) && names.includes(name)) return true
  }
  return false
}

/** Every plugin source file, plus every site it registers. */
function allSites(): { sites: Site[]; filesWithSites: string[] } {
  const sites: Site[] = []
  const filesWithSites: string[] = []

  for (const file of sourceFiles(pluginsSrc)) {
    const found = sitesIn(file)
    if (found.length === 0) continue
    sites.push(...found)
    filesWithSites.push(file)
  }

  return { sites, filesWithSites }
}

describe('plugin KPI switch', () => {
  it('namespaces every section key by its plugin and keeps them unique', () => {
    const { sites } = allSites()

    const unnamespaced = sites
      .filter(site => !site.key || !KEY_SHAPE.test(site.key))
      .map(site => `${site.rel}:${site.line} ${site.key}`)
    expect(unnamespaced).toEqual([])

    const misfiled = sites
      .filter(site => !site.key?.startsWith(`${site.plugin}:`))
      .map(site => `${site.rel}:${site.line} ${site.key}`)
    expect(misfiled).toEqual([])

    const seen = new Map<string, string>()
    const duplicates: string[] = []
    for (const site of sites) {
      const first = seen.get(site.key as string)
      if (first) duplicates.push(`${site.key} in ${first} and ${site.rel}:${site.line}`)
      else seen.set(site.key as string, `${site.rel}:${site.line}`)
    }
    expect(duplicates).toEqual([])
  })

  it('wraps a real element in every section', () => {
    const { sites } = allSites()
    expect(sites.filter(site => !site.wrapsContent).map(site => `${site.rel}:${site.line}`)).toEqual([])
  })

  it('imports the section from the shared primitive', () => {
    const strays = allSites()
      .filesWithSites.filter(file => !importsPrimitive(file, 'KpiSection'))
      .map(pluginPath)
    expect(strays).toEqual([])
  })

  it('wires every plugin and keeps each plugin at its agreed block count', () => {
    const counts = new Map<string, number>()
    for (const site of allSites().sites) counts.set(site.plugin, (counts.get(site.plugin) ?? 0) + 1)

    const missing = Object.keys(WIRED).filter(plugin => !counts.has(plugin))
    expect(missing).toEqual([])

    const drifted = Object.entries(WIRED)
      .filter(([plugin, expected]) => counts.get(plugin) !== expected)
      .map(([plugin, expected]) => `${plugin}: expected ${expected}, found ${counts.get(plugin) ?? 0}`)
    expect(drifted).toEqual([])

    const unlisted = [...counts.keys()].filter(plugin => !(plugin in WIRED))
    expect(unlisted).toEqual([])
  })

  it('mounts the provider above the routes so the header switch reaches every screen', () => {
    const app = readFileSync(APP, 'utf8')
    expect(importsPrimitive(APP, 'KpiVisibilityProvider')).toBe(true)

    const provider = app.indexOf('<KpiVisibilityProvider>')
    const router = app.indexOf('<HashRouter')
    expect(provider).toBeGreaterThan(-1)
    expect(router).toBeGreaterThan(-1)
    expect(provider).toBeLessThan(router)
  })

  it('exposes the switch from the app header', () => {
    expect(readFileSync(LAYOUT, 'utf8')).toContain('<KpiToggleButton')
    expect(importsPrimitive(LAYOUT, 'KpiToggleButton')).toBe(true)
  })

  it('keeps the stored-preference contract stable', () => {
    const store = readFileSync(STORE, 'utf8')
    expect(store).toContain("export const KPI_STORAGE_KEY = 'bizflow:kpi:visibility'")
    for (const name of ['useKpiVisibility', 'useKpiSection', 'useKpiVisibilityValue']) {
      expect(store).toContain(`export function ${name}`)
    }

    const primitive = readFileSync(PRIMITIVE, 'utf8')
    for (const name of ['KpiVisibilityProvider', 'KpiSection', 'KpiToggleButton']) {
      expect(primitive).toContain(`export function ${name}`)
    }
    // The marker the primitive renders, and the only handle the UI tests and
    // any future telemetry have on a hidden block.
    expect(primitive).toContain('data-kpi-section')
    expect(primitive).toContain('data-kpi-hidden')
  })
})
