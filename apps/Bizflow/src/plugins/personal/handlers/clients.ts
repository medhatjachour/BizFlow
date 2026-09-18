// ─── Personal Work: Clients handler ──────────────────────────────────────────
// Clients plus the private working-style / red-flag notes and health metrics
// (payment behaviour, waiting days, realized revenue).
//
// IPC channels:
//   personal:clients:getAll / getById / create / update / delete / restore
//   personal:clients:getHealth
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { num, paginate, round2, daysBetween } from './utils'

const log = createLogger('Personal:Clients')

export function registerClientHandlers(prisma: any) {
  ipcMain.handle('personal:clients:getAll', async (_e, opts?: {
    search?: string; includeArchived?: boolean; page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = {}
      if (!opts?.includeArchived) where.isArchived = false
      if (opts?.search) {
        where.OR = [
          { name: { contains: opts.search } },
          { company: { contains: opts.search } },
          { email: { contains: opts.search } },
          { phone: { contains: opts.search } }
        ]
      }
      const [total, items] = await Promise.all([
        prisma.personalClient.count({ where }),
        prisma.personalClient.findMany({
          where,
          orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            _count: { select: { projects: true, invoices: true, retainers: true } }
          }
        })
      ])
      return paginate(items, total, page, pageSize)
    } catch (err) { log.error('clients:getAll', err); throw err }
  })

  ipcMain.handle('personal:clients:getById', async (_e, id: string) => {
    try {
      const client = await prisma.personalClient.findUnique({
        where: { id },
        include: {
          projects: {
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true, code: true, title: true, status: true, stage: true,
              currency: true, agreedAmount: true, dueDate: true, adjustedDueDate: true
            }
          },
          invoices: {
            orderBy: { issuedAt: 'desc' },
            take: 50,
            include: { payments: true }
          },
          retainers: { orderBy: { createdAt: 'desc' } },
          notes: { orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }] }
        }
      })
      if (!client) return null
      return { ...client, health: await clientHealth(prisma, id) }
    } catch (err) { log.error('clients:getById', err); throw err }
  })

  ipcMain.handle('personal:clients:create', async (_e, data: any) => {
    try {
      return await prisma.personalClient.create({
        data: {
          name: String(data?.name ?? '').trim(),
          company: data?.company || null,
          email: data?.email || null,
          phone: data?.phone || null,
          timezone: data?.timezone || null,
          currency: data?.currency || 'USD',
          defaultHourlyRate: data?.defaultHourlyRate === '' || data?.defaultHourlyRate == null ? null : num(data.defaultHourlyRate),
          defaultDepositPercent: num(data?.defaultDepositPercent, 50),
          paymentTermsDays: Math.round(num(data?.paymentTermsDays, 14)),
          workingStyleNotes: data?.workingStyleNotes || null,
          redFlags: data?.redFlags || null
        }
      })
    } catch (err) { log.error('clients:create', err); throw err }
  })

  ipcMain.handle('personal:clients:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('defaultHourlyRate' in patch) {
        patch.defaultHourlyRate = patch.defaultHourlyRate === '' || patch.defaultHourlyRate == null
          ? null
          : num(patch.defaultHourlyRate)
      }
      if ('defaultDepositPercent' in patch) patch.defaultDepositPercent = num(patch.defaultDepositPercent, 50)
      if ('paymentTermsDays' in patch) patch.paymentTermsDays = Math.round(num(patch.paymentTermsDays, 14))
      return await prisma.personalClient.update({ where: { id }, data: patch })
    } catch (err) { log.error('clients:update', err); throw err }
  })

  ipcMain.handle('personal:clients:delete', async (_e, id: string) => {
    try {
      // Archive rather than delete: projects, invoices and retainers keep their history.
      return await prisma.personalClient.update({ where: { id }, data: { isArchived: true } })
    } catch (err) { log.error('clients:delete', err); throw err }
  })

  ipcMain.handle('personal:clients:restore', async (_e, id: string) => {
    try {
      return await prisma.personalClient.update({ where: { id }, data: { isArchived: false } })
    } catch (err) { log.error('clients:restore', err); throw err }
  })

  ipcMain.handle('personal:clients:getHealth', async (_e, id: string) => {
    try {
      return await clientHealth(prisma, id)
    } catch (err) { log.error('clients:getHealth', err); throw err }
  })
}

/** Payment behaviour + waiting-day metrics for one client. */
async function clientHealth(prisma: any, clientId: string) {
  const [invoices, projects] = await Promise.all([
    prisma.personalInvoice.findMany({
      where: { clientId },
      include: { payments: true }
    }),
    prisma.personalProject.findMany({
      where: { clientId },
      select: { id: true, status: true, stage: true, agreedAmount: true, dueDate: true, adjustedDueDate: true }
    })
  ])

  const projectIds = projects.map((p: any) => p.id)
  const waits = projectIds.length
    ? await prisma.personalWaitLog.findMany({ where: { projectId: { in: projectIds } } })
    : []

  const now = Date.now()
  let billed = 0
  let collected = 0
  let overdue = 0
  const settlementDelays: number[] = []

  for (const inv of invoices) {
    billed += num(inv.amount)
    const paid = inv.payments
      .filter((p: any) => !p.refundedAt)
      .reduce((sum: number, p: any) => sum + num(p.amount), 0)
    collected += paid
    if (inv.status === 'void') continue
    if (inv.dueAt && new Date(inv.dueAt).getTime() < now && paid + 0.01 < num(inv.amount)) {
      overdue += num(inv.amount) - paid
    }
    const lastPayment = inv.payments
      .filter((p: any) => !p.refundedAt)
      .sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0]
    if (lastPayment && inv.issuedAt && paid + 0.01 >= num(inv.amount)) {
      settlementDelays.push(daysBetween(inv.issuedAt, lastPayment.paidAt))
    }
  }

  const waitingDays = waits.reduce((sum: number, w: any) => sum + num(w.days), 0)
  const openWaits = waits.filter((w: any) => !w.endedAt).length
  const avgPaymentDays = settlementDelays.length
    ? round2(settlementDelays.reduce((a, b) => a + b, 0) / settlementDelays.length)
    : 0

  return {
    billed: round2(billed),
    collected: round2(collected),
    outstanding: round2(billed - collected),
    overdue: round2(overdue),
    avgPaymentDays,
    waitingDays,
    openWaits,
    activeProjects: projects.filter((p: any) => p.status === 'active').length,
    deliveredProjects: projects.filter((p: any) => p.status === 'delivered' || p.status === 'closed').length,
    isSlowPayer: avgPaymentDays > 14,
    hasOpenWait: openWaits > 0
  }
}
