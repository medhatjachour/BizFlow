// ─── Personal Work: Invoicing, payments, escrow & tax vault ──────────────────
// Milestone/deposit invoicing with a split-escrow view (cash received vs. money
// actually earned), refunds, voids, write-offs and automatic tax reservation.
//
// IPC channels:
//   personal:billing:getInvoices / getInvoiceById / createInvoice / updateInvoice
//   personal:billing:deleteInvoice / applyDiscount / markStatus
//   personal:billing:discountPreview / lateFeeScan
//   personal:billing:recordPayment / deletePayment / refundPayment
//   personal:billing:voidInvoice / writeOff / getEscrow / getSummary / recomputeOverdue
//   personal:billing:exportInvoice / exportStatement
//   personal:billing:taxVault:getAll / getSummary / reserve / release / delete
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { requireCap } from '../../../main/ipc/handlers/session'
import { dayKey, monthBounds, nextInvoiceNumber, num, paginate, round2, startOfDay, toDate } from './utils'
import {
  DEFAULT_LATE_FEE_POLICY,
  computeDiscount,
  computeLateFee,
  invoiceTotals,
  renderInvoiceDocument,
  renderStatementDocument,
  splitEscrow
} from './domain'
import type { DocumentLabels, DocumentParty } from './domain'

const log = createLogger('Personal:Billing')

const INVOICE_INCLUDE = {
  client: { select: { id: true, name: true, company: true, paymentTermsDays: true } },
  project: { select: { id: true, code: true, title: true, stage: true, currency: true } },
  payments: { orderBy: { paidAt: 'asc' } }
}

/**
 * Columns a caller may edit through the generic update channel. Everything else
 * on `PersonalInvoice` is either identity or derived, so it is never copied out
 * of the payload — the channel accepts an allow-list rather than spreading it.
 */
const INVOICE_UPDATABLE_FIELDS = [
  'clientId', 'projectId', 'kind', 'currency', 'amount', 'taxRate', 'issuedAt', 'dueAt', 'notes'
] as const

/**
 * Fields that change what an invoice is worth or whether it is still alive.
 * They are only reachable through the channel that guards them, so a bulk
 * update can never stand in for a capability-gated action.
 */
const INVOICE_GUARDED_FIELDS: Record<string, string> = {
  discount: 'personal:billing:applyDiscount',
  status: 'personal:billing:markStatus',
  paidAt: 'personal:billing:voidInvoice'
}

/** Statuses `markStatus` may move an invoice to. */
const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void']

export function registerBillingHandlers(prisma: any) {
  // ── Invoices ─────────────────────────────────────────────────────────────
  ipcMain.handle('personal:billing:getInvoices', async (_e, opts?: {
    status?: string; kind?: string; clientId?: string; projectId?: string
    from?: string; to?: string; page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = {}
      if (opts?.status) where.status = opts.status
      if (opts?.kind) where.kind = opts.kind
      if (opts?.clientId) where.clientId = opts.clientId
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.from || opts?.to) {
        where.issuedAt = {}
        if (opts?.from) where.issuedAt.gte = startOfDay(opts.from)
        if (opts?.to) where.issuedAt.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      const [total, items] = await Promise.all([
        prisma.personalInvoice.count({ where }),
        prisma.personalInvoice.findMany({
          where,
          include: INVOICE_INCLUDE,
          orderBy: [{ issuedAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      return paginate(items.map(decorateInvoice), total, page, pageSize)
    } catch (err) { log.error('billing:getInvoices', err); throw err }
  })

  ipcMain.handle('personal:billing:getInvoiceById', async (_e, id: string) => {
    try {
      const invoice = await prisma.personalInvoice.findUnique({ where: { id }, include: INVOICE_INCLUDE })
      if (!invoice) return null
      const vault = await prisma.personalTaxVaultEntry.findMany({ where: { invoiceId: id } })
      return { ...decorateInvoice(invoice), taxVault: vault }
    } catch (err) { log.error('billing:getInvoiceById', err); throw err }
  })

  ipcMain.handle('personal:billing:createInvoice', async (_e, data: any) => {
    try {
      const kind = data?.kind || 'milestone'
      const client = data?.clientId
        ? await prisma.personalClient.findUnique({ where: { id: data.clientId } })
        : null
      const project = data?.projectId
        ? await prisma.personalProject.findUnique({ where: { id: data.projectId } })
        : null

      let amount = num(data?.amount)
      if (!amount && project && kind === 'deposit') {
        amount = round2(num(project.agreedAmount) * (num(project.depositPercent, 50) / 100))
      } else if (!amount && project && kind === 'final') {
        const paid = await prisma.personalPayment.aggregate({
          where: { invoice: { projectId: project.id } },
          _sum: { amount: true }
        })
        amount = round2(Math.max(0, num(project.agreedAmount) - num(paid._sum.amount)))
      }

      const issuedAt = toDate(data?.issuedAt) ?? new Date()
      const terms = Math.round(num(client?.paymentTermsDays, 14))
      const dueAt = toDate(data?.dueAt) ?? new Date(issuedAt.getTime() + terms * 86_400_000)

      const invoice = await prisma.personalInvoice.create({
        data: {
          number: (data?.number || '').trim() || nextInvoiceNumber(await nextSeq(prisma), data?.numberPrefix || 'INV'),
          clientId: data?.clientId || null,
          projectId: data?.projectId || null,
          kind,
          status: data?.status || 'draft',
          currency: data?.currency || project?.currency || client?.currency || 'USD',
          amount,
          taxRate: num(data?.taxRate),
          discount: 0,
          issuedAt,
          dueAt,
          notes: data?.notes || null
        },
        include: INVOICE_INCLUDE
      })

      if (data?.changeRequestId) {
        await prisma.personalChangeRequest.update({
          where: { id: data.changeRequestId },
          data: { status: 'invoiced' }
        })
      }
      return decorateInvoice(invoice)
    } catch (err) { log.error('billing:createInvoice', err); throw err }
  })

  ipcMain.handle('personal:billing:updateInvoice', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      if (!id) throw new Error('An invoice id is required')
      for (const field of Object.keys(INVOICE_GUARDED_FIELDS)) {
        if (field in rest) {
          throw new Error(`"${field}" cannot be changed here — use ${INVOICE_GUARDED_FIELDS[field]}`)
        }
      }
      const patch: any = {}
      for (const field of INVOICE_UPDATABLE_FIELDS) {
        if (field in rest) patch[field] = rest[field]
      }
      if ('amount' in patch) patch.amount = num(patch.amount)
      if ('taxRate' in patch) patch.taxRate = num(patch.taxRate)
      if ('issuedAt' in patch) patch.issuedAt = toDate(patch.issuedAt)
      if ('dueAt' in patch) patch.dueAt = toDate(patch.dueAt)
      const invoice = await prisma.personalInvoice.update({ where: { id }, data: patch, include: INVOICE_INCLUDE })
      return decorateInvoice(await syncStatus(prisma, invoice))
    } catch (err) { log.error('billing:updateInvoice', err); throw err }
  })

  ipcMain.handle('personal:billing:deleteInvoice', async (_e, id: string) => {
    try {
      const invoice = await prisma.personalInvoice.findUnique({ where: { id }, include: { payments: true } })
      if (!invoice) return { ok: true }
      if (invoice.payments.length > 0) throw new Error('Cannot delete an invoice that has payments — void it instead')
      return await prisma.personalInvoice.delete({ where: { id } })
    } catch (err) { log.error('billing:deleteInvoice', err); throw err }
  })

  ipcMain.handle('personal:billing:markStatus', async (_e, data: { id: string; status: string }) => {
    try {
      const status = String(data?.status ?? '')
      if (!INVOICE_STATUSES.includes(status)) throw new Error(`Unknown invoice status "${status}"`)
      // Voiding has its own capability, so the status channel must not be a way
      // around it.
      if (status === 'void') requireCap('personal_void_sale')
      const patch: any = { status }
      if (status === 'sent') patch.issuedAt = new Date()
      const invoice = await prisma.personalInvoice.update({ where: { id: data.id }, data: patch, include: INVOICE_INCLUDE })
      return decorateInvoice(invoice)
    } catch (err) { log.error('billing:markStatus', err); throw err }
  })

  /** Manual discount — gated by the `personal_discount` action capability. */
  ipcMain.handle('personal:billing:applyDiscount', async (_e, data: { id: string; discount: number; reason?: string }) => {
    try {
      requireCap('personal_discount')
      const discount = Math.max(0, num(data?.discount))
      const invoice = await prisma.personalInvoice.update({
        where: { id: data.id },
        data: { discount, notes: data.reason ?? undefined },
        include: INVOICE_INCLUDE
      })
      return decorateInvoice(invoice)
    } catch (err) { log.error('billing:applyDiscount', err); throw err }
  })

  /**
   * Read-only discount preview so the renderer never has to re-implement the
   * percentage/early-payment/flat order of application. Nothing is persisted.
   */
  ipcMain.handle('personal:billing:discountPreview', async (_e, data: { id: string; input?: any }) => {
    try {
      const invoice = await prisma.personalInvoice.findUnique({ where: { id: data?.id }, include: INVOICE_INCLUDE })
      if (!invoice) throw new Error('Invoice not found')
      const input = data?.input ?? {}
      const amount = num(input.amount, num(invoice.amount))
      const breakdown = computeDiscount({
        amount,
        percentOff: input.percentOff,
        earlyPaymentPercent: input.earlyPaymentPercent,
        amountOff: input.amountOff,
        daysToPay: input.daysToPay,
        earlyPaymentDays: input.earlyPaymentDays
      })
      const paid = (invoice.payments ?? [])
        .filter((p: any) => !p.refundedAt)
        .reduce((sum: number, p: any) => sum + num(p.amount), 0)
      const paidRounded = round2(paid)
      const totalsBefore = invoiceTotals({
        amount: invoice.amount,
        discount: invoice.discount,
        taxRate: invoice.taxRate,
        paid: paidRounded
      })
      const totalsAfter = invoiceTotals({
        amount,
        discount: breakdown.totalDiscount,
        taxRate: invoice.taxRate,
        paid: paidRounded
      })
      return {
        invoiceNumber: invoice.number,
        currency: invoice.currency,
        amount: round2(num(invoice.amount)),
        taxRate: num(invoice.taxRate),
        currentDiscount: round2(num(invoice.discount)),
        paid: paidRounded,
        breakdown,
        totalsBefore,
        totalsAfter,
        overpaid: totalsAfter.total + 0.01 < paidRounded
      }
    } catch (err) { log.error('billing:discountPreview', err); throw err }
  })

  /**
   * Late-fee audit for every invoice that is still owed money. Pure preview:
   * returns the per-invoice breakdown plus the portfolio total so the fee notice
   * can be generated without storing a policy in the database.
   */
  ipcMain.handle('personal:billing:lateFeeScan', async (_e, opts?: { policy?: any; asOf?: string }) => {
    try {
      const asOf = opts?.asOf ? new Date(opts.asOf) : new Date()
      const invoices = await prisma.personalInvoice.findMany({
        where: { status: { notIn: ['void', 'draft'] } },
        include: INVOICE_INCLUDE,
        orderBy: { dueAt: 'asc' }
      })
      const rows = (invoices ?? []).map((raw: any) => {
        const invoice = decorateInvoice(raw)
        const breakdown = computeLateFee({
          balance: invoice.balance,
          dueAt: invoice.dueAt,
          asOf,
          policy: opts?.policy
        })
        return {
          invoiceId: invoice.id,
          number: invoice.number,
          clientId: invoice.clientId ?? null,
          clientName: invoice.client?.company || invoice.client?.name || '',
          projectCode: invoice.project?.code ?? null,
          currency: invoice.currency,
          dueAt: invoice.dueAt,
          balance: invoice.balance,
          paymentTermsDays: num(invoice.client?.paymentTermsDays, 0),
          breakdown
        }
      })
      const late = rows.filter((row: any) => row.breakdown.daysLate > 0)
      return {
        asOf,
        policy: { ...DEFAULT_LATE_FEE_POLICY, ...(opts?.policy ?? {}) },
        rows: late.sort((a: any, b: any) => b.breakdown.daysLate - a.breakdown.daysLate),
        totalBalance: round2(late.reduce((sum: number, r: any) => sum + r.balance, 0)),
        totalFee: round2(late.reduce((sum: number, r: any) => sum + r.breakdown.fee, 0)),
        chargeableCount: late.filter((r: any) => r.breakdown.isLate).length
      }
    } catch (err) { log.error('billing:lateFeeScan', err); throw err }
  })

  // ── Payments ─────────────────────────────────────────────────────────────
  ipcMain.handle('personal:billing:recordPayment', async (_e, data: any) => {
    try {
      const invoice = await prisma.personalInvoice.findUnique({ where: { id: data?.invoiceId } })
      if (!invoice) throw new Error('Invoice not found')
      if (invoice.status === 'void') throw new Error('Cannot record a payment on a void invoice')

      const amount = num(data?.amount)
      if (!(amount > 0)) throw new Error('Payment amount must be greater than zero')
      const paidAt = toDate(data?.paidAt) ?? new Date()
      const isDeposit = data?.isDeposit ?? invoice.kind === 'deposit'

      const payment = await prisma.personalPayment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paidAt,
          method: data?.method || 'bank',
          reference: data?.reference || null,
          isDeposit,
          note: data?.note || null
        }
      })

      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      const taxPercent = num(profile?.taxReservePercent, 25)
      if (taxPercent > 0) {
        await prisma.personalTaxVaultEntry.create({
          data: {
            sourceType: 'invoice',
            invoiceId: invoice.id,
            paymentId: payment.id,
            amount: round2(amount * (taxPercent / 100)),
            rate: taxPercent,
            reservedAt: paidAt,
            note: `Auto-reserved ${taxPercent}% of ${invoice.number}`
          }
        })
      }

      const refreshed = await syncStatus(prisma, invoice)
      await rollRetainerIfNeeded(prisma, invoice)
      return { payment, invoice: decorateInvoice(await prisma.personalInvoice.findUnique({ where: { id: refreshed.id }, include: INVOICE_INCLUDE })) }
    } catch (err) { log.error('billing:recordPayment', err); throw err }
  })

  ipcMain.handle('personal:billing:deletePayment', async (_e, id: string) => {
    try {
      const payment = await prisma.personalPayment.findUnique({ where: { id } })
      if (!payment) return { ok: true }
      await prisma.personalTaxVaultEntry.deleteMany({ where: { paymentId: id } })
      await prisma.personalPayment.delete({ where: { id } })
      const invoice = await prisma.personalInvoice.findUnique({ where: { id: payment.invoiceId } })
      if (invoice) await syncStatus(prisma, invoice)
      return { ok: true }
    } catch (err) { log.error('billing:deletePayment', err); throw err }
  })

  /**
   * Refund a payment — guarded by the `personal_refund` capability.
   *
   * The universal permission guard also covers this channel by naming
   * convention, but it is only installed in the desktop main process; the web
   * bridge registers handlers without it, so the check is repeated inline.
   */
  ipcMain.handle('personal:billing:refundPayment', async (_e, data: { id: string; amount?: number; note?: string }) => {
    try {
      requireCap('personal_refund')
      const payment = await prisma.personalPayment.findUnique({ where: { id: data?.id } })
      if (!payment) throw new Error('Payment not found')
      if (payment.refundedAt) throw new Error('This payment was already refunded')

      const amount = data?.amount === undefined ? num(payment.amount) : Math.max(0, num(data.amount))
      if (amount > num(payment.amount) + 0.01) throw new Error('Refund cannot exceed the payment amount')

      const refunded = await prisma.personalPayment.update({
        where: { id: payment.id },
        data: { refundedAt: new Date(), refundAmount: amount, note: data?.note ?? payment.note }
      })

      // Give back the tax share that was reserved for the refunded money.
      const reserve = await prisma.personalTaxVaultEntry.findFirst({
        where: { paymentId: payment.id, releasedAt: null }
      })
      if (reserve && num(payment.amount) > 0) {
        const ratio = amount / num(payment.amount)
        const remaining = round2(Math.max(0, num(reserve.amount) * (1 - ratio)))
        if (remaining > 0) {
          await prisma.personalTaxVaultEntry.update({
            where: { id: reserve.id },
            data: { amount: remaining, note: `${reserve.note ?? ''} (refund adjusted)`.trim() }
          })
        } else {
          await prisma.personalTaxVaultEntry.delete({ where: { id: reserve.id } })
        }
      }

      const invoice = await prisma.personalInvoice.findUnique({ where: { id: payment.invoiceId } })
      if (invoice) await syncStatus(prisma, invoice)
      const refreshed = await prisma.personalInvoice.findUnique({ where: { id: payment.invoiceId }, include: INVOICE_INCLUDE })
      return { payment: refunded, invoice: refreshed ? decorateInvoice(refreshed) : null }
    } catch (err) { log.error('billing:refundPayment', err); throw err }
  })

  /** Void an invoice — guarded by the `personal_void_sale` capability. */
  ipcMain.handle('personal:billing:voidInvoice', async (_e, data: { id: string; reason?: string }) => {
    try {
      requireCap('personal_void_sale')
      const invoice = await prisma.personalInvoice.findUnique({ where: { id: data?.id } })
      if (!invoice) throw new Error('Invoice not found')
      const voided = await prisma.personalInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'void',
          paidAt: null,
          notes: data?.reason ? `Voided — ${data.reason}` : invoice.notes
        },
        include: INVOICE_INCLUDE
      })
      return decorateInvoice(voided)
    } catch (err) { log.error('billing:voidInvoice', err); throw err }
  })

  /** Write off an unpaid invoice without refunding it (bad debt record). */
  ipcMain.handle('personal:billing:writeOff', async (_e, data: { id: string; note?: string }) => {
    try {
      requireCap('personal_write_off')
      const invoice = await prisma.personalInvoice.findUnique({ where: { id: data.id } })
      if (!invoice) throw new Error('Invoice not found')
      const updated = await prisma.personalInvoice.update({
        where: { id: data.id },
        data: { status: 'void', notes: data.note ? `Written off — ${data.note}` : 'Written off', paidAt: null },
        include: INVOICE_INCLUDE
      })
      return decorateInvoice(updated)
    } catch (err) { log.error('billing:writeOff', err); throw err }
  })

  // ── Escrow & summary ─────────────────────────────────────────────────────
  ipcMain.handle('personal:billing:getEscrow', async () => {
    try {
      const invoices = await prisma.personalInvoice.findMany({
        where: { status: { not: 'void' } },
        include: { payments: true, project: { select: { stage: true, title: true, code: true } } }
      })
      const payments = invoices.flatMap((inv: any) =>
        inv.payments
          .filter((p: any) => !p.refundedAt)
          .map((p: any) => ({ invoiceId: inv.id, amount: num(p.amount), isDeposit: p.isDeposit }))
      )
      const escrow = splitEscrow(
        invoices.map((inv: any) => ({
          id: inv.id,
          number: inv.number,
          kind: inv.kind,
          amount: num(inv.amount),
          status: inv.status,
          projectStage: inv.project?.stage
        })),
        payments
      )

      const byProject = new Map<string, { projectId: string; title: string; code: string | null; cash: number; unearned: number }>()
      for (const inv of invoices) {
        const line = escrow.lines.find((l) => l.invoiceId === inv.id)
        if (!line || line.paid <= 0) continue
        const key = inv.projectId ?? 'unassigned'
        const row = byProject.get(key) ?? {
          projectId: key,
          title: inv.project?.title ?? 'Unassigned',
          code: inv.project?.code ?? null,
          cash: 0,
          unearned: 0
        }
        row.cash = round2(row.cash + line.paid)
        row.unearned = round2(row.unearned + line.unearned)
        byProject.set(key, row)
      }

      return {
        ...escrow,
        depositLines: escrow.lines.filter((l) => l.unearned > 0),
        byProject: Array.from(byProject.values()).sort((a, b) => b.unearned - a.unearned)
      }
    } catch (err) { log.error('billing:getEscrow', err); throw err }
  })

  ipcMain.handle('personal:billing:getSummary', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const from = startOfDay(opts?.from ?? monthBounds().start)
      const to = new Date(new Date(opts?.to ?? new Date()).setHours(23, 59, 59, 999))
      const now = new Date()

      const [invoices, expenses, vault, profile] = await Promise.all([
        prisma.personalInvoice.findMany({
          where: { issuedAt: { gte: from, lte: to } },
          include: { payments: true }
        }),
        prisma.personalExpense.findMany({ where: { spentAt: { gte: from, lte: to } } }),
        prisma.personalTaxVaultEntry.findMany({ where: { releasedAt: null } }),
        prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      ])

      const live = invoices.filter((i: any) => i.status !== 'void')
      const billed = live.reduce((sum: number, i: any) => sum + num(i.amount), 0)
      const collected = live.reduce(
        (sum: number, i: any) => sum + i.payments.filter((p: any) => !p.refundedAt).reduce((s: number, p: any) => s + num(p.amount), 0),
        0
      )
      let overdue = 0
      let overdueCount = 0
      for (const inv of live) {
        const paid = inv.payments.filter((p: any) => !p.refundedAt).reduce((s: number, p: any) => s + num(p.amount), 0)
        if (inv.dueAt && new Date(inv.dueAt).getTime() < now.getTime() && paid + 0.01 < num(inv.amount)) {
          overdue += num(inv.amount) - paid
          overdueCount += 1
        }
      }

      const expenseTotal = expenses.reduce((sum: number, e: any) => sum + num(e.amount), 0)
      const billableExpenses = expenses
        .filter((e: any) => e.isBillable)
        .reduce((sum: number, e: any) => sum + num(e.amount), 0)

      return {
        range: { from, to },
        currency: profile?.currency ?? 'USD',
        billed: round2(billed),
        collected: round2(collected),
        outstanding: round2(billed - collected),
        overdue: round2(overdue),
        overdueCount,
        invoiceCount: live.length,
        draftCount: live.filter((i: any) => i.status === 'draft').length,
        expenses: round2(expenseTotal),
        billableExpenses: round2(billableExpenses),
        net: round2(collected - expenseTotal),
        taxVaultBalance: round2(vault.reduce((sum: number, v: any) => sum + num(v.amount), 0)),
        taxReservePercent: num(profile?.taxReservePercent, 25)
      }
    } catch (err) { log.error('billing:getSummary', err); throw err }
  })

  /** Flips sent/partial invoices to `overdue` once their due date has passed. */
  ipcMain.handle('personal:billing:recomputeOverdue', async () => {
    try {
      const invoices = await prisma.personalInvoice.findMany({
        where: { status: { in: ['sent', 'partial'] }, dueAt: { lt: new Date() } },
        include: { payments: true }
      })
      let updated = 0
      for (const inv of invoices) {
        await syncStatus(prisma, inv)
        updated += 1
      }
      return { updated }
    } catch (err) { log.error('billing:recomputeOverdue', err); throw err }
  })

  // ── Client-facing documents ──────────────────────────────────────────────
  // Rendering stays in the main process so the exported file is byte-identical
  // to the preview the operator approved; the renderer only supplies labels.

  ipcMain.handle('personal:billing:exportInvoice', async (_e, data: {
    id: string
    issuer?: Partial<DocumentParty>
    labels: DocumentLabels
    direction?: 'ltr' | 'rtl'
    statusLabels?: Record<string, string>
    kindLabels?: Record<string, string>
  }) => {
    try {
      const invoice = await prisma.personalInvoice.findUnique({
        where: { id: data?.id },
        include: INVOICE_INCLUDE
      })
      if (!invoice) throw new Error('Invoice not found')
      const decorated = decorateInvoice(invoice)
      const labels = data.labels
      const kindLabel = resolveLabel(data.kindLabels, invoice.kind)
      const project = invoice.project as any
      const projectLabel = project ? `${project.code} · ${project.title}` : undefined

      return renderInvoiceDocument(
        {
          number: invoice.number,
          statusLabel: resolveLabel(data.statusLabels, invoice.status),
          kindLabel,
          issuedAt: invoice.issuedAt,
          dueAt: invoice.dueAt,
          currency: invoice.currency,
          issuedBy: issuerParty(data.issuer, labels.from),
          billedTo: clientParty(invoice.client),
          projectLabel,
          // The schema bills a project as one amount, so the line carries the
          // gross and the totals block shows what discount and tax did to it.
          lines: [
            {
              label: project?.title || kindLabel || invoice.number,
              detail: project && kindLabel ? kindLabel : undefined,
              amount: num(invoice.amount)
            }
          ],
          net: decorated.netAmount,
          discount: num(invoice.discount),
          taxRate: num(invoice.taxRate),
          tax: decorated.taxAmount,
          total: decorated.totalDue,
          paid: decorated.paid,
          balance: decorated.balance,
          notes: invoice.notes ?? undefined
        },
        { labels, direction: data.direction }
      )
    } catch (err) { log.error('billing:exportInvoice', err); throw err }
  })

  ipcMain.handle('personal:billing:exportStatement', async (_e, data: {
    clientId: string
    from?: string
    to?: string
    issuer?: Partial<DocumentParty>
    labels: DocumentLabels
    direction?: 'ltr' | 'rtl'
    statusLabels?: Record<string, string>
  }) => {
    try {
      const client = await prisma.personalClient.findUnique({ where: { id: data?.clientId } })
      if (!client) throw new Error('Client not found')

      const where: any = { clientId: client.id, status: { not: 'void' } }
      if (data.from) where.issuedAt = { gte: startOfDay(data.from) }
      if (data.to) {
        where.issuedAt = {
          ...(where.issuedAt ?? {}),
          lte: new Date(new Date(data.to).setHours(23, 59, 59, 999))
        }
      }

      const invoices = await prisma.personalInvoice.findMany({
        where,
        include: INVOICE_INCLUDE,
        orderBy: [{ issuedAt: 'asc' }]
      })
      const rows = invoices.map((inv: any) => {
        const decorated = decorateInvoice(inv)
        return {
          number: inv.number,
          kind: inv.kind,
          statusLabel: resolveLabel(data.statusLabels, inv.status),
          issuedAt: inv.issuedAt,
          dueAt: inv.dueAt,
          total: decorated.totalDue,
          paid: decorated.paid,
          balance: decorated.balance
        }
      })

      const periodFrom = data.from ? startOfDay(data.from) : invoices[0]?.issuedAt ?? null
      const periodTo = data.to
        ? new Date(new Date(data.to).setHours(23, 59, 59, 999))
        : periodFrom
          ? new Date()
          : null

      return renderStatementDocument(
        {
          reference: nextInvoiceNumber(await nextSeq(prisma), 'ST'),
          issuedAt: new Date(),
          periodFrom,
          periodTo,
          currency: client.currency,
          issuedBy: issuerParty(data.issuer, data.labels.from),
          billedTo: clientParty(client),
          rows,
          totals: {
            total: round2(rows.reduce((sum: number, r: any) => sum + num(r.total), 0)),
            paid: round2(rows.reduce((sum: number, r: any) => sum + num(r.paid), 0)),
            balance: round2(rows.reduce((sum: number, r: any) => sum + num(r.balance), 0))
          }
        },
        { labels: data.labels, direction: data.direction }
      )
    } catch (err) { log.error('billing:exportStatement', err); throw err }
  })

  // ── Tax vault ────────────────────────────────────────────────────────────
  ipcMain.handle('personal:billing:taxVault:getAll', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const where: any = {}
      if (opts?.from || opts?.to) {
        where.reservedAt = {}
        if (opts?.from) where.reservedAt.gte = startOfDay(opts.from)
        if (opts?.to) where.reservedAt.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      return await prisma.personalTaxVaultEntry.findMany({ where, orderBy: { reservedAt: 'desc' } })
    } catch (err) { log.error('taxVault:getAll', err); throw err }
  })

  ipcMain.handle('personal:billing:taxVault:getSummary', async () => {
    try {
      const entries = await prisma.personalTaxVaultEntry.findMany({ orderBy: { reservedAt: 'desc' } })
      const balance = entries.filter((e: any) => !e.releasedAt).reduce((sum: number, e: any) => sum + num(e.amount), 0)
      const reserved = entries.reduce((sum: number, e: any) => sum + num(e.amount), 0)
      const released = entries.filter((e: any) => e.releasedAt).reduce((sum: number, e: any) => sum + num(e.amount), 0)
      const bucket: Record<string, number> = {}
      for (const e of entries) {
        if (e.releasedAt) continue
        const key = dayKey(e.reservedAt).slice(0, 7)
        bucket[key] = round2((bucket[key] ?? 0) + num(e.amount))
      }
      return {
        balance: round2(balance),
        reservedTotal: round2(reserved),
        releasedTotal: round2(released),
        entries: entries.length,
        byMonth: Object.entries(bucket).sort((a, b) => b[0].localeCompare(a[0])).map(([month, amount]) => ({ month, amount }))
      }
    } catch (err) { log.error('taxVault:getSummary', err); throw err }
  })

  ipcMain.handle('personal:billing:taxVault:reserve', async (_e, data: any) => {
    try {
      return await prisma.personalTaxVaultEntry.create({
        data: {
          sourceType: data?.sourceType || 'manual',
          invoiceId: data?.invoiceId || null,
          paymentId: data?.paymentId || null,
          amount: num(data?.amount),
          rate: num(data?.rate),
          reservedAt: toDate(data?.reservedAt) ?? new Date(),
          note: data?.note || null
        }
      })
    } catch (err) { log.error('taxVault:reserve', err); throw err }
  })

  ipcMain.handle('personal:billing:taxVault:release', async (_e, data: { id: string; note?: string }) => {
    try {
      return await prisma.personalTaxVaultEntry.update({
        where: { id: data.id },
        data: { releasedAt: new Date(), note: data.note ?? undefined }
      })
    } catch (err) { log.error('taxVault:release', err); throw err }
  })

  ipcMain.handle('personal:billing:taxVault:delete', async (_e, id: string) => {
    try {
      return await prisma.personalTaxVaultEntry.delete({ where: { id } })
    } catch (err) { log.error('taxVault:delete', err); throw err }
  })
}

/** Localised status/kind text, falling back to the stored value. */
function resolveLabel(map: Record<string, string> | undefined, key: unknown): string | undefined {
  const raw = String(key ?? '').trim()
  if (!raw) return undefined
  return map?.[raw] ?? raw
}

/**
 * The operator's own identity, supplied per export. When nothing is configured
 * the caller's localized placeholder is used, so a blank party never appears.
 */
function issuerParty(source: Partial<DocumentParty> | undefined, fallbackName: string): DocumentParty {
  return {
    name: String(source?.name ?? '').trim() || fallbackName,
    detail: source?.detail ? String(source.detail) : undefined,
    email: source?.email ? String(source.email) : undefined
  }
}

/** Company first when there is one, with the contact name as the second line. */
function clientParty(source: any): DocumentParty {
  const company = String(source?.company ?? '').trim()
  const name = String(source?.name ?? '').trim()
  return {
    name: company || name,
    detail: company && name ? name : undefined,
    email: source?.email ? String(source.email) : undefined
  }
}

function decorateInvoice(invoice: any) {
  const payments = (invoice.payments ?? []).filter((p: any) => !p.refundedAt)
  const refunded = (invoice.payments ?? []).filter((p: any) => p.refundedAt)
  const paid = round2(payments.reduce((sum: number, p: any) => sum + num(p.amount), 0))
  const refundedTotal = round2(refunded.reduce((sum: number, p: any) => sum + num(p.refundAmount ?? p.amount), 0))
  const totals = invoiceTotals({ amount: invoice.amount, discount: invoice.discount, taxRate: invoice.taxRate, paid })
  return {
    ...invoice,
    paid,
    refundedTotal,
    balance: totals.balance,
    netAmount: totals.net,
    taxAmount: totals.tax,
    totalDue: totals.total,
    isOverdue: Boolean(
      invoice.status !== 'void' &&
      invoice.dueAt &&
      new Date(invoice.dueAt).getTime() < Date.now() &&
      paid + 0.01 < totals.total
    )
  }
}

/** Recomputes draft/sent/partial/paid/overdue from the payment ledger. */
async function syncStatus(prisma: any, invoice: any) {
  if (invoice.status === 'void') return invoice
  const payments = await prisma.personalPayment.findMany({ where: { invoiceId: invoice.id } })
  const paid = payments.filter((p: any) => !p.refundedAt).reduce((sum: number, p: any) => sum + num(p.amount), 0)
  const { total } = invoiceTotals({
    amount: invoice.amount,
    discount: invoice.discount,
    taxRate: invoice.taxRate
  })

  let status = invoice.status
  let paidAt = invoice.paidAt

  if (paid >= total - 0.01) {
    status = 'paid'
    paidAt = paidAt ?? new Date()
  } else if (paid > 0) {
    status = 'partial'
    paidAt = null
  } else if (invoice.dueAt && new Date(invoice.dueAt).getTime() < Date.now()) {
    status = invoice.status === 'draft' ? 'draft' : 'overdue'
    paidAt = null
  } else {
    status = invoice.status === 'partial' || invoice.status === 'paid' || invoice.status === 'overdue' ? 'sent' : invoice.status
    paidAt = null
  }

  if (status === invoice.status && paidAt === invoice.paidAt) return invoice
  return await prisma.personalInvoice.update({ where: { id: invoice.id }, data: { status, paidAt } })
}

/** Inclusive retainer hours are reset on the 1st of the month. */
async function rollRetainerIfNeeded(prisma: any, invoice: any) {
  if (invoice.kind !== 'retainer' || !invoice.clientId) return
  const retainers = await prisma.personalRetainer.findMany({
    where: { clientId: invoice.clientId, isActive: true }
  })
  for (const retainer of retainers) {
    const nextReset = retainer.nextResetAt ? new Date(retainer.nextResetAt) : null
    if (nextReset && nextReset.getTime() > Date.now()) continue
    const rollover = retainer.rolloverEnabled
      ? Math.max(0, round2(num(retainer.hoursIncluded) - num(retainer.hoursUsed)))
      : 0
    const now = new Date()
    await prisma.personalRetainer.update({
      where: { id: retainer.id },
      data: {
        hoursUsed: 0,
        rolloverHours: rollover,
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        nextResetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      }
    })
  }
}

async function nextSeq(prisma: any): Promise<number> {
  const count = await prisma.personalInvoice.count()
  return count + 1
}
