// ─── Personal Work: Metadata, configuration & navigation counters ────────────
// One call per concern so the renderer can render selects and badges without
// duplicating the taxonomy that lives with the handlers.
//
// IPC channels:
//   personal:meta:getConfig / seedChecklists / getCounts
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { num, parseJsonArray } from './utils'
import { PIPELINE_STAGES } from './domain'
import {
  BILLING_CYCLES,
  BLACKOUT_KINDS,
  CHANGE_REQUEST_STATUSES,
  DEFAULT_CHECKLIST_TEMPLATES,
  EXPENSE_CATEGORIES,
  FOCUS_KINDS,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  NOTE_KINDS,
  PRICING_TYPES,
  PROFESSIONS,
  PROJECT_STATUSES,
  SCRIPT_CATEGORIES,
  SUBSCRIPTION_CATEGORIES,
  TASK_STATUSES,
  TASK_TYPES,
  USAGE_LEVELS,
  WAIT_REASONS
} from './templates'

const log = createLogger('Personal:Meta')

export function registerMetaHandlers(prisma: any) {
  ipcMain.handle('personal:meta:getConfig', async () => {
    try {
      const [templates, clientCount, projectCount] = await Promise.all([
        prisma.personalChecklistTemplate.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] }),
        prisma.personalClient.count({ where: { isArchived: false } }),
        prisma.personalProject.count()
      ])

      return {
        stages: PIPELINE_STAGES,
        statuses: PROJECT_STATUSES,
        pricingTypes: PRICING_TYPES,
        taskStatuses: TASK_STATUSES,
        taskTypes: TASK_TYPES,
        waitReasons: WAIT_REASONS,
        changeRequestStatuses: CHANGE_REQUEST_STATUSES,
        invoiceKinds: INVOICE_KINDS,
        invoiceStatuses: INVOICE_STATUSES,
        expenseCategories: EXPENSE_CATEGORIES,
        subscriptionCategories: SUBSCRIPTION_CATEGORIES,
        billingCycles: BILLING_CYCLES,
        usageLevels: USAGE_LEVELS,
        blackoutKinds: BLACKOUT_KINDS,
        focusKinds: FOCUS_KINDS,
        noteKinds: NOTE_KINDS,
        scriptCategories: SCRIPT_CATEGORIES,
        professions: PROFESSIONS,
        checklistTemplates: templates.map((t: any) => ({
          ...t,
          items: parseJsonArray<string>(t.itemsJson)
        })),
        counts: { clients: clientCount, projects: projectCount }
      }
    } catch (err) { log.error('meta:getConfig', err); throw err }
  })

  /** Idempotent seed of the six shipped pre-flight checklists. */
  ipcMain.handle('personal:meta:seedChecklists', async (_e, opts?: { force?: boolean }) => {
    try {
      const existing = await prisma.personalChecklistTemplate.findMany({ select: { name: true } })
      const known = new Set(existing.map((t: any) => t.name))
      let created = 0
      for (const template of DEFAULT_CHECKLIST_TEMPLATES) {
        if (!opts?.force && known.has(template.name)) continue
        await prisma.personalChecklistTemplate.create({
          data: {
            name: template.name,
            profession: template.profession,
            isDefault: template.isDefault,
            itemsJson: JSON.stringify(template.items)
          }
        })
        created += 1
      }
      const total = await prisma.personalChecklistTemplate.count()
      return { created, total }
    } catch (err) { log.error('meta:seedChecklists', err); throw err }
  })

  /** Badge counters for the tab bar and command palette. */
  ipcMain.handle('personal:meta:getCounts', async () => {
    try {
      const now = new Date()
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0))
      const todayEnd = new Date(new Date().setHours(23, 59, 59, 999))
      const inSevenDays = new Date(Date.now() + 7 * 86_400_000)

      const [
        openTasks, dueTodayTasks, overdueTasks, dailyThree,
        activeProjects, overdueInvoices, openWaits, pendingRequests,
        runningSession, upcomingRenewals, blackoutsUpcoming
      ] = await Promise.all([
        prisma.personalTask.count({ where: { status: { notIn: ['done', 'cancelled'] } } }),
        prisma.personalTask.count({
          where: { status: { notIn: ['done', 'cancelled'] }, dueDate: { gte: todayStart, lte: todayEnd } }
        }),
        prisma.personalTask.count({
          where: { status: { notIn: ['done', 'cancelled'] }, dueDate: { lt: todayStart } }
        }),
        prisma.personalTask.count({ where: { isDailyThree: true, status: { notIn: ['done', 'cancelled'] } } }),
        prisma.personalProject.count({ where: { status: 'active' } }),
        prisma.personalInvoice.count({
          where: { status: { in: ['sent', 'partial', 'overdue'] }, dueAt: { lt: now } }
        }),
        prisma.personalWaitLog.count({ where: { endedAt: null } }),
        prisma.personalChangeRequest.count({ where: { status: { in: ['draft', 'quoted'] } } }),
        prisma.personalFocusSession.findFirst({ where: { endedAt: null } }),
        prisma.personalSubscription.count({ where: { isActive: true, nextRenewalAt: { lte: inSevenDays } } }),
        prisma.personalBlackout.count({ where: { endDate: { gte: now } } })
      ])

      const pendingPayments = await prisma.personalInvoice.findMany({
        where: { status: { in: ['sent', 'partial', 'overdue'] } },
        include: { payments: true }
      })
      const collectable = pendingPayments.reduce((sum: number, inv: any) => {
        const paid = inv.payments.filter((p: any) => !p.refundedAt).reduce((s: number, p: any) => s + num(p.amount), 0)
        return sum + Math.max(0, num(inv.amount) - paid)
      }, 0)

      return {
        tasks: { open: openTasks, dueToday: dueTodayTasks, overdue: overdueTasks, dailyThree },
        projects: { active: activeProjects },
        invoices: { overdue: overdueInvoices, collectable: Math.round(collectable * 100) / 100 },
        waits: { open: openWaits },
        changeRequests: { pending: pendingRequests },
        focus: { running: Boolean(runningSession), runningSince: runningSession?.startedAt ?? null },
        subscriptions: { renewingThisWeek: upcomingRenewals },
        blackouts: { upcoming: blackoutsUpcoming }
      }
    } catch (err) { log.error('meta:getCounts', err); throw err }
  })
}
