/**
 * Every screen in every plugin has to work on a phone.
 *
 * The plugins were built desktop-first: form grids were pinned to a fixed
 * column count (`grid grid-cols-4`) and data tables were left to squeeze into
 * whatever width the window gave them. On a 390px viewport a four-column form
 * grid leaves each field about 80px wide, and a six-column table makes every
 * cell wrap to three lines — usable in the sense that nothing crashes, unusable
 * in the sense that nobody would do data entry on it.
 *
 * Two shapes are worth guarding, because each fails differently and neither is
 * visible to the other:
 *
 *   1. A multi-column grid with no responsive variant. `grid-cols-N` for N >= 3
 *      needs a `sm:`/`md:`/`lg:` step-down, so the row reflows instead of
 *      shrinking. Small grids (N = 2, and a seven-column week strip) are exempt:
 *      two columns still leaves a readable field, and a calendar week has
 *      exactly seven days.
 *   2. A table or a hard pixel floor with nowhere to scroll. `min-w-[760px]` is
 *      the standard way these tables keep their shape on a phone, but it only
 *      works if something above it pans sideways; a `<table>` in a file with no
 *      `overflow-x-auto`/`overflow-auto` at all sets the page width on a phone
 *      and drags the whole layout with it. The check is per file rather than per
 *      element because the scroll container is usually the table's parent, in
 *      another file — it catches the case that actually regresses, a new table
 *      dropped into a file that has no scroll affordance anywhere.
 *
 * The exemptions below are the sites where the narrow layout is already correct.
 * Each carries its reason, and one test asserts every entry still matches
 * something, so an exemption cannot outlive the code it excused.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const rendererSrc = join(here, '..', '..', 'renderer', 'src')
const pluginsSrc = join(rendererSrc, 'plugins')

/** A step-down for the grid utility, at any breakpoint. */
const STEP_DOWN = /(?:sm|md|lg|xl|2xl):grid-cols-\d+/

/** The bare grid utility, but not the `sm:grid-cols-4` variant of itself. */
const BARE_GRID = /(?<![:\w-])grid-cols-(\d+)(?!\d)/g

/** A fixed width wide enough to push a phone viewport into horizontal scroll. */
const WIDE_MIN_W = /(?<![:\w-])min-w-\[(\d+)px\]/

/** Any element that can be panned sideways. */
const SCROLLS = /overflow-(?:x-)?auto/

type Finding = { rel: string; line: number; text: string }

/** Every source file under `plugins/`, addressed as `plugins/.../File.tsx`. */
function filesUnder(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...filesUnder(full))
    else if (/\.tsx?$/.test(entry)) found.push(full)
  }
  return found
}

/** `plugins/coffee/pages/...` — the key the exemptions and failures print. */
function pluginPath(file: string): string {
  return `plugins/${relative(pluginsSrc, file).split(/[\\/]/).join('/')}`
}

/**
 * Comments out of the way. This file's own prose spells out the shapes the scans
 * forbid, and the plugins document their layout decisions in the same terms.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
}

/**
 * The class list a utility sits in, approximated by its line plus the two either
 * side. Prettier keeps these on one line, but a hand-wrapped
 * `` className={`grid grid-cols-1 sm:grid-cols-4 ${x}`} `` is legitimate and must
 * not be reported, so its neighbourhood is scanned with it.
 */
function classWindow(lines: string[], index: number): string {
  return [lines[index - 1], lines[index], lines[index + 1]].filter(Boolean).join(' ')
}

/** Multi-column grids whose row never reflows on a narrow viewport. */
function bareGrids(lines: string[], rel: string): Finding[] {
  const found: Finding[] = []
  lines.forEach((line, index) => {
    if (!BARE_GRID.test(line) || STEP_DOWN.test(classWindow(lines, index))) return
    BARE_GRID.lastIndex = 0
    for (const match of line.matchAll(BARE_GRID)) {
      if (Number(match[1]) < 3) continue
      found.push({ rel, line: index + 1, text: line.trim() })
    }
    BARE_GRID.lastIndex = 0
  })
  return found
}

/** Widths a phone cannot fit, in a file where nothing can be panned sideways. */
function unscrollable(lines: string[], source: string, rel: string): Finding[] {
  if (SCROLLS.test(source)) return []

  const found: Finding[] = []
  lines.forEach((line, index) => {
    const match = WIDE_MIN_W.exec(line)
    if (match && Number(match[1]) >= 320) {
      found.push({ rel, line: index + 1, text: line.trim() })
    }
  })

  const table = lines.findIndex(line => line.includes('<table'))
  if (table >= 0 && !found.some(finding => finding.line === table + 1)) {
    found.push({ rel, line: table + 1, text: lines[table].trim() })
  }

  return found
}

/**
 * Sites where the narrow layout is already correct. Keyed by file, then by a
 * substring of the offending line, so a finding has to match its entry and an
 * entry cannot quietly cover a second, unrelated site.
 */
const DELIBERATE: Record<string, { match: string; reason: string }[]> = {
  'plugins/bakery/pages/recipes/components/RecipeCardModal.tsx': [
    {
      match: '<table className="w-full text-xs text-left border-collapse">',
      reason: 'Three columns (ingredient, quantity, cost) that wrap rather than scroll, inside a print-styled card.'
    }
  ],
  'plugins/bakery/pages/recipes/components/ScalingCalculatorModal.tsx': [
    {
      match: '<table className="w-full text-xs text-left">',
      reason: 'Three columns of numbers, already inside a max-h-60 scrolling card.'
    }
  ],
  'plugins/clinic/components/PrescriptionPrintModal.tsx': [
    { match: '<table class="rx-table">', reason: 'Markup for the print window, never rendered in the app viewport.' }
  ],
  'plugins/clinic/reports/hooks/usePdfReportGenerator.ts': [
    { match: '<table', reason: 'Builds an HTML string for the PDF pipeline; never rendered on screen.' }
  ],
  'plugins/commerce/pages/QuickSale/components/CartTable.tsx': [
    {
      match: '<table className="w-full min-w-[560px] text-sm">',
      reason: 'Root-level table; its parent (QuickSale.tsx) supplies the overflow-auto container.'
    }
  ],
  'plugins/commerce/pages/Sales/components/ReceiptPreviewModal.tsx': [
    { match: '<table className="w-full text-xs">', reason: '80mm thermal receipt preview, narrow by design.' }
  ],
  'plugins/commerce/pages/POS/components/ShoppingCart.tsx': [
    {
      match: 'grid grid-cols-12 gap-1 px-2 py-1.5',
      reason: 'Compact POS cart header; the panel is full-width on phones and the columns sum to 12.'
    },
    {
      match: 'grid grid-cols-12 gap-1 px-2 py-2 border-b',
      reason: 'Compact POS cart row, spending the same 12-column budget as its header.'
    }
  ],
  'plugins/coffee/pages/finance/components/TransactionRow.tsx': [
    {
      match: 'grid grid-cols-12 gap-2 px-4 py-3 hover:bg-slate-50',
      reason: 'Row of the transactions table, which carries min-w-[720px] inside overflow-x-auto.'
    }
  ],
  'plugins/coffee/pages/finance/components/TransactionsTable.tsx': [
    {
      match: 'grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50',
      reason: 'Header of the horizontally scrolled transactions table.'
    },
    { match: 'grid grid-cols-12 gap-2 px-4 py-3 animate-pulse', reason: 'Skeleton rows of that same table.' }
  ],
  'plugins/coffee/pages/receipts/components/incoming/IncomingForm.tsx': [
    {
      match: 'hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50',
      reason: 'Column header, hidden below md where the body stacks instead.'
    },
    {
      match: 'grid grid-cols-12 gap-2 p-4 items-center bg-white',
      reason: 'Row whose children already carry their own col-span-* md:col-span-* reflow.'
    }
  ],
  'plugins/gym/pages/Attendance/components/MiniCalendar.tsx': [
    { match: 'grid grid-cols-7 mb-1 text-center', reason: 'Weekday strip: seven days, seven columns.' },
    { match: 'grid grid-cols-7 gap-1', reason: 'Week row of the same calendar.' }
  ]
}

function exemptionFor(finding: Finding): { match: string; reason: string } | undefined {
  return DELIBERATE[finding.rel]?.find(entry => finding.text.includes(entry.match))
}

const scanned = filesUnder(pluginsSrc).map(file => {
  const source = stripComments(readFileSync(file, 'utf8'))
  return { rel: pluginPath(file), lines: source.split('\n'), source }
})

const gridFindings = scanned.flatMap(({ rel, lines }) => bareGrids(lines, rel))
const widthFindings = scanned.flatMap(({ rel, lines, source }) => unscrollable(lines, source, rel))

/** Findings no exemption covers, printed as `path:line  source` for the diff. */
function unexplained(findings: Finding[]): string[] {
  return findings
    .filter(finding => !exemptionFor(finding))
    .map(finding => `${finding.rel}:${finding.line}  ${finding.text.slice(0, 110)}`)
}

describe('plugin responsiveness', () => {
  it('steps every multi-column grid down at a breakpoint', () => {
    expect(unexplained(gridFindings)).toEqual([])
  })

  it('gives every fixed-width table a horizontal scroll container', () => {
    expect(unexplained(widthFindings)).toEqual([])
  })

  it('explains every exemption', () => {
    for (const entries of Object.values(DELIBERATE)) {
      for (const entry of entries) {
        expect(entry.reason.length).toBeGreaterThan(20)
      }
    }
  })

  it('has no exemption left over from code that changed', () => {
    const stale = Object.entries(DELIBERATE).flatMap(([rel, entries]) =>
      entries
        .filter(entry => !widthFindings.concat(gridFindings).some(
          finding => finding.rel === rel && finding.text.includes(entry.match)
        ))
        .map(entry => `${rel}  ${entry.match}`)
    )

    expect(stale).toEqual([])
  })

  it('scans every plugin', () => {
    const plugins = [...new Set(scanned.map(file => file.rel.split('/')[1]))].sort()
    expect(plugins).toEqual([
      'bakery',
      'clinic',
      'coffee',
      'commerce',
      'gym',
      'pharmacy',
      'restaurant',
      'vet',
      'warehouse'
    ])
  })
})
