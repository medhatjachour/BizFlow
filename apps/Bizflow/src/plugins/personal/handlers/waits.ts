// ─── Personal Work: Client bottleneck tracker ────────────────────────────────
// Logs the days a project sits "waiting for client" and keeps an auditable
// paper trail: when a wait closes, the delivery deadline is pushed forward by
// exactly the number of days the client delayed.
//
// IPC channels:
//   personal:waits:getAll / start / end / update / delete
//   personal:waits:getSummary / getClientImpact
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { daysBetween, num, paginate, round2 } from './utils'

const log = createLogger('Personal:Waits')

const WAIT_INCLUDE = {
  project: {
    select: {
      id: true, code: true, title: true, currency: true, dueDate: true, adjustedDueDate: true,
      client: { select: { id: true, name: true } }
    }
  }
}

export function registerWaitHandlers(prisma: any) {
  ipcMain.handle('personal:waits:getAll', async (_e, opts?: {
    projectId?: string; reason?: string; open?: boolean; page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = {}
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.reason) where.reason = opts.reason
      if (opts?.open === true) where.endedAt = null
      if (opts?.open === false) where.endedAt = { not: null }
      const [total, items] = await Promise.all([
        prisma.personalWaitLog.count({ where }),
        prisma.personalWaitLog.findMany({
          where,
          include: WAIT_INCLUDE,
          orderBy: [{ endedAt: 'asc' }, { startedAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      // Live day count for still-open waits.
      const now = new Date()
      const enriched = items.map((w: any) => ({
        ...w,
        liveDays: w.endedAt ? w.days : daysBetween(w.startedAt, now)
      }))
      return paginate(enriched, total, page, pageSize)
    } catch (err) { log.error('waits:getAll', err); throw err }
  })

  ipcMain.handle('personal:waits:start', async (_e, data: any) => {
    try {
      const project = await prisma.personalProject.findUnique({ where: { id: data?.projectId } })
      if (!project) throw new Error('Project not found')
      const open = await prisma.personalWaitLog.findFirst({ where: { projectId: data.projectId, endedAt: null } })
      if (open) throw new Error('This project already has an open wait')
      return await prisma.personalWaitLog.create({
        data: {
          projectId: data.projectId,
          reason: data?.reason || 'assets',
          startedAt: data?.startedAt ? new Date(data.startedAt) : new Date(),
          shiftDeadline: data?.shiftDeadline ?? true,
          note: data?.note || null
        },
        include: WAIT_INCLUDE
      })
    } catch (err) { log.error('waits:start', err); throw err }
  })

  ipcMain.handle('personal:waits:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('startedAt' in patch) patch.startedAt = new Date(patch.startedAt)
      return await prisma.personalWaitLog.update({ where: { id }, data: patch, include: WAIT_INCLUDE })
    } catch (err) { log.error('waits:update', err); throw err }
  })

  ipcMain.handle('personal:waits:delete', async (_e, id: string) => {
    try {
      return await prisma.personalWaitLog.delete({ where: { id } })
    } catch (err) { log.error('waits:delete', err); throw err }
  })

  ipcMain.handle('personal:waits:getSummary', async (_e, opts?: { from?: string; to?: string }) => {
    try {
      const where: any = {}
      if (opts?.from || opts?.to) {
        where.startedAt = {}
        if (opts?.from) where.startedAt.gte = new Date(opts.from)
        if (opts?.to) where.startedAt.lte = new Date(opts.to)
      }
      const logs = await prisma.personalWaitLog.findMany({ where, include: WAIT_INCLUDE })
      const now = new Date()
      const byReason: Record<string, number> = {}
      let totalDays = 0
      let openDays = 0
      let shiftsApplied = 0

      for (const w of logs) {
        const days = w.endedAt ? num(w.days) : daysBetween(w.startedAt, now)
        totalDays += days
        if (!w.endedAt) openDays += days
        shiftsApplied += num(w.appliedDays)
        byReason[w.reason] = round2((byReason[w.reason] ?? 0) + days)
      }

      const top = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0] ?? null
      return {
        entries: logs.length,
        openWaits: logs.filter((w: any) => !w.endedAt).length,
        totalDays: round2(totalDays),
        openDays: round2(openDays),
        closedDays: round2(totalDays - openDays),
        shiftsApplied,
        byReason,
        worstReason: top ? { reason: top[0], days: round2(top[1]) } : null
      }
    } catch (err) { log.error('waits:getSummary', err); throw err }
  })

  /** Waiting days aggregated per client — evidence when renegotiating a deadline. */
  ipcMain.handle('personal:waits:getClientImpact', async () => {
    try {
      const logs = await prisma.personalWaitLog.findMany({
        where: { endedAt: { not: null } },
        include: { project: { select: { clientId: true, client: { select: { id: true, name: true } } } } }
      })
      const map = new Map<string, { clientId: string; clientName: string; days: number; entries: number }>()
      for (const w of logs) {
        const client = w.project?.client
        const key = client?.id ?? 'unassigned'
        const row = map.get(key) ?? { clientId: key, clientName: client?.name ?? '—', days: 0, entries: 0 }
        row.days = round2(row.days + num(w.days))
        row.entries += 1
        map.set(key, row)
      }
      return Array.from(map.values()).sort((a, b) => b.days - a.days)
    } catch (err) { log.error('waits:getClientImpact', err); throw err }
  })

  registerCloseWaitHandler(prisma)
}

/**
 * Closes a wait, records the delay and shifts the project's adjusted deadline
 * forward so the client sees the impact of their own delay.
 */
function registerCloseWaitHandler(prisma: any) {
  ipcMain.handle('personal:waits:end', async (_e, data: { id: string; note?: string; shiftDeadline?: boolean }) => {
    try {
      const wait = await prisma.personalWaitLog.findUnique({ where: { id: data.id } })
      if (!wait) throw new Error('Wait log not found')
      if (wait.endedAt) return { ok: true, alreadyClosed: true, wait }

      const endedAt = new Date()
      const rawDays = daysBetween(wait.startedAt, endedAt)
      const days = Math.max(wait.shiftDeadline ? 1 : 0, rawDays)
      const shouldShift = data.shiftDeadline ?? wait.shiftDeadline

      await prisma.personalWaitLog.update({
        where: { id: data.id },
        data: {
          endedAt,
          days: rawDays,
          appliedDays: shouldShift ? days : 0,
          note: data.note ?? wait.note
        }
      })

      let shiftedDueDate: Date | null = null
      if (shouldShift && rawDays > 0) {
        const project = await prisma.personalProject.findUnique({ where: { id: wait.projectId } })
        const base = project?.adjustedDueDate ?? project?.dueDate
        if (base && project) {
          shiftedDueDate = new Date(base)
          shiftedDueDate.setDate(shiftedDueDate.getDate() + rawDays)
          await prisma.personalProject.update({
            where: { id: project.id },
            data: { adjustedDueDate: shiftedDueDate }
          })
        }
      }

      const updated = await prisma.personalWaitLog.findUnique({ where: { id: data.id }, include: WAIT_INCLUDE })
      return { ok: true, days: rawDays, appliedDays: shouldShift ? days : 0, shiftedDueDate, wait: updated }
    } catch (err) { log.error('waits:end', err); throw err }
  })
}
