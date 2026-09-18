// ─── Personal Work: Deep-work timer, daily log & auto-standup ────────────────
// Focus sessions bind tracked time to a project/milestone, feed the workload
// heatmap, and every evening roll up into a one-paragraph client update.
//
// IPC channels:
//   personal:focus:getActive / start / stop / cancel / getSessions / addManual
//   personal:focus:update / delete / getStats
//   personal:worklog:getAll / getByDay / save / generate / delete
//   personal:standup:preview
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { dayKey, daysBetween, num, paginate, round2, startOfDay, toDate } from './utils'
import { buildStandupSummary, realHourlyRate } from './domain'

const log = createLogger('Personal:Focus')

const SESSION_INCLUDE = {
  project: { select: { id: true, code: true, title: true, currency: true, clientId: true } }
}

export function registerFocusHandlers(prisma: any) {
  // ── Timer ────────────────────────────────────────────────────────────────
  ipcMain.handle('personal:focus:getActive', async () => {
    try {
      const session = await prisma.personalFocusSession.findFirst({
        where: { endedAt: null },
        include: SESSION_INCLUDE,
        orderBy: { startedAt: 'desc' }
      })
      if (!session) return null
      const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60_000))
      return {
        ...session,
        elapsedMinutes,
        remainingMinutes: Math.max(0, num(session.plannedMinutes) - elapsedMinutes),
        overrunMinutes: Math.max(0, elapsedMinutes - num(session.plannedMinutes))
      }
    } catch (err) { log.error('focus:getActive', err); throw err }
  })

  ipcMain.handle('personal:focus:start', async (_e, data: any) => {
    try {
      // A timer can only run once — close any stale running session first.
      const running = await prisma.personalFocusSession.findFirst({ where: { endedAt: null } })
      if (running) throw new Error('A focus session is already running')

      return await prisma.personalFocusSession.create({
        data: {
          projectId: data?.projectId || null,
          clientId: data?.clientId || null,
          taskId: data?.taskId || null,
          kind: data?.kind || 'flow',
          startedAt: new Date(),
          plannedMinutes: Math.round(num(data?.plannedMinutes, 50)),
          billable: data?.billable ?? true,
          note: data?.note || null
        },
        include: SESSION_INCLUDE
      })
    } catch (err) { log.error('focus:start', err); throw err }
  })

  ipcMain.handle('personal:focus:stop', async (_e, data?: {
    id?: string; actualMinutes?: number; interruptions?: number; note?: string; billable?: boolean
  }) => {
    try {
      const session = data?.id
        ? await prisma.personalFocusSession.findUnique({ where: { id: data.id } })
        : await prisma.personalFocusSession.findFirst({ where: { endedAt: null }, orderBy: { startedAt: 'desc' } })
      if (!session) throw new Error('No running focus session')
      if (session.endedAt) return { ok: true, alreadyStopped: true, session }

      const endedAt = new Date()
      const elapsed = Math.max(1, Math.round((endedAt.getTime() - new Date(session.startedAt).getTime()) / 60_000))
      const actualMinutes = data?.actualMinutes === undefined ? elapsed : Math.max(0, Math.round(num(data.actualMinutes)))

      const updated = await prisma.personalFocusSession.update({
        where: { id: session.id },
        data: {
          endedAt,
          actualMinutes,
          interruptions: data?.interruptions === undefined ? session.interruptions : Math.round(num(data.interruptions)),
          billable: data?.billable ?? session.billable,
          note: data?.note ?? session.note
        },
        include: SESSION_INCLUDE
      })

      if (session.projectId) {
        await upsertWorkload(prisma, session.projectId, endedAt, actualMinutes)
      }
      return { ok: true, session: updated, actualMinutes }
    } catch (err) { log.error('focus:stop', err); throw err }
  })

  ipcMain.handle('personal:focus:cancel', async (_e, id?: string) => {
    try {
      const session = id
        ? await prisma.personalFocusSession.findUnique({ where: { id } })
        : await prisma.personalFocusSession.findFirst({ where: { endedAt: null } })
      if (!session) return { ok: true, deleted: 0 }
      await prisma.personalFocusSession.delete({ where: { id: session.id } })
      return { ok: true, deleted: 1 }
    } catch (err) { log.error('focus:cancel', err); throw err }
  })

  // ── Sessions ─────────────────────────────────────────────────────────────
  ipcMain.handle('personal:focus:getSessions', async (_e, opts?: {
    projectId?: string; taskId?: string; from?: string; to?: string
    billable?: boolean; page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 100
      const where: any = {}
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.taskId) where.taskId = opts.taskId
      if (opts?.billable !== undefined) where.billable = opts.billable
      if (opts?.from || opts?.to) {
        where.startedAt = {}
        if (opts?.from) where.startedAt.gte = startOfDay(opts.from)
        if (opts?.to) where.startedAt.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      const [total, items] = await Promise.all([
        prisma.personalFocusSession.count({ where }),
        prisma.personalFocusSession.findMany({
          where,
          include: SESSION_INCLUDE,
          orderBy: { startedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      return paginate(items, total, page, pageSize)
    } catch (err) { log.error('focus:getSessions', err); throw err }
  })

  ipcMain.handle('personal:focus:addManual', async (_e, data: any) => {
    try {
      const minutes = Math.max(0, Math.round(num(data?.minutes)))
      const startedAt = toDate(data?.startedAt) ?? new Date()
      const endedAt = new Date(startedAt.getTime() + minutes * 60_000)
      const session = await prisma.personalFocusSession.create({
        data: {
          projectId: data?.projectId || null,
          clientId: data?.clientId || null,
          taskId: data?.taskId || null,
          kind: data?.kind || 'manual',
          startedAt,
          endedAt,
          plannedMinutes: minutes,
          actualMinutes: minutes,
          billable: data?.billable ?? true,
          note: data?.note || null
        },
        include: SESSION_INCLUDE
      })
      if (session.projectId) await upsertWorkload(prisma, session.projectId, endedAt, minutes)
      return session
    } catch (err) { log.error('focus:addManual', err); throw err }
  })

  ipcMain.handle('personal:focus:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('startedAt' in patch) patch.startedAt = toDate(patch.startedAt)
      if ('endedAt' in patch) patch.endedAt = toDate(patch.endedAt)
      if ('actualMinutes' in patch) patch.actualMinutes = Math.max(0, Math.round(num(patch.actualMinutes)))
      if ('plannedMinutes' in patch) patch.plannedMinutes = Math.max(0, Math.round(num(patch.plannedMinutes)))
      return await prisma.personalFocusSession.update({ where: { id }, data: patch, include: SESSION_INCLUDE })
    } catch (err) { log.error('focus:update', err); throw err }
  })

  ipcMain.handle('personal:focus:delete', async (_e, id: string) => {
    try {
      const session = await prisma.personalFocusSession.findUnique({ where: { id } })
      if (session?.projectId && session.actualMinutes) {
        await upsertWorkload(prisma, session.projectId, session.startedAt, -num(session.actualMinutes))
      }
      return await prisma.personalFocusSession.delete({ where: { id } })
    } catch (err) { log.error('focus:delete', err); throw err }
  })

  /** Tracked time analytics: per-day, per-project, and rate reality check. */
  ipcMain.handle('personal:focus:getStats', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const from = startOfDay(opts?.from ?? new Date(Date.now() - 29 * 86_400_000))
      const to = new Date(new Date(opts?.to ?? new Date()).setHours(23, 59, 59, 999))

      const sessions = await prisma.personalFocusSession.findMany({
        where: { startedAt: { gte: from, lte: to }, endedAt: { not: null } },
        include: SESSION_INCLUDE,
        orderBy: { startedAt: 'asc' }
      })
      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })

      const byDay: Record<string, { day: string; minutes: number; billableMinutes: number; sessions: number }> = {}
      const byProject: Record<string, {
        projectId: string; projectCode: string | null; projectTitle: string; minutes: number
        billableMinutes: number; sessions: number
      }> = {}

      let totalMinutes = 0
      let billableMinutes = 0
      let interruptions = 0
      let longest = 0

      for (const s of sessions) {
        const minutes = num(s.actualMinutes)
        totalMinutes += minutes
        if (s.billable) billableMinutes += minutes
        interruptions += num(s.interruptions)
        longest = Math.max(longest, minutes)

        const key = dayKey(s.startedAt)
        const dayRow = byDay[key] ?? { day: key, minutes: 0, billableMinutes: 0, sessions: 0 }
        dayRow.minutes += minutes
        if (s.billable) dayRow.billableMinutes += minutes
        dayRow.sessions += 1
        byDay[key] = dayRow

        const projectKey = s.projectId ?? 'unassigned'
        const projectRow = byProject[projectKey] ?? {
          projectId: projectKey,
          projectCode: s.project?.code ?? null,
          projectTitle: s.project?.title ?? 'Unassigned',
          minutes: 0,
          billableMinutes: 0,
          sessions: 0
        }
        projectRow.minutes += minutes
        if (s.billable) projectRow.billableMinutes += minutes
        projectRow.sessions += 1
        byProject[projectKey] = projectRow
      }

      const spanDays = Math.max(1, daysBetween(from, to) + 1)
      const weeks = Math.max(1, spanDays / 7)
      const weeklyAverageHours = round2(totalMinutes / 60 / weeks)
      const capacityHours = num(profile?.weeklyCapacityHours, 40)

      return {
        range: { from, to, days: spanDays },
        totalMinutes,
        totalHours: round2(totalMinutes / 60),
        billableMinutes,
        billableHours: round2(billableMinutes / 60),
        billablePercent: totalMinutes > 0 ? round2((billableMinutes / totalMinutes) * 100) : 0,
        sessionCount: sessions.length,
        averageSessionMinutes: sessions.length ? round2(totalMinutes / sessions.length) : 0,
        longestSessionMinutes: longest,
        interruptions,
        weeklyAverageHours,
        capacityHours,
        capacityUsedPercent: capacityHours > 0 ? round2((weeklyAverageHours / capacityHours) * 100) : 0,
        days: Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)),
        projects: Object.values(byProject).sort((a, b) => b.minutes - a.minutes)
      }
    } catch (err) { log.error('focus:getStats', err); throw err }
  })

  // ── Daily work log ───────────────────────────────────────────────────────
  ipcMain.handle('personal:worklog:getAll', async (_e, opts?: { from?: string; to?: string; limit?: number }) => {
    try {
      const where: any = {}
      if (opts?.from || opts?.to) {
        where.day = {}
        if (opts?.from) where.day.gte = startOfDay(opts.from)
        if (opts?.to) where.day.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      return await prisma.personalWorkLog.findMany({
        where,
        orderBy: { day: 'desc' },
        take: opts?.limit ?? 60
      })
    } catch (err) { log.error('worklog:getAll', err); throw err }
  })

  ipcMain.handle('personal:worklog:getByDay', async (_e, day?: string) => {
    try {
      const bucket = startOfDay(day ?? new Date())
      return await prisma.personalWorkLog.findUnique({ where: { day: bucket } })
    } catch (err) { log.error('worklog:getByDay', err); throw err }
  })

  ipcMain.handle('personal:worklog:save', async (_e, data: any) => {
    try {
      const bucket = startOfDay(data?.day ?? new Date())
      const payload = {
        completedJson: JSON.stringify(Array.isArray(data?.completed) ? data.completed : []),
        nextJson: JSON.stringify(Array.isArray(data?.next) ? data.next : []),
        summary: data?.summary || null,
        notes: data?.notes || null,
        mood: data?.mood || null
      }
      return await prisma.personalWorkLog.upsert({
        where: { day: bucket },
        create: { day: bucket, ...payload },
        update: payload
      })
    } catch (err) { log.error('worklog:save', err); throw err }
  })

  /** Builds today's log from finished tasks + tracked time, then saves it. */
  ipcMain.handle('personal:worklog:generate', async (_e, day?: string) => {
    try {
      const generated = await generateStandup(prisma, day)
      const saved = await prisma.personalWorkLog.upsert({
        where: { day: startOfDay(generated.day) },
        create: {
          day: startOfDay(generated.day),
          completedJson: JSON.stringify(generated.completed),
          nextJson: JSON.stringify(generated.next),
          summary: generated.summary,
          focusMinutes: generated.focusMinutes,
          billableMinutes: generated.billableMinutes
        },
        update: {
          completedJson: JSON.stringify(generated.completed),
          nextJson: JSON.stringify(generated.next),
          summary: generated.summary,
          focusMinutes: generated.focusMinutes,
          billableMinutes: generated.billableMinutes
        }
      })
      return { ...generated, log: saved }
    } catch (err) { log.error('worklog:generate', err); throw err }
  })

  ipcMain.handle('personal:worklog:delete', async (_e, id: string) => {
    try {
      return await prisma.personalWorkLog.delete({ where: { id } })
    } catch (err) { log.error('worklog:delete', err); throw err }
  })

  /** Preview the client-facing paragraph without persisting anything. */
  ipcMain.handle('personal:standup:preview', async (_e, day?: string) => {
    try {
      const generated = await generateStandup(prisma, day)
      return generated
    } catch (err) { log.error('standup:preview', err); throw err }
  })

  /** Effective hourly rate per project — who is actually profitable. */
  ipcMain.handle('personal:focus:getProjectProfitability', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const profile = await prisma.personalRateProfile.findUnique({ where: { id: 'default' } })
      const sessionWhere: any = { endedAt: { not: null } }
      if (opts?.from || opts?.to) {
        sessionWhere.startedAt = {}
        if (opts?.from) sessionWhere.startedAt.gte = startOfDay(opts.from)
        if (opts?.to) sessionWhere.startedAt.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      const sessions = await prisma.personalFocusSession.findMany({
        where: sessionWhere,
        include: { project: { select: { id: true, code: true, title: true } } }
      })
      const minutesByProject = new Map<string, number>()
      for (const s of sessions) {
        if (!s.projectId) continue
        minutesByProject.set(s.projectId, (minutesByProject.get(s.projectId) ?? 0) + num(s.actualMinutes))
      }

      const projects = await prisma.personalProject.findMany({
        include: {
          client: { select: { id: true, name: true } },
          invoices: { include: { payments: true } }
        }
      })

      const rows = projects.map((project: any) => {
        const paid = project.invoices
          .flatMap((inv: any) => inv.payments)
          .filter((p: any) => !p.refundedAt)
          .reduce((sum: number, p: any) => sum + num(p.amount), 0)
        const minutes = minutesByProject.get(project.id) ?? 0
        const result = realHourlyRate(paid, minutes, num(profile?.baselineHourlyRate))
        return {
          projectId: project.id,
          code: project.code,
          title: project.title,
          clientName: project.client?.name ?? '—',
          currency: project.currency,
          moneyReceived: result.moneyReceived,
          realHours: result.realHours,
          realHourlyRate: result.realHourlyRate,
          vsBaselinePercent: result.effectiveHourlyRateVsBaseline,
          verdict: result.verdict
        }
      })
      return rows
        .filter((r: any) => r.moneyReceived > 0 || r.realHours > 0)
        .sort((a: any, b: any) => a.realHourlyRate - b.realHourlyRate)
    } catch (err) { log.error('focus:getProjectProfitability', err); throw err }
  })
}

const TASK_INCLUDE_LITE = {
  project: { select: { id: true, code: true, title: true } }
}

async function upsertWorkload(prisma: any, projectId: string, day: Date, deltaMinutes: number) {
  const bucket = startOfDay(day)
  const existing = await prisma.personalWorkload.findFirst({ where: { projectId, day: bucket } })
  if (existing) {
    return await prisma.personalWorkload.update({
      where: { id: existing.id },
      data: { actualMinutes: Math.max(0, num(existing.actualMinutes) + deltaMinutes) }
    })
  }
  return await prisma.personalWorkload.create({
    data: { projectId, day: bucket, plannedMinutes: 0, actualMinutes: Math.max(0, deltaMinutes) }
  })
}

async function generateStandup(prisma: any, day?: string) {
  const bucket = startOfDay(day ?? new Date())
  const endOfDay = new Date(bucket)
  endOfDay.setHours(23, 59, 59, 999)

  const [completedTasks, nextTasks, sessions] = await Promise.all([
    prisma.personalTask.findMany({
      where: { completedAt: { gte: bucket, lte: endOfDay } },
      include: TASK_INCLUDE_LITE,
      orderBy: { completedAt: 'asc' }
    }),
    prisma.personalTask.findMany({
      where: { isDailyThree: true, status: { notIn: ['done', 'cancelled'] } },
      orderBy: { priority: 'asc' }
    }),
    prisma.personalFocusSession.findMany({
      where: { startedAt: { gte: bucket, lte: endOfDay }, endedAt: { not: null } },
      include: SESSION_INCLUDE
    })
  ])

  const focusMinutes = sessions.reduce((sum: number, s: any) => sum + num(s.actualMinutes), 0)
  const billableMinutes = sessions
    .filter((s: any) => s.billable)
    .reduce((sum: number, s: any) => sum + num(s.actualMinutes), 0)

  const completed = completedTasks.map((t: any) => t.project?.code ? `${t.title} (${t.project.code})` : t.title)
  const next = nextTasks.map((t: any) => t.title)

  const projectMinutes = new Map<string, number>()
  for (const s of sessions) {
    const key = s.project?.title ?? 'Other work'
    projectMinutes.set(key, (projectMinutes.get(key) ?? 0) + num(s.actualMinutes))
  }

  return {
    day: dayKey(bucket),
    summary: buildStandupSummary({ day: dayKey(bucket), completed, next, focusMinutes, billableMinutes }),
    completed,
    next,
    focusMinutes,
    billableMinutes,
    projects: Array.from(projectMinutes.entries()).map(([title, minutes]) => ({
      title,
      minutes,
      hours: round2(minutes / 60)
    }))
  }
}
