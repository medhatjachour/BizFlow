/**
 * Capability and validation regressions for the billing channels.
 *
 * These pin the fixes for a security review of the personal plugin. Every case
 * here was reachable before the fix:
 *
 *  1. `updateInvoice` spread the payload straight into Prisma, so a caller could
 *     set `status`, `paidAt` or `discount` — the three fields that decide what an
 *     invoice is worth and whether it is still alive — and skip the channels that
 *     guard them. It now accepts an allow-list and refuses the guarded names.
 *  2. `markStatus` accepted any string, so an invoice could be parked in a status
 *     the rest of the plugin does not understand, and `status: 'void'` was a way
 *     around the void capability.
 *  3. `recordPayment` accepted zero and negative amounts, which produced negative
 *     tax-vault reservations and a nonsense balance.
 *  4. `refundPayment` and `voidInvoice` had no inline check. On the desktop they
 *     are still covered by the universal guard (see
 *     `permissionsGuardCoverage.test.ts`), but the web bridge does not install
 *     that guard, so the check is repeated inline.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn(), removeHandler: vi.fn() } }))
vi.mock('../../main/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))
vi.mock('../../main/ipc/handlers/session', () => ({ requireCap: vi.fn() }))

import { ipcMain } from 'electron'
import { requireCap } from '../../main/ipc/handlers/session'
import { registerBillingHandlers } from '../../plugins/personal/handlers/billing'

type Row = Record<string, any>

const requireCapMock = vi.mocked(requireCap)

/** The error shape the real `requireCap` throws when a user lacks a capability. */
function denied(cap: string): Error {
  const err: any = new Error(`Permission denied — this action requires the "${cap}" permission.`)
  err.code = 'EPERM_CAP'
  err.capability = cap
  return err
}

/**
 * In-memory stand-in for the slice of the schema the five guarded channels
 * touch. Writes mutate the store so `syncStatus` sees the payment it was called
 * about, which is what makes the balance assertions meaningful.
 */
function createFakePrisma(seed: { invoices?: Row[]; payments?: Row[]; retainer?: Row[] } = {}) {
  const invoices = seed.invoices ?? []
  const payments = seed.payments ?? []
  const vault: Row[] = []
  let seq = 0

  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, value]) => row[key] === value)

  const withRelations = (row: Row | undefined) =>
    row ? { ...row, payments: payments.filter((p) => p.invoiceId === row.id) } : null

  return {
    personalInvoice: {
      findUnique: vi.fn(async ({ where, include }: { where: Row; include?: unknown }) => {
        const row = invoices.find((candidate) => matches(candidate, where))
        return include ? withRelations(row) : (row ?? null)
      }),
      update: vi.fn(async ({ where, data, include }: { where: Row; data: Row; include?: unknown }) => {
        const row = invoices.find((candidate) => matches(candidate, where))
        if (!row) throw new Error('Invoice not found')
        Object.assign(row, data)
        return include ? withRelations(row) : row
      })
    },
    personalPayment: {
      findMany: vi.fn(async ({ where }: { where?: Row } = {}) => payments.filter((p) => matches(p, where))),
      findUnique: vi.fn(async ({ where }: { where: Row }) => payments.find((p) => matches(p, where)) ?? null),
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `pay-${++seq}`, refundedAt: null, refundAmount: null, ...data }
        payments.push(row)
        return row
      }),
      update: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const row = payments.find((p) => matches(p, where))
        if (!row) throw new Error('Payment not found')
        Object.assign(row, data)
        return row
      })
    },
    personalTaxVaultEntry: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `vault-${++seq}`, ...data }
        vault.push(row)
        return row
      }),
      findFirst: vi.fn(async ({ where }: { where?: Row } = {}) => vault.find((row) => matches(row, { ...where, releasedAt: null })) ?? null),
      update: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const row = vault.find((v) => matches(v, where))
        if (!row) throw new Error('Entry not found')
        Object.assign(row, data)
        return row
      }),
      delete: vi.fn(async ({ where }: { where: Row }) => {
        const index = vault.findIndex((v) => matches(v, where))
        return vault.splice(index, 1)[0]
      })
    },
    personalRateProfile: {
      findUnique: vi.fn(async () => ({ id: 'default', taxReservePercent: 25 }))
    },
    personalRetainer: {
      findMany: vi.fn(async () => seed.retainer ?? [])
    },
    _invoices: invoices,
    _payments: payments,
    _vault: vault
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
  dueAt: new Date(2099, 0, 1),
  paidAt: null,
  notes: null,
  clientId: `client-${id}`,
  projectId: null,
  ...extra
})

const payment = (id: string, extra: Row = {}): Row => ({
  id,
  invoiceId: 'a',
  amount: 400,
  paidAt: new Date(2025, 0, 5),
  method: 'bank',
  reference: null,
  isDeposit: false,
  note: null,
  refundedAt: null,
  refundAmount: null,
  ...extra
})

beforeEach(() => vi.clearAllMocks())

// ─── updateInvoice: allow-list instead of a payload spread ──────────────────

describe('personal:billing:updateInvoice', () => {
  it('copies only the allow-listed columns out of the payload', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const update = channelOf(registerBillingHandlers, prisma, 'personal:billing:updateInvoice')

    await update(null, {
      id: 'a',
      amount: 750,
      currency: 'EUR',
      // Derived/identity columns a client must never be able to write.
      paid: 999,
      balance: 999,
      totalDue: 999,
      netAmount: 999,
      refundedTotal: 999,
      isOverdue: true,
      number: 'INV-0001',
      id2: 'spoofed'
    })

    expect(prisma.personalInvoice.update.mock.calls[0][0].data).toEqual({ amount: 750, currency: 'EUR' })
  })

  it.each([
    ['status', { status: 'paid' }],
    ['discount', { discount: 5000 }],
    ['paidAt', { paidAt: new Date() }]
  ])('refuses to change %s through the generic channel', async (field, patch) => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const update = channelOf(registerBillingHandlers, prisma, 'personal:billing:updateInvoice')

    await expect(update(null, { id: 'a', ...patch })).rejects.toThrow(`${field}" cannot be changed here`)
    expect(prisma.personalInvoice.update).not.toHaveBeenCalled()
  })

  it('points the caller at the channel that does guard the field', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const update = channelOf(registerBillingHandlers, prisma, 'personal:billing:updateInvoice')

    await expect(update(null, { id: 'a', discount: 10 })).rejects.toThrow('personal:billing:applyDiscount')
    await expect(update(null, { id: 'a', status: 'paid' })).rejects.toThrow('personal:billing:markStatus')
    await expect(update(null, { id: 'a', paidAt: null })).rejects.toThrow('personal:billing:voidInvoice')
  })

  it('requires an id', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const update = channelOf(registerBillingHandlers, prisma, 'personal:billing:updateInvoice')

    await expect(update(null, { amount: 10 })).rejects.toThrow('An invoice id is required')
    await expect(update(null, undefined)).rejects.toThrow('An invoice id is required')
  })

  it('still coerces numbers and dates, and re-derives the money columns', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const update = channelOf(registerBillingHandlers, prisma, 'personal:billing:updateInvoice')

    const result = await update(null, { id: 'a', amount: '500', taxRate: '10', dueAt: '2025-06-01' })

    const data = prisma.personalInvoice.update.mock.calls[0][0].data
    expect(data.amount).toBe(500)
    expect(data.taxRate).toBe(10)
    expect(data.dueAt).toBeInstanceOf(Date)
    // 500 + 10% tax, nothing paid.
    expect(result).toMatchObject({ netAmount: 500, taxAmount: 50, totalDue: 550, balance: 550 })
  })
})

// ─── markStatus: closed set + the void capability ───────────────────────────

describe('personal:billing:markStatus', () => {
  it('rejects a status the rest of the plugin does not understand', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const markStatus = channelOf(registerBillingHandlers, prisma, 'personal:billing:markStatus')

    await expect(markStatus(null, { id: 'a', status: 'deleted' })).rejects.toThrow('Unknown invoice status')
    await expect(markStatus(null, { id: 'a', status: '' })).rejects.toThrow('Unknown invoice status')
    await expect(markStatus(null, { id: undefined, status: undefined })).rejects.toThrow('Unknown invoice status')
    expect(prisma.personalInvoice.update).not.toHaveBeenCalled()
  })

  it('demands the void capability to reach the void status', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const markStatus = channelOf(registerBillingHandlers, prisma, 'personal:billing:markStatus')

    await markStatus(null, { id: 'a', status: 'void' })

    expect(requireCapMock).toHaveBeenCalledWith('personal_void_sale')
  })

  it('does not demand a capability for ordinary status changes', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const markStatus = channelOf(registerBillingHandlers, prisma, 'personal:billing:markStatus')

    await markStatus(null, { id: 'a', status: 'overdue' })

    expect(requireCapMock).not.toHaveBeenCalled()
    expect(prisma.personalInvoice.update.mock.calls[0][0].data).toEqual({ status: 'overdue' })
  })

  it('propagates the denial instead of writing the status', async () => {
    requireCapMock.mockImplementationOnce(() => {
      throw denied('personal_void_sale')
    })
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const markStatus = channelOf(registerBillingHandlers, prisma, 'personal:billing:markStatus')

    await expect(markStatus(null, { id: 'a', status: 'void' })).rejects.toThrow('Permission denied')
    expect(prisma.personalInvoice.update).not.toHaveBeenCalled()
  })

  it('stamps the issue date when an invoice is sent', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a', { status: 'draft' })] })
    const markStatus = channelOf(registerBillingHandlers, prisma, 'personal:billing:markStatus')

    await markStatus(null, { id: 'a', status: 'sent' })

    expect(prisma.personalInvoice.update.mock.calls[0][0].data.issuedAt).toBeInstanceOf(Date)
  })
})

// ─── recordPayment: a payment has to be worth something ─────────────────────

describe('personal:billing:recordPayment', () => {
  it.each([
    ['zero', 0],
    ['negative', -250],
    ['missing', undefined],
    ['non-numeric', 'lots']
  ])('refuses a %s amount', async (_label, amount) => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const record = channelOf(registerBillingHandlers, prisma, 'personal:billing:recordPayment')

    await expect(record(null, { invoiceId: 'a', amount })).rejects.toThrow('Payment amount must be greater than zero')
    expect(prisma.personalPayment.create).not.toHaveBeenCalled()
  })

  it('still refuses a payment against a void invoice before it looks at the amount', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a', { status: 'void' })] })
    const record = channelOf(registerBillingHandlers, prisma, 'personal:billing:recordPayment')

    await expect(record(null, { invoiceId: 'a', amount: 100 })).rejects.toThrow('Cannot record a payment on a void invoice')
  })

  it('records a valid payment and reserves the tax share', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const record = channelOf(registerBillingHandlers, prisma, 'personal:billing:recordPayment')

    const result = await record(null, { invoiceId: 'a', amount: 400 })

    expect(result.payment.amount).toBe(400)
    expect(prisma._vault).toHaveLength(1)
    expect(prisma._vault[0].amount).toBe(100)
    expect(result.invoice).toMatchObject({ status: 'partial', paid: 400, balance: 600 })
  })
})

// ─── Reversal channels: guarded inline, because the bridge has no guard ─────

describe('payment and invoice reversal capabilities', () => {
  it('checks the refund capability before reading the payment', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')], payments: [payment('p1')] })
    const refund = channelOf(registerBillingHandlers, prisma, 'personal:billing:refundPayment')

    await refund(null, { id: 'p1' })

    expect(requireCapMock).toHaveBeenCalledWith('personal_refund')
    expect(requireCapMock.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.personalPayment.findUnique.mock.invocationCallOrder[0]
    )
    expect(prisma.personalPayment.update.mock.calls[0][0].data.refundedAt).toBeInstanceOf(Date)
  })

  it('refuses to refund when the capability is missing', async () => {
    requireCapMock.mockImplementationOnce(() => {
      throw denied('personal_refund')
    })
    const prisma = createFakePrisma({ invoices: [invoice('a')], payments: [payment('p1')] })
    const refund = channelOf(registerBillingHandlers, prisma, 'personal:billing:refundPayment')

    await expect(refund(null, { id: 'p1' })).rejects.toMatchObject({ code: 'EPERM_CAP', capability: 'personal_refund' })
    expect(prisma.personalPayment.update).not.toHaveBeenCalled()
    expect(prisma.personalPayment.findUnique).not.toHaveBeenCalled()
  })

  it('checks the void capability before reading the invoice', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const voidInvoice = channelOf(registerBillingHandlers, prisma, 'personal:billing:voidInvoice')

    await voidInvoice(null, { id: 'a', reason: 'client vanished' })

    expect(requireCapMock).toHaveBeenCalledWith('personal_void_sale')
    expect(requireCapMock.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.personalInvoice.findUnique.mock.invocationCallOrder[0]
    )
    expect(prisma.personalInvoice.update.mock.calls[0][0].data).toMatchObject({
      status: 'void',
      paidAt: null,
      notes: 'Voided — client vanished'
    })
  })

  it('refuses to void when the capability is missing', async () => {
    requireCapMock.mockImplementationOnce(() => {
      throw denied('personal_void_sale')
    })
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const voidInvoice = channelOf(registerBillingHandlers, prisma, 'personal:billing:voidInvoice')

    await expect(voidInvoice(null, { id: 'a' })).rejects.toMatchObject({ code: 'EPERM_CAP' })
    expect(prisma.personalInvoice.update).not.toHaveBeenCalled()
  })

  it('leaves the void invoice untouched when the capability is present but the id is wrong', async () => {
    const prisma = createFakePrisma({ invoices: [invoice('a')] })
    const voidInvoice = channelOf(registerBillingHandlers, prisma, 'personal:billing:voidInvoice')

    await expect(voidInvoice(null, { id: 'nope' })).rejects.toThrow('Invoice not found')
  })
})
