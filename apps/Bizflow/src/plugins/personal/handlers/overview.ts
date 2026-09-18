// ─── Personal Work: Overview dashboard ───────────────────────────────────────
// Aggregates every subsystem into the single payload the landing tab renders:
// Daily-3 board, live focus timer, capacity for the current week, next
// deadlines, open client waits, money position and proactive alerts.
//
// IPC channels:
//   personal:overview:getDashboard
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { addDays, dayKey, monthBounds, num, round2, startOfDay, weekBounds } from './utils'
import {
  auditSubscriptions,
  capacityReading,
  computeRateEngine,
  realHourlyRate,
  splitEscrow,
  type CapacityLevel
} from './domain'

const log = createLogger('Personal:Overview')
const DAILY_THREE_LIMIT = 3

export type OverviewAlert = {
  level: 'info' | 'warn' | 'danger'
  area: 'capacity' | 'money' | 'delivery' | 'client' | 'focus' | 'scope'
  message: string
  count: number
}

export function registerOverviewHandlers(prisma: any) {
  ipcMain.handle('personal:overview:getDashboard', async () => {
    try {
      const now = new Date()
      const today = startOfDay(now)
      const week = weekBounds(now)
      const month = monthBounds(now)

      const [
        rateProfile,
        clientCount,
        activeProjects,
        dailyThree,
        boardTasks,
        activeSession,
        todaySessions,
        weekSessions,
        projectDeadlines,
        openWaits,
        pendingRequests,
        invoices,
        subs,
        upcomingRenewalRows,
        blackouts,
        weekWorkloads,
        todayWorkLog,
        monthSessions,
        checklistPendingRows
      ] = await Promise.all([
        prisma.personalRateProfile.findUnique({ where: { id: 'default' } }),
        prisma.personalClient.count({ where: { isArchived: false } }),
        prisma.personalProject.findMany({ where: { status: 'active' } }),
        prisma.personalTask.findMany({
          where: { isDailyThree: true, status: { notIn: ['done', 'cancelled'] } },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
        }),
        prisma.personalTask.findMany({
          where: { status: { in: ['today', 'in_progress', 'blocked'] } },
          orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
          take: 40
        }),
        prisma.personalFocusSession.findFirst({ where: { endedAt: null }, orderBy: { startedAt: 'desc' } }),
        prisma.personalFocusSession.findMany({ where: { startedAt: { gte: today } } }),
        prisma.personalFocusSession.findMany({ where: { startedAt: { gte: week.start, lte: week.end } } }),
        prisma.personalProject.findMany({
          where: { status: 'active', adjustedDueDate: { not: null } },
          include: { client: { select: { id: true, name: true } } },
          orderBy: { adjustedDueDate: 'asc' },
          take: 8
        }),
        prisma.personalWaitLog.findMany({
          where: { endedAt: null },
          include: { project: { select: { id: true, code: true, title: true, clientId: true } } },
          orderBy: { startedAt: 'asc' }
        }),
        prisma.personalChangeRequest.findMany({
          where: { status: { in: ['draft', 'quoted', 'approved'] } },
          include: { project: { select: { id: true, code: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        prisma.personalInvoice.findMany({
          where: { status: { not: 'void' } },
          include: { payments: true, project: { select: { stage: true } } },
          orderBy: { issuedAt: 'desc' }
        }),
        prisma.personalSubscription.findMany({ where: { isActive: true } }),
        prisma.personalSubscription.findMany({
          where: { isActive: true, nextRenewalAt: { gte: now, lte: addDays(now, 14) } },
          orderBy: { nextRenewalAt: 'asc' }
        }),
        prisma.personalBlackout.findMany({ where: { endDate: { gte: now } }, orderBy: { startDate: 'asc' } }),
        prisma.personalWorkload.findMany({ where: { day: { gte: week.start, lte: week.end } } }),
        prisma.personalWorkLog.findUnique({ where: { day: today } }),
        prisma.personalFocusSession.findMany({
          where: { startedAt: { gte: month.start, lte: month.end }, endedAt: { not: null }, billable: true }
        }),
        prisma.personalChecklistItem.findMany({
          where: { isDone: false, isBlocking: true },
          select: { projectId: true }
        })
      ])

      // ── Money position ─────────────────────────────────────────────────────
      const escrow = splitEscrow(
        invoices.map((inv: any) => ({
          id: inv.id,
          number: inv.number,
          kind: inv.kind,
          amount: num(inv.amount),
          status: inv.status,
          projectStage: inv.project?.stage
        })),
        invoices.flatMap((inv: any) =>
          inv.payments.filter((p: any) => !p.refundedAt).map((p: any) => ({ invoiceId: inv.id, amount: num(p.amount), isDeposit: p.isDeposit }))
        )
      )

      const monthCollected = invoices
        .flatMap((inv: any) => inv.payments)
        .filter((p: any) => !p.refundedAt && new Date(p.paidAt) >= month.start && new Date(p.paidAt) <= month.end)
        .reduce((sum: number, p: any) => sum + num(p.amount), 0)

      const overdueInvoices = invoices
        .filter((inv: any) => ['sent', 'partial'].includes(inv.status) && inv.dueAt && new Date(inv.dueAt) < now)
        .map((inv: any) => ({
          id: inv.id,
          number: inv.number,
          clientId: inv.clientId,
          dueAt: inv.dueAt,
          daysOverdue: Math.floor((now.getTime() - new Date(inv.dueAt).getTime()) / 86_400_000),
          outstanding: round2(
            num(inv.amount) -
              inv.payments.filter((p: any) => !p.refundedAt).reduce((s: number, p: any) => s + num(p.amount), 0)
          )
        }))
        .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)

      const outstanding = invoices
        .filter((inv: any) => ['sent', 'partial', 'overdue'].includes(inv.status))
        .reduce((sum: number, inv: any) => {
          const paid = inv.payments.filter((p: any) => !p.refundedAt).reduce((s: number, p: any) => s + num(p.amount), 0)
          return sum + Math.max(0, num(inv.amount) - paid)
        }, 0)

      const taxVault = await prisma.personalTaxVaultEntry.findMany({ where: { releasedAt: null } })
      const taxReserved = taxVault.reduce((sum: number, e: any) => sum + num(e.amount), 0)

      const taxReservePercent = num(rateProfile?.taxReservePercent, 25)
      const engine = computeRateEngine(rateProfile ?? {})

      // ── Capacity for the current week ──────────────────────────────────────
      const dailyCapacityMinutes = (num(rateProfile?.weeklyCapacityHours, 40) / 5) * 60
      const weekPlanned = weekWorkloads.reduce((sum: number, w: any) => sum + num(w.plannedMinutes), 0)
      const weekActual = weekWorkloads.reduce((sum: number, w: any) => sum + num(w.actualMinutes), 0)
      const weekCapacityMinutes = num(rateProfile?.weeklyCapacityHours, 40) * 60
      const weekReading = capacityReading(weekPlanned, weekCapacityMinutes)

      const workloadByDay: Record<string, number> = {}
      for (const w of weekWorkloads) {
        const key = dayKey(w.day)
        workloadByDay[key] = (workloadByDay[key] ?? 0) + num(w.plannedMinutes)
      }

      const capacityDays: Array<{
        day: string
        plannedMinutes: number
        availableMinutes: number
        level: CapacityLevel
        usedPercent: number
        isBlackout: boolean
      }> = []
      for (let i = 0; i < 7; i += 1) {
        const day = addDays(week.start, i)
        const key = dayKey(day)
        const blackout = blackouts.find(
          (b: any) => day >= startOfDay(b.startDate) && day <= new Date(new Date(b.endDate).setHours(23, 59, 59, 999))
        )
        const available = blackout ? 0 : dailyCapacityMinutes
        const reading = capacityReading(workloadByDay[key] ?? 0, available)
        capacityDays.push({
          day: key,
          plannedMinutes: reading.plannedMinutes,
          availableMinutes: reading.availableMinutes,
          level: reading.level,
          usedPercent: reading.usedPercent,
          isBlackout: Boolean(blackout)
        })
      }

      // ── Focus time ─────────────────────────────────────────────────────────
      const todayMinutes = todaySessions.reduce(
        (sum: number, s: any) =>
          sum + (s.endedAt ? num(s.actualMinutes) : Math.floor((now.getTime() - new Date(s.startedAt).getTime()) / 60_000)),
        0
      )
      const todayBillableMinutes = todaySessions
        .filter((s: any) => s.billable)
        .reduce(
          (sum: number, s: any) =>
            sum + (s.endedAt ? num(s.actualMinutes) : Math.floor((now.getTime() - new Date(s.startedAt).getTime()) / 60_000)),
          0
        )
      const weekMinutes = weekSessions
        .filter((s: any) => s.endedAt && s.kind !== 'break')
        .reduce((sum: number, s: any) => sum + num(s.actualMinutes), 0)
      const dailyTargetMinutes = (num(rateProfile?.targetBillableHoursPerWeek, 25) / 5) * 60

      let runningTimer: {
        id: string
        kind: string
        projectId: string | null
        taskId: string | null
        startedAt: Date
        plannedMinutes: number
        elapsedMinutes: number
        remainingMinutes: number
      } | null = null
      if (activeSession) {
        const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(activeSession.startedAt).getTime()) / 60_000))
        runningTimer = {
          id: activeSession.id,
          kind: activeSession.kind,
          projectId: activeSession.projectId ?? null,
          taskId: activeSession.taskId ?? null,
          startedAt: activeSession.startedAt,
          plannedMinutes: num(activeSession.plannedMinutes),
          elapsedMinutes: elapsed,
          remainingMinutes: Math.max(0, num(activeSession.plannedMinutes) - elapsed)
        }
      }

      // ── Subscriptions ──────────────────────────────────────────────────────
      const subAudit = auditSubscriptions(
        subs.map((s: any) => ({
          id: s.id,
          name: s.name,
          amount: num(s.amount),
          billingCycle: s.billingCycle,
          isActive: s.isActive,
          isEssential: s.isEssential,
          usageLevel: s.usageLevel
        }))
      )

      // ── Real hourly rate this month (collected ÷ real tracked hours) ───────
      const monthMinutes = monthSessions.reduce((sum: number, s: any) => sum + num(s.actualMinutes), 0)
      const realRate = realHourlyRate(monthCollected, monthMinutes, engine.baselineHourlyRate)

      // ── Deadlines ──────────────────────────────────────────────────────────
      const deadlines = projectDeadlines.map((p: any) => {
        const due = new Date(p.adjustedDueDate)
        const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
        return {
          id: p.id,
          code: p.code,
          title: p.title,
          clientName: p.client?.name ?? null,
          stage: p.stage,
          dueAt: p.adjustedDueDate,
          originalDueAt: p.dueDate,
          daysLeft,
          isOverdue: daysLeft < 0,
          checklistPending: 0
        }
      })

      const pendingByProject = new Map<string, number>()
      for (const row of checklistPendingRows as Array<{ projectId: string }>) {
        pendingByProject.set(row.projectId, (pendingByProject.get(row.projectId) ?? 0) + 1)
      }
      for (const d of deadlines) d.checklistPending = pendingByProject.get(d.id) ?? 0

      // ── Client waits ───────────────────────────────────────────────────────
      const waits = openWaits.map((w: any) => ({
        id: w.id,
        projectId: w.projectId,
        projectCode: w.project?.code ?? null,
        projectTitle: w.project?.title ?? null,
        reason: w.reason,
        startedAt: w.startedAt,
        days: Math.max(0, Math.floor((now.getTime() - new Date(w.startedAt).getTime()) / 86_400_000)),
        shiftDeadline: w.shiftDeadline
      }))
      const totalWaitingDays = waits.reduce((sum: number, w: any) => sum + w.days, 0)

      // ── Alerts ─────────────────────────────────────────────────────────────
      const alerts: OverviewAlert[] = []
      if (weekReading.level !== 'clear') {
        alerts.push({
          level: weekReading.level === 'red' ? 'danger' : 'warn',
          area: 'capacity',
          message:
            weekReading.level === 'red'
              ? `Week overbooked by ${round2(weekReading.overbookedMinutes / 60)}h — move or decline work.`
              : `Week at ${weekReading.usedPercent}% of capacity.`,
          count: 1
        })
      }
      if (overdueInvoices.length) {
        alerts.push({
          level: 'danger',
          area: 'money',
          message: `${overdueInvoices.length} overdue invoice(s) worth ${round2(overdueInvoices.reduce((s: number, i: any) => s + i.outstanding, 0))}.`,
          count: overdueInvoices.length
        })
      }
      if (waits.length) {
        alerts.push({
          level: totalWaitingDays >= 7 ? 'danger' : 'warn',
          area: 'client',
          message: `${waits.length} client wait(s) open — ${totalWaitingDays} day(s) of blocked time to bill back.`,
          count: waits.length
        })
      }
      const dueSoon = deadlines.filter((d: any) => !d.isOverdue && d.daysLeft <= 3).length
      if (dueSoon) {
        alerts.push({ level: 'warn', area: 'delivery', message: `${dueSoon} project(s) due within 3 days.`, count: dueSoon })
      }
      const overdueDeadlines = deadlines.filter((d: any) => d.isOverdue).length
      if (overdueDeadlines) {
        alerts.push({ level: 'danger', area: 'delivery', message: `${overdueDeadlines} project(s) past the delivery date.`, count: overdueDeadlines })
      }
      if (pendingRequests.length) {
        alerts.push({
          level: 'info',
          area: 'scope',
          message: `${pendingRequests.length} change request(s) awaiting a client decision.`,
          count: pendingRequests.length
        })
      }
      if (subAudit.cancelCandidates.length) {
        alerts.push({
          level: 'info',
          area: 'money',
          message: `${subAudit.cancelCandidates.length} subscription(s) flagged review/cancel.`,
          count: subAudit.cancelCandidates.length
        })
      }

      const recordedToday = todayMinutes > 0
      const focusRemaining = recordedToday ? Math.max(0, Math.floor(dailyTargetMinutes - todayMinutes)) : Math.floor(dailyTargetMinutes)

      return {
        generatedAt: now,
        today: dayKey(now),
        limits: { dailyThree: DAILY_THREE_LIMIT },
        clients: { active: clientCount },
        projects: {
          active: activeProjects.length,
          byStage: activeProjects.reduce((acc: Record<string, number>, p: any) => {
            acc[p.stage] = (acc[p.stage] ?? 0) + 1
            return acc
          }, {}),
          totalAgreed: round2(activeProjects.reduce((sum: number, p: any) => sum + num(p.agreedAmount), 0)),
          totalEstimatedHours: round2(activeProjects.reduce((sum: number, p: any) => sum + num(p.estimatedHours), 0))
        },
        dailyThree: {
          items: dailyThree.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            type: t.type,
            priority: t.priority,
            estimateMinutes: num(t.estimateMinutes),
            dueDate: t.dueDate,
            projectId: t.projectId,
            clientId: t.clientId
          })),
          slotsFree: DAILY_THREE_LIMIT - dailyThree.length,
          suggestions: boardTasks
            .filter((t: any) => !t.isDailyThree)
            .slice(0, DAILY_THREE_LIMIT)
            .map((t: any) => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate }))
        },
        focus: {
          timer: runningTimer,
          todayMinutes,
          todayBillableMinutes,
          weekMinutes,
          dailyTargetMinutes,
          dailyTargetRemaining: focusRemaining,
          workLog: todayWorkLog
            ? {
                id: todayWorkLog.id,
                summary: todayWorkLog.summary,
                focusMinutes: num(todayWorkLog.focusMinutes),
                billableMinutes: num(todayWorkLog.billableMinutes),
                mood: todayWorkLog.mood
              }
            : null
        },
        capacity: {
          week: {
            start: week.start,
            end: week.end,
            plannedMinutes: weekReading.plannedMinutes,
            availableMinutes: weekReading.availableMinutes,
            usedPercent: weekReading.usedPercent,
            level: weekReading.level
          },
          minutesByDay: workloadByDay,
          days: capacityDays,
          actualMinutes: weekActual,
          upcomingBlackouts: blackouts.map((b: any) => ({
            id: b.id,
            title: b.title,
            kind: b.kind,
            startDate: b.startDate,
            endDate: b.endDate,
            blocksDelivery: b.blocksDelivery
          }))
        },
        deadlines,
        waiting: { open: waits, totalWaitingDays },
        changeRequests: {
          pending: pendingRequests.map((r: any) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            extraCost: num(r.extraCost),
            extraDays: num(r.extraDays),
            projectCode: r.project?.code ?? null,
            projectTitle: r.project?.title ?? null
          })),
          pipelineValue: round2(pendingRequests.reduce((sum: number, r: any) => sum + num(r.extraCost), 0))
        },
        money: {
          currency: rateProfile?.currency ?? 'USD',
          outstanding: round2(outstanding),
          overdue: overdueInvoices,
          monthCollected: round2(monthCollected),
          cashReceived: escrow.cashReceived,
          realizedIncome: escrow.realizedIncome,
          unearnedRetainedCash: escrow.unearnedRetainedCash,
          taxReserved: round2(taxReserved),
          taxReservePercent,
          taxToReserveThisMonth: round2(monthCollected * (taxReservePercent / 100)),
          subscriptions: {
            monthlyBurn: subAudit.monthlyBurn,
            annualBurn: subAudit.annualBurn,
            cancelCandidates: subAudit.cancelCandidates,
            upcomingRenewals: upcomingRenewalRows.map((s: any) => ({
              id: s.id,
              name: s.name,
              amount: num(s.amount),
              currency: s.currency,
              billingCycle: s.billingCycle,
              nextRenewalAt: s.nextRenewalAt,
              autoRenew: s.autoRenew
            }))
          },
          realHourlyRate: realRate
        },
        alerts
      }
    } catch (err) { log.error('overview:getDashboard', err); throw err }
  })
}
