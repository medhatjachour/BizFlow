/**
 * Personal work OS: the invoice & statement document renderer.
 *
 * A document is the one artefact of this plugin that leaves the machine and lands
 * in a client's inbox, so the renderer is pinned to rules rather than to markup:
 *
 *  1. everything a client typed (their own name, a project title, a note) is
 *     escaped — a document must never be able to inject markup into itself;
 *  2. money and dates are formatted with an explicit locale, because a document
 *     that reads `USD1,200.00` on one machine and `1.200,00 USD` on the next is a
 *     document nobody can reconcile;
 *  3. the totals block reconciles: subtotal − discount + tax = total, and the
 *     balance falls back to total − paid when the caller does not state one;
 *  4. direction is an input, not a guess, so an Arabic document is rendered
 *     right-to-left on request.
 *
 * `domain.ts` has no Electron/Prisma imports, which is what makes all of this
 * testable without a database.
 */

import { describe, expect, it } from 'vitest'
import {
  documentDate,
  documentFileName,
  documentMoney,
  documentPercent,
  renderInvoiceDocument,
  renderStatementDocument
} from '../../plugins/personal/handlers/domain'
import type { DocumentLabels } from '../../plugins/personal/handlers/domain'

const LABELS: DocumentLabels = {
  invoice: 'Invoice',
  statement: 'Statement',
  from: 'From',
  billTo: 'Bill to',
  issued: 'Issued',
  due: 'Due',
  project: 'Project',
  period: 'Period',
  reference: 'Reference',
  status: 'Status',
  description: 'Description',
  quantity: 'Qty',
  unitPrice: 'Unit price',
  amount: 'Amount',
  subtotal: 'Subtotal',
  discount: 'Discount',
  tax: 'Tax',
  total: 'Total',
  paid: 'Paid',
  balance: 'Balance due',
  notes: 'Notes',
  emptyLines: 'Single agreed amount',
  emptyStatement: 'No invoices in this period',
  footer: 'Generated locally'
}

const issuer = { name: 'Studio Nine', detail: '12 Rue X, Casablanca', email: 'hi@studionine.test' }

function invoiceInput(extra: Record<string, unknown> = {}) {
  return {
    number: 'INV-2026-0007',
    statusLabel: 'Sent',
    kindLabel: 'Milestone',
    issuedAt: new Date(2026, 0, 5),
    dueAt: new Date(2026, 0, 20),
    currency: 'USD',
    issuedBy: issuer,
    billedTo: { name: 'Acme LLC', detail: 'Dana Reed' },
    lines: [{ label: 'Landing page', amount: 1000 }],
    net: 900,
    discount: 100,
    taxRate: 10,
    tax: 90,
    total: 990,
    paid: 0,
    balance: 990,
    ...extra
  }
}

describe('documentMoney', () => {
  it('formats client-facing money with an explicit, stable locale', () => {
    expect(documentMoney(1200)).toBe('USD 1,200.00')
    expect(documentMoney(0.5)).toBe('USD 0.50')
  })

  it('prefers the invoice currency and upper-cases it', () => {
    expect(documentMoney(10, 'eur')).toBe('EUR 10.00')
  })

  it('keeps the sign in front of the currency for a negative amount', () => {
    expect(documentMoney(-25, 'USD')).toBe('-USD 25.00')
  })

  it('treats junk, null and undefined as zero', () => {
    expect(documentMoney(undefined)).toBe('USD 0.00')
    expect(documentMoney('abc' as unknown as number)).toBe('USD 0.00')
  })
})

describe('documentPercent', () => {
  it('trims trailing zeros so a whole rate reads as a whole number', () => {
    expect(documentPercent(5)).toBe('5%')
    expect(documentPercent(7.5)).toBe('7.5%')
    expect(documentPercent(0)).toBe('0%')
  })
})

describe('documentDate', () => {
  it('formats a date deterministically', () => {
    expect(documentDate(new Date(2026, 0, 5))).toBe('Jan 5, 2026')
  })

  it('falls back to a dash for nothing and for nonsense', () => {
    expect(documentDate(null)).toBe('—')
    expect(documentDate('not-a-date')).toBe('—')
  })
})

describe('documentFileName', () => {
  it('sanitises a label that would otherwise be an invalid file name', () => {
    expect(documentFileName('INV/2026 0007')).toBe('INV-2026-0007.html')
  })

  it('never returns an empty stem', () => {
    expect(documentFileName('   ')).toBe('document.html')
    expect(documentFileName('///')).toBe('document.html')
  })

  it('honours the requested extension', () => {
    expect(documentFileName('Statement-ST-1', 'md')).toBe('Statement-ST-1.md')
  })
})

describe('renderInvoiceDocument', () => {
  it('escapes a client name that tries to inject markup', () => {
    const doc = renderInvoiceDocument(
      invoiceInput({ billedTo: { name: '<script>alert(1)</script>', detail: 'A & B' } }),
      { labels: LABELS }
    )
    expect(doc.html).not.toContain('<script>')
    expect(doc.html).toContain('&lt;script&gt;')
    expect(doc.html).toContain('A &amp; B')
  })

  it('escapes the note body as well', () => {
    const doc = renderInvoiceDocument(invoiceInput({ notes: '<b>hi</b>' }), { labels: LABELS })
    expect(doc.html).toContain('&lt;b&gt;hi&lt;/b&gt;')
  })

  it('builds the title and file name from the invoice number', () => {
    const doc = renderInvoiceDocument(invoiceInput(), { labels: LABELS })
    expect(doc.title).toBe('Invoice INV-2026-0007')
    expect(doc.fileName).toBe('INV-2026-0007.html')
  })

  it('reconciles the totals block: subtotal - discount + tax = total', () => {
    const doc = renderInvoiceDocument(invoiceInput(), { labels: LABELS })
    // net 900 + discount 100 = 1000 (gross), minus 100, plus 90 tax = 990.
    expect(doc.html).toContain('USD 1,000.00')
    expect(doc.html).toContain('-USD 100.00')
    expect(doc.html).toContain('Tax (10%)')
    expect(doc.html).toContain('USD 990.00')
  })

  it('omits the discount and tax rows when there are none', () => {
    const doc = renderInvoiceDocument(
      invoiceInput({ discount: 0, taxRate: 0, tax: 0, net: 1000, total: 1000, balance: 1000 }),
      { labels: LABELS }
    )
    expect(doc.html).not.toContain('Discount')
    expect(doc.html).not.toContain('<span>Tax</span>')
  })

  it('derives the balance from total - paid when the caller does not state one', () => {
    const { balance: stated, ...unstated } = invoiceInput({ paid: 500 })
    void stated
    const doc = renderInvoiceDocument(unstated, { labels: LABELS })
    expect(doc.html).toContain('USD 490.00')
    expect(doc.text).toContain('Balance due: USD 490.00')
  })

  it('only shows the paid row once something has been paid', () => {
    const unpaid = renderInvoiceDocument(invoiceInput(), { labels: LABELS })
    const paid = renderInvoiceDocument(invoiceInput({ paid: 500 }), { labels: LABELS })
    expect(unpaid.markdown).not.toContain('| Paid |')
    expect(paid.markdown).toContain('| Paid | USD 500.00 |')
  })

  it('falls back to the empty-lines label when there are no line items', () => {
    const doc = renderInvoiceDocument(invoiceInput({ lines: [] }), { labels: LABELS })
    expect(doc.html).toContain(LABELS.emptyLines)
    expect(doc.text).toContain(LABELS.emptyLines)
    expect(doc.markdown).toContain(`_${LABELS.emptyLines}_`)
  })

  it('drops a line whose label is blank', () => {
    const doc = renderInvoiceDocument(
      invoiceInput({ lines: [{ label: '  ', amount: 10 }, { label: 'Kept', amount: 5 }] }),
      { labels: LABELS }
    )
    expect(doc.html).toContain('Kept')
    expect(doc.html).not.toContain(LABELS.emptyLines)
  })

  it('escapes the markdown table separator so a title cannot break the row', () => {
    const doc = renderInvoiceDocument(
      invoiceInput({ lines: [{ label: 'Design | Build', amount: 10 }] }),
      { labels: LABELS }
    )
    expect(doc.markdown).toContain('Design \\| Build')
    expect(doc.markdown).not.toContain('| Design | Build |')
  })

  it('renders right-to-left on request', () => {
    const rtl = renderInvoiceDocument(invoiceInput(), { labels: LABELS, direction: 'rtl' })
    const ltr = renderInvoiceDocument(invoiceInput(), { labels: LABELS })
    expect(rtl.html).toContain('<html lang="en" dir="rtl">')
    expect(ltr.html).toContain('dir="ltr"')
  })

  it('always ships a standalone document with no external references', () => {
    const doc = renderInvoiceDocument(invoiceInput(), { labels: LABELS })
    expect(doc.html.startsWith('<!doctype html>')).toBe(true)
    expect(doc.html).not.toMatch(/<script|src=|href=/)
    expect(doc.text).toContain('INVOICE INV-2026-0007')
  })

  it('carries the kind and status labels into the document', () => {
    const doc = renderInvoiceDocument(invoiceInput(), { labels: LABELS })
    expect(doc.html).toContain('Milestone')
    expect(doc.html).toContain('Sent')
  })
})

describe('renderStatementDocument', () => {
  const rows = [
    { number: 'INV-1', statusLabel: 'Paid', issuedAt: new Date(2026, 0, 5), total: 500, paid: 500, balance: 0 },
    { number: 'INV-2', statusLabel: 'Sent', issuedAt: new Date(2026, 1, 5), total: 800, paid: 300, balance: 500 }
  ]

  function statementInput(extra: Record<string, unknown> = {}) {
    return {
      reference: 'ST-2026-0001',
      issuedAt: new Date(2026, 2, 1),
      periodFrom: new Date(2026, 0, 1),
      periodTo: new Date(2026, 1, 28),
      currency: 'USD',
      issuedBy: issuer,
      billedTo: { name: 'Acme LLC' },
      rows,
      totals: { total: 1300, paid: 800, balance: 500 },
      ...extra
    }
  }

  it('names the file after the client statement reference', () => {
    const doc = renderStatementDocument(statementInput(), { labels: LABELS })
    expect(doc.title).toBe('Statement ST-2026-0001')
    expect(doc.fileName).toBe('Statement-ST-2026-0001.html')
  })

  it('lists each invoice and totals them', () => {
    const doc = renderStatementDocument(statementInput(), { labels: LABELS })
    expect(doc.html).toContain('INV-1')
    expect(doc.html).toContain('INV-2')
    expect(doc.html).toContain('USD 1,300.00')
    expect(doc.html).toContain('USD 800.00')
    expect(doc.html).toContain('USD 500.00')
  })

  it('shows the period only when one is given', () => {
    const withPeriod = renderStatementDocument(statementInput(), { labels: LABELS })
    const without = renderStatementDocument(
      statementInput({ periodFrom: null, periodTo: null }),
      { labels: LABELS }
    )
    expect(withPeriod.html).toContain('Jan 1, 2026')
    expect(without.html).not.toContain(LABELS.period)
  })

  it('falls back to the empty-statement label for a quiet period', () => {
    const doc = renderStatementDocument(
      statementInput({ rows: [], totals: { total: 0, paid: 0, balance: 0 } }),
      { labels: LABELS }
    )
    expect(doc.html).toContain(LABELS.emptyStatement)
    expect(doc.text).toContain(LABELS.emptyStatement)
    expect(doc.markdown).toContain(`_${LABELS.emptyStatement}_`)
  })

  it('escapes the client party in a statement too', () => {
    const doc = renderStatementDocument(
      statementInput({ billedTo: { name: '<img src=x onerror=1>' } }),
      { labels: LABELS }
    )
    expect(doc.html).not.toContain('<img')
    expect(doc.html).toContain('&lt;img')
  })

  it('renders right-to-left on request', () => {
    const doc = renderStatementDocument(statementInput(), { labels: LABELS, direction: 'rtl' })
    expect(doc.html).toContain('dir="rtl"')
  })
})
