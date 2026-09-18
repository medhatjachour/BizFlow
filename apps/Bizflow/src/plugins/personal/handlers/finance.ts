// ─── Personal Work: Financials & pricing engineering ─────────────────────────
// Cost base → baseline/floor hourly rate, quote calculator, expenses, software
// subscription audit, recurring retainers and the realized-vs-unearned view.
//
// IPC channels:
//   personal:finance:getRateProfile / saveRateProfile / getRateEngine / priceQuote
//   personal:finance:priceCard
//   personal:finance:expenses:getAll / create / update / delete / getSummary
//   personal:finance:subscriptions:getAll / create / update / delete / getAudit / getRenewals
//   personal:finance:retainers:getAll / create / update / delete / logUsage / resetUsage
//   personal:finance:retainers:renewalScan / rollRenewals
//   personal:finance:getOverview
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { dayKey, monthBounds, nextInvoiceNumber, num, paginate, round2, startOfDay, toDate } from './utils'
import {
  auditSubscriptions,
  buildPriceCard,
  computeRateEngine,
  planRetainerRenewal,
  priceQuote,
  realHourlyRate,
  retainerResetDate,
  retainerState,
  subscriptionMonthlyCost
} from './domain'

const log = createLogger('Personal:Finance')

export function registerFinanceHandlers(prisma: any) {
  // ── Rate profile & quote calculator ──────────────────────────────────────
  ipcMain.handle('personal:finance:getRateProfile', async () => {
    try {
      const existing = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      if (existing) return existing
      return await prisma.personalRateProfile.create({ data: { id: 'default' } })
    } catch (err) { log.error('finance:getRateProfile', err); throw err }
  })

  ipcMain.handle('personal:finance:saveRateProfile', async (_e, data: any) => {
    try {
      const payload = {
        currency: data?.currency || 'USD',
        monthlyLivingCost: num(data?.monthlyLivingCost),
        monthlyTaxes: num(data?.monthlyTaxes),
        monthlySoftware: num(data?.monthlySoftware),
        monthlySavings: num(data?.monthlySavings),
        monthlyOther: num(data?.monthlyOther),
        targetBillableHoursPerWeek: num(data?.targetBillableHoursPerWeek, 25),
        workingWeeksPerYear: Math.round(num(data?.workingWeeksPerYear, 46)),
        billableUtilisation: num(data?.billableUtilisation, 0.7),
        taxReservePercent: num(data?.taxReservePercent, 25),
        weeklyCapacityHours: num(data?.weeklyCapacityHours, 40),
        maxClientHoursPerWeek: num(data?.maxClientHoursPerWeek, 30),
        minimumProjectPrice: num(data?.minimumProjectPrice)
      }
      return await prisma.personalRateProfile.upsert({
        where: { id: 'default' },
        create: { id: 'default', ...payload },
        update: payload
      })
    } catch (err) { log.error('finance:saveRateProfile', err); throw err }
  })

  /** Baseline + floor hourly rate and the minimum sensible project price. */
  ipcMain.handle('personal:finance:getRateEngine', async () => {
    try {
      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      const engine = computeRateEngine(profile ?? {})
      return { profile: profile ?? null, engine }
    } catch (err) { log.error('finance:getRateEngine', err); throw err }
  })

  ipcMain.handle('personal:finance:priceQuote', async (_e, data: { hours: number; price?: number }) => {
    try {
      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      const engine = computeRateEngine(profile ?? {})
      const breakdown = priceQuote(engine, num(data?.hours), data?.price)
      const belowFloor = breakdown.recommended < engine.floorHourlyRate * Math.max(0, num(data?.hours))
      return { ...breakdown, floorHourlyRate: engine.floorHourlyRate, baselineHourlyRate: engine.baselineHourlyRate, belowFloor }
    } catch (err) { log.error('finance:priceQuote', err); throw err }
  })

  /** Tiered rate card (standard / retainer / rush) built from the rate engine. */
  ipcMain.handle('personal:finance:priceCard', async (_e, data: { services?: any[]; retainerDiscountPercent?: number; rushSurchargePercent?: number }) => {
    try {
      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      const engine = computeRateEngine(profile ?? {})
      const services = Array.isArray(data?.services) ? data.services : []
      const card = buildPriceCard(engine, services, {
        retainerDiscountPercent: data?.retainerDiscountPercent,
        rushSurchargePercent: data?.rushSurchargePercent
      })
      return { profile: profile ?? null, engine, card }
    } catch (err) { log.error('finance:priceCard', err); throw err }
  })

  // ── Expenses ─────────────────────────────────────────────────────────────
  ipcMain.handle('personal:finance:expenses:getAll', async (_e, opts?: {
    category?: string; projectId?: string; from?: string; to?: string; billable?: boolean
    page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = {}
      if (opts?.category) where.category = opts.category
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.billable !== undefined) where.isBillable = opts.billable
      if (opts?.from || opts?.to) {
        where.spentAt = {}
        if (opts?.from) where.spentAt.gte = startOfDay(opts.from)
        if (opts?.to) where.spentAt.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      const [total, items] = await Promise.all([
        prisma.personalExpense.count({ where }),
        prisma.personalExpense.findMany({
          where,
          include: { project: { select: { id: true, code: true, title: true } } },
          orderBy: { spentAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      return paginate(items, total, page, pageSize)
    } catch (err) { log.error('expenses:getAll', err); throw err }
  })

  ipcMain.handle('personal:finance:expenses:create', async (_e, data: any) => {
    try {
      return await prisma.personalExpense.create({
        data: {
          projectId: data?.projectId || null,
          description: String(data?.description ?? '').trim(),
          category: data?.category || 'software',
          vendor: data?.vendor || null,
          amount: num(data?.amount),
          currency: data?.currency || 'USD',
          spentAt: toDate(data?.spentAt) ?? new Date(),
          isBillable: data?.isBillable ?? false,
          paymentMethod: data?.paymentMethod || 'card',
          note: data?.note || null
        },
        include: { project: { select: { id: true, code: true, title: true } } }
      })
    } catch (err) { log.error('expenses:create', err); throw err }
  })

  ipcMain.handle('personal:finance:expenses:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('amount' in patch) patch.amount = num(patch.amount)
      if ('spentAt' in patch) patch.spentAt = toDate(patch.spentAt)
      return await prisma.personalExpense.update({
        where: { id },
        data: patch,
        include: { project: { select: { id: true, code: true, title: true } } }
      })
    } catch (err) { log.error('expenses:update', err); throw err }
  })

  ipcMain.handle('personal:finance:expenses:delete', async (_e, id: string) => {
    try {
      return await prisma.personalExpense.delete({ where: { id } })
    } catch (err) { log.error('expenses:delete', err); throw err }
  })

  ipcMain.handle('personal:finance:expenses:getSummary', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const from = startOfDay(opts?.from ?? monthBounds().start)
      const to = new Date(new Date(opts?.to ?? new Date()).setHours(23, 59, 59, 999))
      const expenses = await prisma.personalExpense.findMany({ where: { spentAt: { gte: from, lte: to } } })

      const byCategory: Record<string, number> = {}
      const byMonth: Record<string, number> = {}
      let total = 0
      let billable = 0
      for (const e of expenses) {
        const amount = num(e.amount)
        total += amount
        if (e.isBillable) billable += amount
        byCategory[e.category] = round2((byCategory[e.category] ?? 0) + amount)
        const month = dayKey(e.spentAt).slice(0, 7)
        byMonth[month] = round2((byMonth[month] ?? 0) + amount)
      }
      return {
        range: { from, to },
        total: round2(total),
        billable: round2(billable),
        count: expenses.length,
        byCategory: Object.entries(byCategory)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount),
        byMonth: Object.entries(byMonth)
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month))
      }
    } catch (err) { log.error('expenses:getSummary', err); throw err }
  })

  // ── Software subscription audit ──────────────────────────────────────────
  ipcMain.handle('personal:finance:subscriptions:getAll', async (_e, opts?: {
    activeOnly?: boolean; category?: string
  }) => {
    try {
      const where: any = {}
      if (opts?.activeOnly) where.isActive = true
      if (opts?.category) where.category = opts.category
      const items = await prisma.personalSubscription.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { amount: 'desc' }]
      })
      return items.map((s: any) => ({ ...s, monthlyCost: subscriptionMonthlyCost(s.amount, s.billingCycle) }))
    } catch (err) { log.error('subscriptions:getAll', err); throw err }
  })

  ipcMain.handle('personal:finance:subscriptions:create', async (_e, data: any) => {
    try {
      return await prisma.personalSubscription.create({
        data: {
          name: String(data?.name ?? '').trim(),
          vendor: data?.vendor || null,
          amount: num(data?.amount),
          currency: data?.currency || 'USD',
          billingCycle: data?.billingCycle || 'monthly',
          category: data?.category || 'software',
          nextRenewalAt: toDate(data?.nextRenewalAt),
          autoRenew: data?.autoRenew ?? true,
          isActive: data?.isActive ?? true,
          isEssential: data?.isEssential ?? true,
          lastUsedAt: toDate(data?.lastUsedAt),
          usageLevel: data?.usageLevel || 'weekly',
          notes: data?.notes || null
        }
      })
    } catch (err) { log.error('subscriptions:create', err); throw err }
  })

  ipcMain.handle('personal:finance:subscriptions:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('amount' in patch) patch.amount = num(patch.amount)
      if ('nextRenewalAt' in patch) patch.nextRenewalAt = toDate(patch.nextRenewalAt)
      if ('lastUsedAt' in patch) patch.lastUsedAt = toDate(patch.lastUsedAt)
      return await prisma.personalSubscription.update({ where: { id }, data: patch })
    } catch (err) { log.error('subscriptions:update', err); throw err }
  })

  ipcMain.handle('personal:finance:subscriptions:delete', async (_e, id: string) => {
    try {
      return await prisma.personalSubscription.delete({ where: { id } })
    } catch (err) { log.error('subscriptions:delete', err); throw err }
  })

  /** Monthly burn, cancel candidates and what they add to your hourly rate. */
  ipcMain.handle('personal:finance:subscriptions:getAudit', async () => {
    try {
      const subs = await prisma.personalSubscription.findMany()
      const audit = auditSubscriptions(subs)
      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      const engine = computeRateEngine(profile ?? {})
      const hoursPerMonth = Math.max(1, engine.billableHoursPerYear / 12)

      return {
        ...audit,
        toolCostPerHour: round2(audit.monthlyBurn / hoursPerMonth),
        totalCount: subs.length,
        activeCount: subs.filter((s: any) => s.isActive).length,
        essentialCount: subs.filter((s: any) => s.isActive && s.isEssential).length,
        candidates: audit.cancelCandidates.map((line) => ({
          ...line,
          subscription: subs.find((s: any) => s.id === line.id) ?? null
        })),
        potentialMonthlySaving: round2(
          audit.cancelCandidates
            .filter((l) => l.verdict === 'cancel')
            .reduce((sum, l) => sum + l.monthlyCost, 0)
        )
      }
    } catch (err) { log.error('subscriptions:getAudit', err); throw err }
  })

  ipcMain.handle('personal:finance:subscriptions:getRenewals', async (_e, opts?: { days?: number }) => {
    try {
      const horizon = opts?.days ?? 30
      const until = new Date(Date.now() + horizon * 86_400_000)
      const subs = await prisma.personalSubscription.findMany({
        where: { isActive: true, nextRenewalAt: { not: null, lte: until } },
        orderBy: { nextRenewalAt: 'asc' }
      })
      const now = Date.now()
      return subs.map((s: any) => ({
        ...s,
        monthlyCost: subscriptionMonthlyCost(s.amount, s.billingCycle),
        daysUntil: Math.max(0, Math.round((new Date(s.nextRenewalAt).getTime() - now) / 86_400_000))
      }))
    } catch (err) { log.error('subscriptions:getRenewals', err); throw err }
  })

  // ── Retainers ────────────────────────────────────────────────────────────
  ipcMain.handle('personal:finance:retainers:getAll', async (_e, opts?: { activeOnly?: boolean; clientId?: string }) => {
    try {
      const where: any = {}
      if (opts?.activeOnly) where.isActive = true
      if (opts?.clientId) where.clientId = opts.clientId
      const items = await prisma.personalRetainer.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, company: true } },
          usages: { orderBy: { usedAt: 'desc' }, take: 20 }
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
      })
      return items.map((r: any) => ({
        ...r,
        state: retainerState(r),
        renewalPlan: planRetainerRenewal(r),
        effectiveHourlyRate: num(r.hoursIncluded) > 0 ? round2(num(r.monthlyAmount) / num(r.hoursIncluded)) : 0
      }))
    } catch (err) { log.error('retainers:getAll', err); throw err }
  })

  ipcMain.handle('personal:finance:retainers:create', async (_e, data: any) => {
    try {
      return await prisma.personalRetainer.create({
        data: {
          clientId: data?.clientId,
          name: String(data?.name ?? '').trim(),
          monthlyAmount: num(data?.monthlyAmount),
          currency: data?.currency || 'USD',
          hoursIncluded: num(data?.hoursIncluded),
          hoursUsed: 0,
          rolloverEnabled: data?.rolloverEnabled ?? false,
          rolloverHours: 0,
          periodStart: new Date(),
          nextResetAt: retainerResetDate(),
          isActive: data?.isActive ?? true,
          notes: data?.notes || null
        },
        include: { client: { select: { id: true, name: true } } }
      })
    } catch (err) { log.error('retainers:create', err); throw err }
  })

  ipcMain.handle('personal:finance:retainers:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      for (const key of ['monthlyAmount', 'hoursIncluded', 'hoursUsed', 'rolloverHours']) {
        if (key in patch) patch[key] = num(patch[key])
      }
      if ('nextResetAt' in patch) patch.nextResetAt = toDate(patch.nextResetAt)
      return await prisma.personalRetainer.update({
        where: { id },
        data: patch,
        include: { client: { select: { id: true, name: true } } }
      })
    } catch (err) { log.error('retainers:update', err); throw err }
  })

  ipcMain.handle('personal:finance:retainers:delete', async (_e, id: string) => {
    try {
      return await prisma.personalRetainer.delete({ where: { id } })
    } catch (err) { log.error('retainers:delete', err); throw err }
  })

  ipcMain.handle('personal:finance:retainers:logUsage', async (_e, data: { retainerId: string; minutes: number; note?: string }) => {
    try {
      const retainer = await prisma.personalRetainer.findUnique({ where: { id: data?.retainerId } })
      if (!retainer) throw new Error('Retainer not found')
      const minutes = Math.max(0, Math.round(num(data?.minutes)))
      const hours = round2(minutes / 60)

      await prisma.personalRetainerUsage.create({
        data: { retainerId: retainer.id, minutes, note: data?.note || null }
      })
      const updated = await prisma.personalRetainer.update({
        where: { id: retainer.id },
        data: { hoursUsed: round2(num(retainer.hoursUsed) + hours) },
        include: { client: { select: { id: true, name: true } } }
      })
      return { ...updated, state: retainerState(updated) }
    } catch (err) { log.error('retainers:logUsage', err); throw err }
  })

  /** Monthly rollover: unused hours carry over only when the contract allows. */
  ipcMain.handle('personal:finance:retainers:resetUsage', async (_e, data: { id: string; carryOver?: boolean }) => {
    try {
      const retainer = await prisma.personalRetainer.findUnique({ where: { id: data?.id } })
      if (!retainer) throw new Error('Retainer not found')
      const unused = round2(Math.max(0, num(retainer.hoursIncluded) + num(retainer.rolloverHours) - num(retainer.hoursUsed)))
      const carry = data?.carryOver ?? retainer.rolloverEnabled
      const updated = await prisma.personalRetainer.update({
        where: { id: retainer.id },
        data: {
          hoursUsed: 0,
          rolloverHours: carry ? unused : 0,
          periodStart: new Date(),
          nextResetAt: retainerResetDate()
        },
        include: { client: { select: { id: true, name: true } } }
      })
      return { ...updated, carriedOver: carry ? unused : 0, state: retainerState(updated) }
    } catch (err) { log.error('retainers:resetUsage', err); throw err }
  })

  // ── Retainer renewal automation ──────────────────────────────────────────
  // Rolling a retainer opens the next period, carries only what the contract
  // allows and — when asked — raises the renewal invoice. The preview and the
  // apply path both go through `planRetainerRenewal`, so what the panel shows
  // is exactly what runs.

  ipcMain.handle('personal:finance:retainers:renewalScan', async (_e, opts?: { asOf?: string }) => {
    try {
      const asOf = toDate(opts?.asOf) ?? new Date()
      const retainers = await prisma.personalRetainer.findMany({
        where: { isActive: true },
        include: { client: { select: { id: true, name: true, company: true } } },
        orderBy: [{ name: 'asc' }]
      })
      const rows = retainers.map((retainer: any) => ({
        retainerId: retainer.id,
        name: retainer.name,
        clientName: retainer.client?.company || retainer.client?.name || '',
        currency: retainer.currency,
        plan: planRetainerRenewal(retainer, asOf)
      }))
      const due = rows.filter((row: any) => row.plan.window.isDue)
      return {
        asOf,
        rows,
        dueCount: due.length,
        totalInvoiceAmount: round2(due.reduce((sum: number, row: any) => sum + row.plan.invoiceAmount, 0))
      }
    } catch (err) { log.error('retainers:renewalScan', err); throw err }
  })

  ipcMain.handle('personal:finance:retainers:rollRenewals', async (_e, opts?: {
    asOf?: string; invoice?: boolean; dryRun?: boolean; retainerIds?: string[]
  }) => {
    try {
      const asOf = toDate(opts?.asOf) ?? new Date()
      const dryRun = opts?.dryRun ?? false
      const wantsInvoice = opts?.invoice ?? false
      const where: any = { isActive: true }
      if (opts?.retainerIds?.length) where.id = { in: opts.retainerIds }

      const retainers = await prisma.personalRetainer.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, company: true, paymentTermsDays: true } }
        },
        orderBy: [{ name: 'asc' }]
      })

      const rows: any[] = []
      let rolled = 0
      let invoicesCreated = 0
      let totalInvoiceAmount = 0

      for (const retainer of retainers) {
        const plan = planRetainerRenewal(retainer, asOf)
        const base = {
          retainerId: retainer.id,
          name: retainer.name,
          clientName: retainer.client?.company || retainer.client?.name || '',
          plan
        }

        if (!plan.window.isDue) {
          rows.push({ ...base, action: 'skipped', reason: 'not_due', invoiceId: null })
          continue
        }

        // Idempotency: the marker stamps the period the invoice paid for, so a
        // second pass finds it and refuses to bill the client twice.
        const alreadyInvoiced = await findRenewalInvoice(prisma, retainer.clientId, plan.noteMarker)
        const shouldRaise =
          wantsInvoice && plan.shouldInvoice && !alreadyInvoiced

        if (!dryRun) {
          await prisma.personalRetainer.update({
            where: { id: retainer.id },
            data: {
              hoursUsed: 0,
              rolloverHours: plan.rolloverHours,
              periodStart: plan.nextPeriodStart,
              nextResetAt: plan.nextResetAt
            }
          })
        }

        let invoiceId: string | null = null
        if (shouldRaise) {
          totalInvoiceAmount = round2(totalInvoiceAmount + plan.invoiceAmount)
          if (!dryRun) {
            const terms = Math.round(num(retainer.client?.paymentTermsDays, 14))
            const invoice = await prisma.personalInvoice.create({
              data: {
                number: nextInvoiceNumber(await nextSeq(prisma), 'INV'),
                clientId: retainer.clientId,
                projectId: null,
                kind: 'retainer',
                status: 'draft',
                currency: retainer.currency || 'USD',
                amount: plan.invoiceAmount,
                taxRate: 0,
                discount: 0,
                issuedAt: asOf,
                dueAt: new Date(asOf.getTime() + terms * 86_400_000),
                notes: renewalNote(plan)
              }
            })
            invoiceId = invoice.id
            invoicesCreated += 1
          }
        }

        rolled += 1
        rows.push({
          ...base,
          action: 'rolled',
          reason: alreadyInvoiced ? 'already_invoiced' : shouldRaise ? 'invoiced' : 'rolled',
          invoiceId,
          invoiced: shouldRaise && !dryRun,
          wouldInvoice: shouldRaise
        })
      }

      return { asOf, dryRun, rows, rolled, invoicesCreated, totalInvoiceAmount }
    } catch (err) { log.error('retainers:rollRenewals', err); throw err }
  })

  // ── Combined finance overview ────────────────────────────────────────────
  ipcMain.handle('personal:finance:getOverview', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const from = startOfDay(opts?.from ?? monthBounds().start)
      const to = new Date(new Date(opts?.to ?? new Date()).setHours(23, 59, 59, 999))
      const now = new Date()

      const [profile, subs, retainers, expenses, invoices, vault, sessions] = await Promise.all([
        prisma.personalRateProfile.findUnique({ where: { id: 'default' } }),
        prisma.personalSubscription.findMany({ where: { isActive: true } }),
        prisma.personalRetainer.findMany({ where: { isActive: true }, include: { client: { select: { name: true } } } }),
        prisma.personalExpense.findMany({ where: { spentAt: { gte: from, lte: to } } }),
        prisma.personalInvoice.findMany({
          where: { status: { not: 'void' } },
          include: { payments: true }
        }),
        prisma.personalTaxVaultEntry.findMany({ where: { releasedAt: null } }),
        prisma.personalFocusSession.findMany({
          where: { startedAt: { gte: from, lte: to }, endedAt: { not: null } }
        })
      ])

      const engine = computeRateEngine(profile ?? {})
      const audit = auditSubscriptions(subs)
      const mrr = round2(retainers.reduce((sum: number, r: any) => sum + num(r.monthlyAmount), 0))
      const expenseTotal = round2(expenses.reduce((sum: number, e: any) => sum + num(e.amount), 0))

      let collected = 0
      let billed = 0
      let overdue = 0
      for (const inv of invoices) {
        const paid = inv.payments.filter((p: any) => !p.refundedAt).reduce((s: number, p: any) => s + num(p.amount), 0)
        billed += num(inv.amount)
        collected += paid
        if (inv.dueAt && new Date(inv.dueAt).getTime() < now.getTime() && paid + 0.01 < num(inv.amount)) {
          overdue += num(inv.amount) - paid
        }
      }

      const realMinutes = sessions.reduce((sum: number, s: any) => sum + num(s.actualMinutes), 0)
      const paidThisPeriod = invoices
        .flatMap((inv: any) => inv.payments)
        .filter((p: any) => !p.refundedAt && new Date(p.paidAt) >= from && new Date(p.paidAt) <= to)
        .reduce((sum: number, p: any) => sum + num(p.amount), 0)
      const rate = realHourlyRate(paidThisPeriod, realMinutes, engine.baselineHourlyRate)

      return {
        range: { from, to },
        engine,
        subscriptionBurn: audit.monthlyBurn,
        subscriptionAnnualBurn: audit.annualBurn,
        cancelCandidates: audit.cancelCandidates.length,
        potentialSaving: round2(
          audit.cancelCandidates.filter((l) => l.verdict === 'cancel').reduce((sum, l) => sum + l.monthlyCost, 0)
        ),
        mrr,
        retainerClients: retainers.length,
        retainerHoursCommitted: round2(retainers.reduce((sum: number, r: any) => sum + num(r.hoursIncluded), 0)),
        retainerHoursRemaining: round2(
          retainers.reduce((sum: number, r: any) => {
            const state = retainerState(r)
            return sum + Math.max(0, state.hoursAvailable)
          }, 0)
        ),
        expenses: expenseTotal,
        billed: round2(billed),
        collected: round2(collected),
        outstanding: round2(billed - collected),
        overdue: round2(overdue),
        net: round2(collected - expenseTotal - audit.monthlyBurn),
        taxVaultBalance: round2(vault.reduce((sum: number, v: any) => sum + num(v.amount), 0)),
        realRate: rate,
        trackedHours: round2(realMinutes / 60)
      }
    } catch (err) { log.error('finance:getOverview', err); throw err }
  })
}

/**
 * The renewal invoice already raised for a period, if any. Matching on the note
 * marker is what makes a repeated roll idempotent.
 */
async function findRenewalInvoice(prisma: any, clientId: string | null, marker: string) {
  if (!clientId || !marker) return false
  const count = await prisma.personalInvoice.count({
    where: { clientId, kind: 'retainer', notes: { contains: marker } }
  })
  return count > 0
}

/** Marker first, then a human-readable breakdown of what the fee covers. */
function renewalNote(plan: any): string {
  return [
    plan.noteMarker,
    `period ${dayKey(plan.window.periodStart)} -> ${dayKey(plan.window.periodEnd)}`,
    `periods ${plan.window.periodsDue} x ${round2(num(plan.periodAmount))}`
  ].join('\n')
}

async function nextSeq(prisma: any): Promise<number> {
  const count = await prisma.personalInvoice.count()
  return count + 1
}
