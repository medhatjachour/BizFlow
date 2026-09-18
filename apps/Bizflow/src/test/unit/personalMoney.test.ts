/**
 * Personal work OS: the invoice money engine and the price card.
 *
 * Money is the one part of this plugin where a wrong number is indistinguishable
 * from a right one until it has already been sent to a client, so the rules are
 * pinned here rather than trusted:
 *
 *  1. `invoiceTotals` is the single source of truth for invoice arithmetic — the
 *     renderer never re-derives net/tax/balance, so the numbers on screen and the
 *     numbers in the database cannot drift apart;
 *  2. discounts always apply in the same order (percentage → early-payment →
 *     flat), because "10% then $50 off" and "$50 off then 10%" are different
 *     amounts and the client only ever agrees to one of them;
 *  3. a late fee is a preview, never a silent write — it is prorated by day,
 *     clamped by the policy ceiling and stops at zero, and
 *  4. the rate card prices every tier off the same rate engine, so the retainer
 *     and rush numbers can be quoted without arithmetic in the head.
 *
 * `domain.ts` stays free of Electron/Prisma imports, which is what makes it
 * testable here; the three IPC channels are driven through their real
 * registration against an in-memory Prisma stand-in.
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
  DEFAULT_LATE_FEE_POLICY,
  buildPriceCard,
  computeDiscount,
  computeLateFee,
  computeRateEngine,
  invoiceTotals
} from '../../plugins/personal/handlers/domain'

type Row = Record<string, any>

describe('invoiceTotals', () => {
  it('derives net, tax and total from the discounted amount', () => {
    expect(invoiceTotals({ amount: 1000, discount: 200, taxRate: 10, paid: 0 })).toEqual({
      net: 800,
      tax: 80,
      total: 880,
      balance: 880
    })
  })

  it('subtracts what has already been paid from the balance', () => {
    const totals = invoiceTotals({ amount: 500, discount: 0, taxRate: 20, paid: 300 })
    expect(totals.total).toBe(600)
    expect(totals.balance).toBe(300)
  })

  it('never reports a negative balance when the invoice is overpaid', () => {
    expect(invoiceTotals({ amount: 100, taxRate: 0, paid: 250 }).balance).toBe(0)
  })

  it('caps a discount at the invoice amount so the total cannot go negative', () => {
    expect(invoiceTotals({ amount: 100, discount: 5000, taxRate: 0 })).toMatchObject({ net: 0, total: 0 })
  })

  it('treats junk input as zero', () => {
    expect(invoiceTotals({ amount: 'abc' as unknown as number })).toEqual({
      net: 0,
      tax: 0,
      total: 0,
      balance: 0
    })
  })
})

describe('computeDiscount', () => {
  it('applies the percentage off the gross amount', () => {
    const result = computeDiscount({ amount: 1000, percentOff: 10 })
    expect(result.percentOffAmount).toBe(100)
    expect(result.net).toBe(900)
    expect(result.totalDiscount).toBe(100)
  })

  it('stacks the early-payment percentage on the already-discounted subtotal', () => {
    const result = computeDiscount({ amount: 1000, percentOff: 10, earlyPaymentPercent: 5, earlyPaymentDays: 7, daysToPay: 3 })
    expect(result.percentOffAmount).toBe(100)
    expect(result.earlyPaymentApplied).toBe(true)
    // 5% of the 900 that survived the first discount — not 5% of 1000.
    expect(result.earlyPaymentAmount).toBe(45)
    expect(result.net).toBe(855)
  })

  it('drops the early-payment promo when the invoice was paid late', () => {
    const result = computeDiscount({ amount: 1000, percentOff: 10, earlyPaymentPercent: 5, earlyPaymentDays: 7, daysToPay: 30 })
    expect(result.earlyPaymentApplied).toBe(false)
    expect(result.earlyPaymentAmount).toBe(0)
    expect(result.net).toBe(900)
  })

  it('never lets the stack of discounts push the net below zero', () => {
    const result = computeDiscount({ amount: 100, percentOff: 50, amountOff: 5000 })
    expect(result.amountOffAmount).toBe(50)
    expect(result.net).toBe(0)
    expect(result.totalDiscount).toBe(100)
  })

  it('ignores a negative percentage and clamps above 100%', () => {
    expect(computeDiscount({ amount: 200, percentOff: -20 }).net).toBe(200)
    expect(computeDiscount({ amount: 200, percentOff: 400 }).net).toBe(0)
  })
})

describe('computeLateFee', () => {
  const due = new Date(2025, 0, 1)

  it('charges nothing inside the grace window but still reports the delay', () => {
    const result = computeLateFee({ balance: 1000, dueAt: due, asOf: new Date(2025, 0, 2), policy: { graceDays: 3 } })
    expect(result.daysLate).toBe(1)
    expect(result.withinGrace).toBe(true)
    expect(result.isLate).toBe(false)
    expect(result.fee).toBe(0)
    expect(result.newBalance).toBe(1000)
  })

  it('prorates the percentage by the day once the grace window closes', () => {
    // 15 chargeable days of a 30-day period at 2% => 1% of the balance.
    const result = computeLateFee({ balance: 1000, dueAt: due, asOf: new Date(2025, 0, 19), policy: { graceDays: 3, ratePercent: 2, periodDays: 30 } })
    expect(result.chargeableDays).toBe(15)
    expect(result.periods).toBe(0.5)
    expect(result.fee).toBe(10)
    expect(result.newBalance).toBe(1010)
  })

  it('caps the percentage fee at the policy ceiling', () => {
    const result = computeLateFee({
      balance: 1000,
      dueAt: due,
      asOf: new Date(2025, 11, 1),
      policy: { graceDays: 0, ratePercent: 5, periodDays: 30, maxPercent: 15 }
    })
    expect(result.rawPercentFee).toBeGreaterThan(result.cap)
    expect(result.percentFee).toBe(150)
    expect(result.capped).toBe(true)
  })

  it('adds the flat administration fee on top of the capped percentage fee', () => {
    const result = computeLateFee({
      balance: 1000,
      dueAt: due,
      asOf: new Date(2025, 11, 1),
      policy: { graceDays: 0, ratePercent: 5, periodDays: 30, maxPercent: 15, flatFee: 25 }
    })
    expect(result.fee).toBe(175)
  })

  it('compounds instead of adding periods when asked to', () => {
    const shared = { balance: 1000, dueAt: due, asOf: new Date(2025, 3, 1), policy: { graceDays: 0, ratePercent: 2, periodDays: 30, maxPercent: 0 } }
    const simple = computeLateFee({ ...shared, policy: { ...shared.policy, compounding: 'simple' } })
    const compound = computeLateFee({ ...shared, policy: { ...shared.policy, compounding: 'compound' } })
    expect(compound.fee).toBeGreaterThan(simple.fee)
  })

  it('falls back to the documented default policy', () => {
    const result = computeLateFee({ balance: 500, dueAt: due, asOf: new Date(2025, 0, 4) })
    expect(result.graceDays).toBe(DEFAULT_LATE_FEE_POLICY.graceDays)
    expect(result.ratePercent).toBe(DEFAULT_LATE_FEE_POLICY.ratePercent)
  })

  it('does not move a balance that is already settled or undated', () => {
    expect(computeLateFee({ balance: 0, dueAt: due, asOf: new Date(2025, 5, 1) }).fee).toBe(0)
    expect(computeLateFee({ balance: 1000, dueAt: null, asOf: new Date(2025, 5, 1) }).isLate).toBe(false)
  })
})

describe('buildPriceCard', () => {
  const engine = computeRateEngine({
    monthlyLivingCost: 3000,
    monthlyTaxes: 500,
    monthlySoftware: 400,
    monthlySavings: 800,
    monthlyOther: 100,
    targetBillableHoursPerWeek: 25,
    workingWeeksPerYear: 46,
    minimumProjectPrice: 1200,
    currency: 'USD'
  })

  it('prices every tier off the same baseline rate', () => {
    const card = buildPriceCard(engine, [{ name: 'Landing page', hours: 20 }])
    const [standard, retainer, rush] = card.tiers
    // 20h at the engine's rounded baseline rate of 50.09/h.
    expect(engine.baselineHourlyRate).toBe(50.09)
    expect(standard.lines[0].base).toBe(1001.8)
    expect(standard.total).toBe(1200) // minimum-project-price floor
    expect(standard.floorApplied).toBe(true)
    expect(retainer.lines[0].price).toBe(901.62)
    expect(rush.lines[0].price).toBe(1252.25)
  })

  it('accepts a fixed price for a service instead of hours', () => {
    const card = buildPriceCard(engine, [{ name: 'Brand audit', price: 2500 }])
    expect(card.tiers[0].lines[0].base).toBe(2500)
    expect(card.tiers[0].lines[0].hours).toBe(0)
  })

  it('honours custom tier multipliers', () => {
    const card = buildPriceCard(engine, [{ name: 'Retainer block', price: 1000 }], {
      retainerDiscountPercent: 20,
      rushSurchargePercent: 50
    })
    expect(card.tiers[1].lines[0].price).toBe(800)
    expect(card.tiers[2].lines[0].price).toBe(1500)
  })

  it('drops unnamed services and survives an empty list', () => {
    expect(buildPriceCard(engine, []).tiers[0].lines).toEqual([])
    expect(buildPriceCard(engine, [{ name: '   ' }]).tiers[0].lines).toEqual([])
  })
})

// ─── IPC channels ───────────────────────────────────────────────────────────

/** Minimal Prisma stand-in covering the reads the two money channels perform. */
function createFakePrisma(seed: { invoices?: Row[]; rateProfile?: Row | null } = {}) {
  const invoices = seed.invoices ?? []
  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        const clause = value as { in?: unknown[]; notIn?: unknown[] }
        if (clause.in) return clause.in.includes(row[key])
        if (clause.notIn) return !clause.notIn.includes(row[key])
      }
      return row[key] === value
    })

  return {
    personalInvoice: {
      findUnique: vi.fn(async ({ where }: { where: Row }) => invoices.find((row) => matches(row, where)) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Row } = {}) => invoices.filter((row) => matches(row, where)))
    },
    personalRateProfile: {
      findUnique: vi.fn(async () => seed.rateProfile ?? null)
    }
  }
}

function channelOf(register: (prisma: any) => void, prisma: any, channel: string) {
  register(prisma)
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([name]) => name === channel)
  if (!call) throw new Error(`${channel} was not registered`)
  return call[1] as unknown as (event: unknown, data: any) => Promise<any>
}

const invoice = (id: string, extra: Row = {}): Row => ({
  id,
  number: `INV-2025-${id}`,
  status: 'sent',
  kind: 'project',
  currency: 'USD',
  amount: 1000,
  taxRate: 0,
  discount: 0,
  issuedAt: new Date(2025, 0, 1),
  dueAt: new Date(2025, 0, 31),
  paidAt: null,
  notes: null,
  clientId: `client-${id}`,
  projectId: null,
  client: { id: `client-${id}`, name: `Client ${id}`, company: null, paymentTermsDays: 30 },
  project: null,
  payments: [],
  ...extra
})

describe('personal:billing:discountPreview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('previews a percentage discount without touching the invoice', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a', { taxRate: 10 })] })
    const preview = channelOf(registerBillingHandlers, prisma, 'personal:billing:discountPreview')

    const result = await preview(null, { id: 'a', input: { percentOff: 10 } })

    expect(result.breakdown.totalDiscount).toBe(100)
    expect(result.totalsAfter).toMatchObject({ net: 900, tax: 90, total: 990, balance: 990 })
    expect(result.overpaid).toBe(false)
    expect(prisma.personalInvoice.findUnique).toHaveBeenCalledTimes(1)
  })

  it('flags a discount that would push the invoice below what was already paid', async () => {
    const prisma = createFakePrisma({
      invoices: [invoice('a', { payments: [{ amount: 900, refundedAt: null }] })]
    })
    const preview = channelOf(registerBillingHandlers, prisma, 'personal:billing:discountPreview')

    const result = await preview(null, { id: 'a', input: { percentOff: 50 } })

    expect(result.paid).toBe(900)
    expect(result.totalsAfter.total).toBe(500)
    expect(result.overpaid).toBe(true)
  })

  it('ignores refunded payments when working out the balance', async () => {
    const prisma = createFakePrisma({
      invoices: [invoice('a', { payments: [{ amount: 400, refundedAt: null }, { amount: 400, refundedAt: new Date() }] })]
    })
    const preview = channelOf(registerBillingHandlers, prisma, 'personal:billing:discountPreview')

    const result = await preview(null, { id: 'a', input: {} })

    expect(result.paid).toBe(400)
  })

  it('rejects an unknown invoice', async () => {
    const prisma = createFakePrisma({ invoices: [] })
    const preview = channelOf(registerBillingHandlers, prisma, 'personal:billing:discountPreview')

    await expect(preview(null, { id: 'nope', input: {} })).rejects.toThrow('Invoice not found')
  })
})

describe('personal:billing:lateFeeScan', () => {
  beforeEach(() => vi.clearAllMocks())

  // Local-time constructors keep the day counts independent of the machine's timezone.
  const asOf = new Date(2025, 2, 1)

  it('lists only open invoices that are actually past due, worst first', async () => {
    const prisma = createFakePrisma({
      invoices: [
        invoice('newer', { dueAt: new Date(2025, 1, 20) }),
        invoice('older', { dueAt: new Date(2025, 0, 15) }),
        invoice('future', { dueAt: new Date(2025, 2, 30) }),
        invoice('voided', { status: 'void', dueAt: new Date(2025, 0, 1) }),
        invoice('draft', { status: 'draft', dueAt: new Date(2025, 0, 1) })
      ]
    })
    const scan = channelOf(registerBillingHandlers, prisma, 'personal:billing:lateFeeScan')

    const result = await scan(null, { asOf })

    expect(result.rows.map((row: Row) => row.invoiceId)).toEqual(['older', 'newer'])
    expect(result.totalBalance).toBe(2000)
    expect(result.chargeableCount).toBe(2)
  })

  it('does not charge an invoice that is still inside the grace window', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a', { dueAt: new Date(2025, 1, 28) })] })
    const scan = channelOf(registerBillingHandlers, prisma, 'personal:billing:lateFeeScan')

    const result = await scan(null, { asOf })

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].breakdown.withinGrace).toBe(true)
    expect(result.totalFee).toBe(0)
    expect(result.chargeableCount).toBe(0)
  })

  it('carries the client and project context needed for the fee notice', async () => {
    const prisma = createFakePrisma({
      invoices: [
        invoice('a', {
          dueAt: new Date(2025, 0, 1),
          client: { id: 'c', name: 'Yara', company: 'Northwind', paymentTermsDays: 14 },
          project: { id: 'p', code: 'NW-1' }
        })
      ]
    })
    const scan = channelOf(registerBillingHandlers, prisma, 'personal:billing:lateFeeScan')

    const result = await scan(null, { asOf })
    const row = result.rows[0]

    expect(row).toMatchObject({
      clientName: 'Northwind',
      projectCode: 'NW-1',
      paymentTermsDays: 14,
      currency: 'USD'
    })
    expect(result.policy.graceDays).toBe(DEFAULT_LATE_FEE_POLICY.graceDays)
  })

  it('honours an overridden policy', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a', { dueAt: new Date(2025, 1, 28) })] })
    const scan = channelOf(registerBillingHandlers, prisma, 'personal:billing:lateFeeScan')

    const strict = await scan(null, { asOf, policy: { graceDays: 0, ratePercent: 3, periodDays: 30, maxPercent: 0 } })

    expect(strict.policy.graceDays).toBe(0)
    expect(strict.rows[0].breakdown.chargeableDays).toBe(1)
    // One day of a 30-day period at 3% => 0.1% of 1000.
    expect(strict.totalFee).toBe(1)
  })

  it('reports a partial payment as a smaller balance', async () => {
    const prisma = createFakePrisma({
      invoices: [
        invoice('a', {
          dueAt: new Date(2025, 0, 1),
          payments: [{ amount: 400, refundedAt: null }]
        })
      ]
    })
    const scan = channelOf(registerBillingHandlers, prisma, 'personal:billing:lateFeeScan')

    const result = await scan(null, { asOf })

    expect(result.rows[0].balance).toBe(600)
    expect(result.rows[0].breakdown.newBalance).toBe(result.rows[0].breakdown.balance + result.rows[0].breakdown.fee)
  })
})

describe('personal:finance:priceCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds the card from the saved rate profile', async () => {
    const prisma = createFakePrisma({
      rateProfile: {
        id: 'default',
        monthlyLivingCost: 3000,
        monthlyTaxes: 500,
        monthlySoftware: 400,
        monthlySavings: 800,
        monthlyOther: 100,
        targetBillableHoursPerWeek: 25,
        workingWeeksPerYear: 46,
        currency: 'USD'
      }
    })
    const priceCard = channelOf(registerFinanceHandlers, prisma, 'personal:finance:priceCard')

    const result = await priceCard(null, { services: [{ name: 'Landing page', hours: 20 }] })

    expect(result.engine.baselineHourlyRate).toBe(50.09)
    expect(result.card.tiers).toHaveLength(3)
    expect(result.card.tiers.map((tier: Row) => tier.id)).toEqual(['standard', 'retainer', 'rush'])
  })

  it('still answers when no rate profile has been saved yet', async () => {
    const prisma = createFakePrisma({ rateProfile: null })
    const priceCard = channelOf(registerFinanceHandlers, prisma, 'personal:finance:priceCard')

    const result = await priceCard(null, { services: [{ name: 'Consult', price: 200 }] })

    expect(result.card.tiers[0].lines[0].price).toBe(200)
  })

  it('survives a missing service list', async () => {
    const prisma = createFakePrisma({ rateProfile: null })
    const priceCard = channelOf(registerFinanceHandlers, prisma, 'personal:finance:priceCard')

    const result = await priceCard(null, {})

    expect(result.card.tiers.every((tier: Row) => tier.lines.length === 0)).toBe(true)
  })
})
