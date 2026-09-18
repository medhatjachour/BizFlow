/**
 * Personal work OS: retainer renewal automation.
 *
 * A retainer is a promise to bill on a calendar boundary, and the failure mode
 * that costs real money is billing a client twice for the same period — once
 * because an operator forgot they had already invoiced it, and once because the
 * automation ran again. The rules pinned here are:
 *
 *  1. a period is due only once the boundary has passed, and a long absence is
 *     caught up in a single pass rather than one invoice per missed month;
 *  2. month arithmetic clamps to the end of a shorter month, so a retainer that
 *     started on the 31st does not silently slide into the 3rd;
 *  3. carry-over is capped at one period's allowance and only exists when the
 *     contract allows it, so a dormant agreement cannot bank unused time;
 *  4. the fee is raised exactly once per period — the note marker makes a second
 *     pass skip the invoice while still rolling the period;
 *  5. the preview and the apply path run the same calculation, so the number on
 *     the button is the number that lands in the ledger.
 *
 * `domain.ts` has no Electron/Prisma imports; the IPC channels are driven through
 * their real registration against an in-memory Prisma stand-in.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn(), removeHandler: vi.fn() } }))
vi.mock('../../main/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))
vi.mock('../../main/ipc/handlers/session', () => ({ requireCap: vi.fn() }))

import { ipcMain } from 'electron'
import { registerBillingHandlers } from '../../plugins/personal/handlers/billing'
import { registerFinanceHandlers } from '../../plugins/personal/handlers/finance'
import {
  addMonths,
  planRetainerRenewal,
  retainerRenewalMarker,
  retainerRenewalWindow
} from '../../plugins/personal/handlers/domain'
import type { DocumentLabels } from '../../plugins/personal/handlers/domain'

type Row = Record<string, any>

// ─── Pure planning ──────────────────────────────────────────────────────────

describe('addMonths', () => {
  it('clamps to the end of a shorter month', () => {
    const jan31 = addMonths(new Date(2026, 0, 31), 1)
    expect(jan31.getMonth()).toBe(1)
    expect(jan31.getDate()).toBe(28)
  })

  it('clamps to the 29th in a leap year', () => {
    const jan31 = addMonths(new Date(2028, 0, 31), 1)
    expect(jan31.getMonth()).toBe(1)
    expect(jan31.getDate()).toBe(29)
  })

  it('keeps the day when the target month is long enough', () => {
    const jan31 = addMonths(new Date(2026, 0, 31), 2)
    expect(jan31.getMonth()).toBe(2)
    expect(jan31.getDate()).toBe(31)
  })

  it('crosses a year boundary and accepts a zero offset', () => {
    expect(addMonths(new Date(2026, 10, 15), 2).getFullYear()).toBe(2027)
    expect(addMonths(new Date(2026, 0, 15), 0).getMonth()).toBe(0)
  })
})

describe('retainerRenewalWindow', () => {
  const retainer = { name: 'Acme SEO', periodStart: new Date(2026, 0, 1), nextResetAt: new Date(2026, 1, 1) }

  it('is not due while the boundary is still ahead', () => {
    const window = retainerRenewalWindow(retainer, new Date(2026, 0, 15))
    expect(window.isDue).toBe(false)
    expect(window.periodsDue).toBe(0)
    expect(window.daysUntilReset).toBe(17)
  })

  it('becomes due on the boundary itself', () => {
    const window = retainerRenewalWindow(retainer, new Date(2026, 1, 1))
    expect(window.isDue).toBe(true)
    expect(window.periodsDue).toBe(1)
    expect(window.daysUntilReset).toBe(0)
  })

  it('reports a negative countdown once the boundary has passed', () => {
    expect(retainerRenewalWindow(retainer, new Date(2026, 1, 11)).daysUntilReset).toBe(-10)
  })

  it('counts every missed period so a long absence is caught up at once', () => {
    const window = retainerRenewalWindow(retainer, new Date(2026, 3, 1))
    expect(window.periodsDue).toBe(3)
  })

  it('does not count the next period before its day-of-month is reached', () => {
    const onThe15th = { ...retainer, nextResetAt: new Date(2026, 1, 15) }
    expect(retainerRenewalWindow(onThe15th, new Date(2026, 2, 14)).periodsDue).toBe(1)
    expect(retainerRenewalWindow(onThe15th, new Date(2026, 2, 15)).periodsDue).toBe(2)
  })

  it('falls back to the first of next month when the contract declares no boundary', () => {
    const window = retainerRenewalWindow(
      { name: 'No boundary', periodStart: new Date(2026, 0, 1), nextResetAt: null },
      new Date(2026, 1, 2)
    )
    expect(window.periodEnd).toEqual(new Date(2026, 1, 1))
    expect(window.isDue).toBe(true)
  })

  it('ignores an unparseable boundary and uses the convention instead', () => {
    const window = retainerRenewalWindow(
      { name: 'Broken', periodStart: new Date(2026, 0, 1), nextResetAt: 'not-a-date' },
      new Date(2026, 1, 2)
    )
    expect(window.periodEnd).toEqual(new Date(2026, 1, 1))
  })
})

describe('planRetainerRenewal', () => {
  const base = {
    name: 'Acme SEO',
    periodStart: new Date(2026, 0, 1),
    nextResetAt: new Date(2026, 1, 1),
    monthlyAmount: 1500,
    hoursIncluded: 10,
    hoursUsed: 6,
    rolloverEnabled: true,
    rolloverHours: 0
  }
  const asOf = new Date(2026, 1, 5)

  it('opens the next period and carries only the unused hours', () => {
    const plan = planRetainerRenewal(base, asOf)
    expect(plan.nextPeriodStart).toEqual(new Date(2026, 1, 1))
    expect(plan.nextResetAt).toEqual(new Date(2026, 2, 1))
    expect(plan.carriedHours).toBe(4)
    expect(plan.forfeitedHours).toBe(0)
    expect(plan.rolloverHours).toBe(4)
  })

  it('caps carry-over at one period allowance so hours cannot be banked', () => {
    const plan = planRetainerRenewal({ ...base, hoursUsed: 0, rolloverHours: 20 }, asOf)
    expect(plan.carriedHours).toBe(10)
    expect(plan.forfeitedHours).toBe(20)
  })

  it('forfeits everything when the contract forbids rollover', () => {
    const plan = planRetainerRenewal({ ...base, rolloverEnabled: false }, asOf)
    expect(plan.carriedHours).toBe(0)
    expect(plan.forfeitedHours).toBe(4)
  })

  it('never carries hours for an allowance-free retainer', () => {
    const plan = planRetainerRenewal({ ...base, hoursIncluded: 0, hoursUsed: 0, rolloverHours: 2 }, asOf)
    expect(plan.carriedHours).toBe(0)
    expect(plan.forfeitedHours).toBe(2)
  })

  it('never reports a negative carry when the allowance was overspent', () => {
    const plan = planRetainerRenewal({ ...base, hoursUsed: 25 }, asOf)
    expect(plan.carriedHours).toBe(0)
    expect(plan.forfeitedHours).toBe(0)
  })

  it('charges one period fee per missed period', () => {
    const plan = planRetainerRenewal(base, new Date(2026, 3, 1))
    expect(plan.invoiceAmount).toBe(4500)
    expect(plan.shouldInvoice).toBe(true)
  })

  it('has nothing to invoice when the retainer is free', () => {
    const plan = planRetainerRenewal({ ...base, monthlyAmount: 0 }, asOf)
    expect(plan.invoiceAmount).toBe(0)
    expect(plan.shouldInvoice).toBe(false)
  })

  it('has nothing to invoice while the period is still open', () => {
    const plan = planRetainerRenewal(base, new Date(2026, 0, 20))
    expect(plan.window.isDue).toBe(false)
    expect(plan.shouldInvoice).toBe(false)
    expect(plan.invoiceAmount).toBe(0)
  })

  it('stamps the marker with the period the fee pays for, not the day it ran', () => {
    const plan = planRetainerRenewal(base, asOf)
    expect(plan.noteMarker).toBe('RETAINER-RENEWAL Acme SEO 2026-02-01')
  })

  it('catches up in one pass, so the marker names the period the fee covers', () => {
    const plan = planRetainerRenewal(base, new Date(2026, 3, 1))
    expect(plan.nextPeriodStart).toEqual(new Date(2026, 3, 1))
    expect(plan.nextResetAt).toEqual(new Date(2026, 4, 1))
    expect(plan.noteMarker).toBe('RETAINER-RENEWAL Acme SEO 2026-04-01')
  })
})

describe('retainerRenewalMarker', () => {
  it('collapses whitespace so one period cannot produce two markers', () => {
    expect(retainerRenewalMarker('  Studio   Nine ', new Date(2026, 0, 5))).toBe(
      'RETAINER-RENEWAL Studio Nine 2026-01-05'
    )
  })

  it('uses the local calendar day', () => {
    expect(retainerRenewalMarker('X', new Date(2026, 8, 9))).toBe('RETAINER-RENEWAL X 2026-09-09')
  })
})

// ─── IPC channels ───────────────────────────────────────────────────────────

/** Minimal Prisma stand-in for the renewal and export channels. */
function createFakePrisma(seed: { retainers?: Row[]; invoices?: Row[]; clients?: Row[] } = {}) {
  const retainers = seed.retainers ?? []
  const invoices = seed.invoices ?? []
  const clients = seed.clients ?? []

  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        const clause = value as { in?: unknown[]; contains?: string; not?: unknown; lte?: Date; gte?: Date }
        if (clause.in) return clause.in.includes(row[key])
        if (clause.contains !== undefined) return String(row[key] ?? '').includes(clause.contains)
        if (clause.not !== undefined) return row[key] !== clause.not
        if (clause.gte || clause.lte) {
          const at = new Date(row[key]).getTime()
          if (clause.gte && at < new Date(clause.gte).getTime()) return false
          if (clause.lte && at > new Date(clause.lte).getTime()) return false
          return true
        }
      }
      return row[key] === value
    })

  return {
    personalRetainer: {
      findMany: vi.fn(async ({ where }: { where?: Row } = {}) => retainers.filter((r) => matches(r, where))),
      update: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const row = retainers.find((r) => r.id === where.id)
        if (!row) throw new Error('Retainer not found')
        Object.assign(row, data)
        return row
      })
    },
    personalInvoice: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `invoice-${invoices.length + 1}`, ...data }
        invoices.push(row)
        return row
      }),
      count: vi.fn(async ({ where }: { where?: Row } = {}) => invoices.filter((i) => matches(i, where)).length),
      findUnique: vi.fn(async ({ where }: { where: Row }) => invoices.find((i) => matches(i, where)) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Row } = {}) => invoices.filter((i) => matches(i, where)))
    },
    personalClient: {
      findUnique: vi.fn(async ({ where }: { where: Row }) => clients.find((c) => matches(c, where)) ?? null)
    }
  }
}

function channelOf(register: (prisma: any) => void, prisma: any, channel: string) {
  register(prisma)
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([name]) => name === channel)
  if (!call) throw new Error(`${channel} was not registered`)
  return call[1] as unknown as (event: unknown, data: any) => Promise<any>
}

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

const AS_OF = new Date(2026, 1, 5)

const retainer = (id: string, extra: Row = {}): Row => ({
  id,
  name: `Retainer ${id}`,
  clientId: `client-${id}`,
  currency: 'USD',
  isActive: true,
  periodStart: new Date(2026, 0, 1),
  nextResetAt: new Date(2026, 1, 1),
  monthlyAmount: 1500,
  hoursIncluded: 10,
  hoursUsed: 6,
  rolloverEnabled: true,
  rolloverHours: 0,
  notes: null,
  client: { id: `client-${id}`, name: `Client ${id}`, company: null, paymentTermsDays: 30 },
  ...extra
})

describe('personal:finance:retainers:renewalScan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reports the due count and the fee those periods add up to', async () => {
    const prisma = createFakePrisma({
      retainers: [
        retainer('a'),
        retainer('b', { nextResetAt: new Date(2026, 2, 1), periodStart: new Date(2026, 1, 1) }),
        retainer('c', { isActive: false })
      ]
    })
    const scan = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:renewalScan')

    const result = await scan(null, { asOf: AS_OF })

    // Only the active retainers are considered, and only 'a' is past its boundary.
    expect(result.rows).toHaveLength(2)
    expect(result.dueCount).toBe(1)
    expect(result.totalInvoiceAmount).toBe(1500)
    expect(result.rows[0].clientName).toBe('Client a')
    expect(result.rows[0].plan.carriedHours).toBe(4)
  })

  it('prefers the client company as the display name', async () => {
    const prisma = createFakePrisma({
      retainers: [retainer('a', { client: { id: 'client-a', name: 'Dana', company: 'Acme LLC', paymentTermsDays: 30 } })]
    })
    const scan = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:renewalScan')

    const result = await scan(null, { asOf: AS_OF })
    expect(result.rows[0].clientName).toBe('Acme LLC')
  })
})

describe('personal:finance:retainers:rollRenewals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes nothing on a dry run but reports exactly what would happen', async () => {
    const prisma = createFakePrisma({ retainers: [retainer('a')] })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    const result = await roll(null, { asOf: AS_OF, invoice: true, dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.rolled).toBe(1)
    expect(result.invoicesCreated).toBe(0)
    expect(result.totalInvoiceAmount).toBe(1500)
    expect(result.rows[0]).toMatchObject({ action: 'rolled', reason: 'invoiced', wouldInvoice: true, invoiced: false })
    expect(prisma.personalRetainer.update).not.toHaveBeenCalled()
    expect(prisma.personalInvoice.create).not.toHaveBeenCalled()
  })

  it('opens the next period and raises the renewal invoice', async () => {
    const prisma = createFakePrisma({ retainers: [retainer('a')] })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    const result = await roll(null, { asOf: AS_OF, invoice: true })

    const stored = prisma.personalRetainer.update.mock.calls[0][0].data
    expect(stored.hoursUsed).toBe(0)
    expect(stored.rolloverHours).toBe(4)
    expect(stored.periodStart).toEqual(new Date(2026, 1, 1))
    expect(stored.nextResetAt).toEqual(new Date(2026, 2, 1))

    expect(result.invoicesCreated).toBe(1)
    const invoice = prisma.personalInvoice.create.mock.calls[0][0].data
    expect(invoice).toMatchObject({
      kind: 'retainer',
      status: 'draft',
      clientId: 'client-a',
      currency: 'USD',
      amount: 1500,
      taxRate: 0,
      discount: 0
    })
    // The draft falls due on the client's terms, counted from the run date.
    expect(invoice.dueAt).toEqual(new Date(AS_OF.getTime() + 30 * 86_400_000))
    expect(invoice.notes).toContain('RETAINER-RENEWAL Retainer a 2026-02-01')
    expect(invoice.number).toMatch(/^INV-\d{4}-0001$/)
  })

  it('rolls the period without an invoice when the fee is not wanted', async () => {
    const prisma = createFakePrisma({ retainers: [retainer('a')] })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    const result = await roll(null, { asOf: AS_OF, invoice: false })

    expect(result.invoicesCreated).toBe(0)
    expect(result.totalInvoiceAmount).toBe(0)
    expect(prisma.personalInvoice.create).not.toHaveBeenCalled()
    expect(prisma.personalRetainer.update).toHaveBeenCalledTimes(1)
    expect(result.rows[0].reason).toBe('rolled')
  })

  it('is safe to run twice: the advanced period is no longer due', async () => {
    const prisma = createFakePrisma({ retainers: [retainer('a')] })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    await roll(null, { asOf: AS_OF, invoice: true })
    const second = await roll(null, { asOf: AS_OF, invoice: true })

    expect(second.rolled).toBe(0)
    expect(second.rows[0]).toMatchObject({ action: 'skipped', reason: 'not_due', invoiceId: null })
    expect(prisma.personalInvoice.create).toHaveBeenCalledTimes(1)
  })

  it('skips the fee when the period was already invoiced', async () => {
    const prisma = createFakePrisma({
      retainers: [retainer('a')],
      invoices: [
        {
          id: 'existing',
          clientId: 'client-a',
          kind: 'retainer',
          notes: 'RETAINER-RENEWAL Retainer a 2026-02-01\nperiod 2026-01-01 -> 2026-02-01'
        }
      ]
    })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    const result = await roll(null, { asOf: AS_OF, invoice: true })

    expect(prisma.personalInvoice.create).not.toHaveBeenCalled()
    expect(result).toMatchObject({ rolled: 1, invoicesCreated: 0, totalInvoiceAmount: 0 })
    expect(result.rows[0]).toMatchObject({ reason: 'already_invoiced', invoiced: false, wouldInvoice: false })
  })

  it('leaves a retainer that is not due alone', async () => {
    const prisma = createFakePrisma({
      retainers: [retainer('a', { periodStart: new Date(2026, 1, 1), nextResetAt: new Date(2026, 2, 1) })]
    })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    const result = await roll(null, { asOf: AS_OF, invoice: true })

    expect(result.rolled).toBe(0)
    expect(result.rows[0].plan.window.isDue).toBe(false)
    expect(prisma.personalRetainer.update).not.toHaveBeenCalled()
  })

  it('can be pointed at a single retainer', async () => {
    const prisma = createFakePrisma({ retainers: [retainer('a'), retainer('b')] })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    const result = await roll(null, { asOf: AS_OF, invoice: true, retainerIds: ['b'] })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].retainerId).toBe('b')
    expect(prisma.personalRetainer.update).toHaveBeenCalledTimes(1)
  })

  it('bills every missed period in a single fee', async () => {
    const prisma = createFakePrisma({ retainers: [retainer('a')] })
    const roll = channelOf(registerFinanceHandlers, prisma, 'personal:finance:retainers:rollRenewals')

    const result = await roll(null, { asOf: new Date(2026, 3, 1), invoice: true })

    expect(result.totalInvoiceAmount).toBe(4500)
    expect(prisma.personalInvoice.create).toHaveBeenCalledTimes(1)
    expect(prisma.personalInvoice.create.mock.calls[0][0].data.amount).toBe(4500)
  })
})

describe('personal:billing:exportInvoice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the stored invoice with the labels the renderer supplied', async () => {
    const prisma = createFakePrisma({
      invoices: [
        {
          id: 'a',
          number: 'INV-2026-0009',
          status: 'sent',
          kind: 'milestone',
          currency: 'USD',
          amount: 1000,
          taxRate: 10,
          discount: 100,
          issuedAt: new Date(2026, 0, 5),
          dueAt: new Date(2026, 0, 20),
          notes: 'Thanks',
          clientId: 'client-a',
          projectId: null,
          client: { id: 'client-a', name: 'Acme LLC', company: 'Acme LLC', email: 'ap@acme.test' },
          project: { code: 'AC-1', title: 'Landing page' },
          payments: []
        }
      ]
    })
    const exportInvoice = channelOf(registerBillingHandlers, prisma, 'personal:billing:exportInvoice')

    const doc = await exportInvoice(null, {
      id: 'a',
      labels: LABELS,
      statusLabels: { sent: 'Sent' },
      kindLabels: { milestone: 'Milestone' }
    })

    expect(doc.fileName).toBe('INV-2026-0009.html')
    expect(doc.title).toBe('Invoice INV-2026-0009')
    expect(doc.html).toContain('Acme LLC')
    expect(doc.html).toContain('Landing page')
    expect(doc.html).toContain('AC-1 · Landing page')
    expect(doc.html).toContain('USD 990.00')
    // No issuer was stored, so the localized label stands in rather than a blank.
    expect(doc.html).toContain('From')
    expect(doc.html).toContain('Thanks')
  })

  it('uses the stored issuer identity when one is supplied', async () => {
    const prisma = createFakePrisma({
      invoices: [
        {
          id: 'a',
          number: 'INV-1',
          status: 'draft',
          kind: 'final',
          currency: 'USD',
          amount: 100,
          taxRate: 0,
          discount: 0,
          issuedAt: new Date(2026, 0, 5),
          dueAt: null,
          notes: null,
          clientId: 'client-a',
          projectId: null,
          client: null,
          project: null,
          payments: []
        }
      ]
    })
    const exportInvoice = channelOf(registerBillingHandlers, prisma, 'personal:billing:exportInvoice')

    const doc = await exportInvoice(null, {
      id: 'a',
      issuer: { name: 'Studio Nine', detail: '12 Rue X', email: 'hi@studio.test' },
      labels: LABELS
    })

    expect(doc.html).toContain('Studio Nine')
    expect(doc.html).toContain('hi@studio.test')
    // An unknown kind falls back to the stored value rather than disappearing.
    expect(doc.html).toContain('final')
  })

  it('rejects an unknown invoice', async () => {
    const prisma = createFakePrisma({ invoices: [] })
    const exportInvoice = channelOf(registerBillingHandlers, prisma, 'personal:billing:exportInvoice')

    await expect(exportInvoice(null, { id: 'nope', labels: LABELS })).rejects.toThrow('Invoice not found')
  })
})

describe('personal:billing:exportStatement', () => {
  beforeEach(() => vi.clearAllMocks())

  const client = { id: 'client-a', name: 'Dana Reed', company: 'Acme LLC', email: 'ap@acme.test', currency: 'USD' }

  const openInvoice = (id: string, extra: Row = {}): Row => ({
    id,
    number: `INV-${id}`,
    kind: 'milestone',
    status: 'sent',
    currency: 'USD',
    amount: 500,
    taxRate: 0,
    discount: 0,
    issuedAt: new Date(2026, 0, 5),
    dueAt: new Date(2026, 0, 20),
    notes: null,
    clientId: 'client-a',
    projectId: null,
    client,
    project: null,
    payments: [],
    ...extra
  })

  it('totals every open invoice for the client', async () => {
    const prisma = createFakePrisma({
      clients: [client],
      invoices: [
        openInvoice('1', { payments: [{ amount: 500, refundedAt: null }] }),
        openInvoice('2', { amount: 800, payments: [{ amount: 300, refundedAt: null }] }),
        openInvoice('3', { status: 'void' })
      ]
    })
    const exportStatement = channelOf(registerBillingHandlers, prisma, 'personal:billing:exportStatement')

    const doc = await exportStatement(null, { clientId: 'client-a', labels: LABELS, statusLabels: { sent: 'Sent' } })

    expect(doc.title).toMatch(/^Statement ST-\d{4}-\d{4}$/)
    // The void invoice is excluded, so 500 + 800 is the whole statement.
    expect(doc.html).toContain('USD 1,300.00')
    expect(doc.html).toContain('USD 800.00')
    expect(doc.html).not.toContain('INV-3')
  })

  it('narrows the statement to the requested period', async () => {
    const prisma = createFakePrisma({
      clients: [client],
      invoices: [
        openInvoice('1', { issuedAt: new Date(2026, 0, 5) }),
        openInvoice('2', { issuedAt: new Date(2026, 3, 5) })
      ]
    })
    const exportStatement = channelOf(registerBillingHandlers, prisma, 'personal:billing:exportStatement')

    const doc = await exportStatement(null, {
      clientId: 'client-a',
      from: new Date(2026, 0, 1).toISOString(),
      to: new Date(2026, 1, 28).toISOString(),
      labels: LABELS
    })

    expect(doc.html).toContain('INV-1')
    expect(doc.html).not.toContain('INV-2')
  })

  it('falls back to the empty-statement label for a client with no invoices', async () => {
    const prisma = createFakePrisma({ clients: [client], invoices: [] })
    const exportStatement = channelOf(registerBillingHandlers, prisma, 'personal:billing:exportStatement')

    const doc = await exportStatement(null, { clientId: 'client-a', labels: LABELS })

    expect(doc.html).toContain(LABELS.emptyStatement)
    expect(doc.html).toContain('USD 0.00')
  })

  it('rejects an unknown client', async () => {
    const prisma = createFakePrisma({ clients: [] })
    const exportStatement = channelOf(registerBillingHandlers, prisma, 'personal:billing:exportStatement')

    await expect(exportStatement(null, { clientId: 'nope', labels: LABELS })).rejects.toThrow('Client not found')
  })
})
