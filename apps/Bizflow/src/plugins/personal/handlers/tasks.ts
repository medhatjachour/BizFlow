// ─── Personal Work: Tasks & the "Daily 3" prioritisation board ───────────────
// The main view only ever shows three high-impact deliverables; everything else
// waits in the backlog so a solo operator cannot drown in their own list.
//
// IPC channels:
//   personal:tasks:getAll / getDailyThree / getCounts / create / update / delete
//   personal:tasks:setDailyThree / complete / reopen / rollDay / bulk
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { num, paginate, startOfDay, toDate } from './utils'

const log = createLogger('Personal:Tasks')

export const DAILY_THREE_LIMIT = 3
const CLOSED_STATUSES = ['done', 'cancelled']

const TASK_INCLUDE = {
  project: { select: { id: true, code: true, title: true, currency: true } },
  client: { select: { id: true, name: true } }
}

export function registerTaskHandlers(prisma: any) {
  ipcMain.handle('personal:tasks:getAll', async (_e, opts?: {
    status?: string; projectId?: string; clientId?: string; isDailyThree?: boolean
    search?: string; from?: string; to?: string; openOnly?: boolean
    page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 100
      const where: any = {}
      if (opts?.status) where.status = opts.status
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.clientId) where.clientId = opts.clientId
      if (opts?.isDailyThree !== undefined) where.isDailyThree = opts.isDailyThree
      if (opts?.openOnly) where.status = { notIn: CLOSED_STATUSES }
      if (opts?.search) where.title = { contains: opts.search }
      if (opts?.from || opts?.to) {
        where.dueDate = {}
        if (opts?.from) where.dueDate.gte = startOfDay(opts.from)
        if (opts?.to) where.dueDate.lte = new Date(new Date(opts.to).setHours(23, 59, 59, 999))
      }
      const [total, items] = await Promise.all([
        prisma.personalTask.count({ where }),
        prisma.personalTask.findMany({
          where,
          include: TASK_INCLUDE,
          orderBy: [
            { isDailyThree: 'desc' },
            { priority: 'asc' },
            { dueDate: 'asc' },
            { createdAt: 'desc' }
          ],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      return paginate(items, total, page, pageSize)
    } catch (err) { log.error('tasks:getAll', err); throw err }
  })

  /** The Daily 3 board, padded with the highest-priority backlog candidates. */
  ipcMain.handle('personal:tasks:getDailyThree', async () => {
    try {
      const pinned = await prisma.personalTask.findMany({
        where: { isDailyThree: true, status: { notIn: CLOSED_STATUSES } },
        include: TASK_INCLUDE,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }]
      })
      const slots = Math.max(0, DAILY_THREE_LIMIT - pinned.length)
      const suggestions = slots > 0
        ? await prisma.personalTask.findMany({
            where: { isDailyThree: false, status: { notIn: CLOSED_STATUSES } },
            include: TASK_INCLUDE,
            orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
            take: slots
          })
        : []

      const today = startOfDay()
      const candidates = [...pinned, ...suggestions]
      const enrich = async (task: any) => {
        const minutes = await prisma.personalFocusSession.aggregate({
          where: { taskId: task.id, endedAt: { not: null } },
          _sum: { actualMinutes: true }
        })
        return { ...task, trackedMinutes: num(minutes._sum.actualMinutes) }
      }

      return {
        limit: DAILY_THREE_LIMIT,
        date: today,
        items: await Promise.all(candidates.map(enrich)),
        filled: pinned.length,
        slotsLeft: slots
      }
    } catch (err) { log.error('tasks:getDailyThree', err); throw err }
  })

  ipcMain.handle('personal:tasks:getCounts', async () => {
    try {
      const [byStatus, overdue, dueToday, dailyThree] = await Promise.all([
        prisma.personalTask.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.personalTask.count({
          where: { status: { notIn: CLOSED_STATUSES }, dueDate: { lt: startOfDay() } }
        }),
        prisma.personalTask.count({
          where: {
            status: { notIn: CLOSED_STATUSES },
            dueDate: { gte: startOfDay(), lte: new Date(new Date().setHours(23, 59, 59, 999)) }
          }
        }),
        prisma.personalTask.count({ where: { isDailyThree: true, status: { notIn: CLOSED_STATUSES } } })
      ])
      const counts: Record<string, number> = {}
      for (const row of byStatus) counts[row.status] = num(row._count?._all)
      return { byStatus: counts, overdue, dueToday, dailyThree }
    } catch (err) { log.error('tasks:getCounts', err); throw err }
  })

  ipcMain.handle('personal:tasks:create', async (_e, data: any) => {
    try {
      const task = await prisma.personalTask.create({
        data: {
          projectId: data?.projectId || null,
          clientId: data?.clientId || null,
          title: String(data?.title ?? '').trim(),
          notes: data?.notes || null,
          status: data?.status || 'backlog',
          type: data?.type || 'deliverable',
          priority: Math.round(num(data?.priority, 3)),
          estimateMinutes: Math.round(num(data?.estimateMinutes)),
          dueDate: toDate(data?.dueDate),
          isBillable: data?.isBillable ?? true
        },
        include: TASK_INCLUDE
      })
      if (data?.isDailyThree) {
        try {
          await pinDailyThree(prisma, task.id, true)
        } catch (err) {
          log.warn('tasks:create daily-three slot full, kept in backlog', err)
        }
      }
      return await prisma.personalTask.findUnique({ where: { id: task.id }, include: TASK_INCLUDE })
    } catch (err) { log.error('tasks:create', err); throw err }
  })

  ipcMain.handle('personal:tasks:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('dueDate' in patch) patch.dueDate = toDate(patch.dueDate)
      if ('priority' in patch) patch.priority = Math.round(num(patch.priority, 3))
      if ('estimateMinutes' in patch) patch.estimateMinutes = Math.round(num(patch.estimateMinutes))
      return await prisma.personalTask.update({ where: { id }, data: patch, include: TASK_INCLUDE })
    } catch (err) { log.error('tasks:update', err); throw err }
  })

  ipcMain.handle('personal:tasks:delete', async (_e, id: string) => {
    try {
      return await prisma.personalTask.delete({ where: { id } })
    } catch (err) { log.error('tasks:delete', err); throw err }
  })

  /** Pins or unpins a task, refusing to exceed the three-slot limit. */
  ipcMain.handle('personal:tasks:setDailyThree', async (_e, data: { id: string; value: boolean }) => {
    try {
      return await pinDailyThree(prisma, data.id, data.value)
    } catch (err) { log.error('tasks:setDailyThree', err); throw err }
  })

  ipcMain.handle('personal:tasks:complete', async (_e, data: { id: string; note?: string }) => {
    try {
      return await prisma.personalTask.update({
        where: { id: data.id },
        data: {
          status: 'done',
          completedAt: new Date(),
          isDailyThree: false,
          notes: data.note ?? undefined
        },
        include: TASK_INCLUDE
      })
    } catch (err) { log.error('tasks:complete', err); throw err }
  })

  ipcMain.handle('personal:tasks:reopen', async (_e, id: string) => {
    try {
      return await prisma.personalTask.update({
        where: { id },
        data: { status: 'in_progress', completedAt: null },
        include: TASK_INCLUDE
      })
    } catch (err) { log.error('tasks:reopen', err); throw err }
  })

  /**
   * End-of-day rollover: unfinished "today" tasks drop back to the backlog and
   * the Daily 3 slots are released for tomorrow.
   */
  ipcMain.handle('personal:tasks:rollDay', async () => {
    try {
      const open = await prisma.personalTask.findMany({
        where: { status: { in: ['today', 'in_progress', 'blocked'] } },
        select: { id: true }
      })
      if (open.length) {
        await prisma.personalTask.updateMany({
          where: { id: { in: open.map((t: any) => t.id) } },
          data: { status: 'backlog' }
        })
      }
      await prisma.personalTask.updateMany({
        where: { isDailyThree: true, status: { notIn: CLOSED_STATUSES } },
        data: { isDailyThree: false }
      })
      return { rolled: open.length }
    } catch (err) { log.error('tasks:rollDay', err); throw err }
  })

  /**
   * One round trip for a multi-row action. Pinning is capped by the Daily 3
   * limit, so the reply reports how many rows were skipped and why rather than
   * failing the whole batch or silently dropping the extra ones.
   */
  ipcMain.handle('personal:tasks:bulk', async (_e, data: { ids?: unknown; action?: unknown }) => {
    try {
      const ids = Array.from(
        new Set(
          ((Array.isArray(data?.ids) ? data.ids : []) as unknown[])
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter((id) => id.length > 0)
        )
      )
      const action = String(data?.action ?? '')
      if (!ids.length) return { affected: 0, skipped: 0 }

      switch (action) {
        case 'complete': {
          const result = await prisma.personalTask.updateMany({
            where: { id: { in: ids } },
            data: { status: 'done', completedAt: new Date(), isDailyThree: false }
          })
          return { affected: result.count, skipped: ids.length - result.count }
        }
        case 'reopen': {
          const result = await prisma.personalTask.updateMany({
            where: { id: { in: ids } },
            data: { status: 'in_progress', completedAt: null }
          })
          return { affected: result.count, skipped: ids.length - result.count }
        }
        case 'pin': {
          const pinned = await prisma.personalTask.count({
            where: { isDailyThree: true, status: { notIn: CLOSED_STATUSES } }
          })
          let slots = Math.max(0, DAILY_THREE_LIMIT - pinned)
          const candidates = await prisma.personalTask.findMany({
            where: { id: { in: ids }, isDailyThree: false, status: { notIn: CLOSED_STATUSES } },
            orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
            select: { id: true, status: true }
          })
          let affected = 0
          for (const task of candidates) {
            if (slots <= 0) break
            await prisma.personalTask.update({
              where: { id: task.id },
              data: { isDailyThree: true, status: task.status === 'backlog' ? 'today' : task.status }
            })
            slots -= 1
            affected += 1
          }
          return { affected, skipped: ids.length - affected }
        }
        case 'unpin': {
          const result = await prisma.personalTask.updateMany({
            where: { id: { in: ids }, isDailyThree: true },
            data: { isDailyThree: false }
          })
          return { affected: result.count, skipped: ids.length - result.count }
        }
        case 'delete': {
          const result = await prisma.personalTask.deleteMany({ where: { id: { in: ids } } })
          return { affected: result.count, skipped: ids.length - result.count }
        }
        default:
          throw new Error(`Unsupported bulk action: ${action}`)
      }
    } catch (err) { log.error('tasks:bulk', err); throw err }
  })
}

async function pinDailyThree(prisma: any, id: string, value: boolean) {
  if (value) {
    const task = await prisma.personalTask.findUnique({ where: { id } })
    if (!task) throw new Error('Task not found')
    if (!task.isDailyThree) {
      const pinned = await prisma.personalTask.count({
        where: { isDailyThree: true, status: { notIn: CLOSED_STATUSES } }
      })
      if (pinned >= DAILY_THREE_LIMIT) {
        throw new Error(`Daily 3 is full — finish or unpin one of the ${DAILY_THREE_LIMIT} tasks first`)
      }
    }
    return await prisma.personalTask.update({
      where: { id },
      data: { isDailyThree: true, status: task.status === 'backlog' ? 'today' : task.status },
      include: TASK_INCLUDE
    })
  }
  return await prisma.personalTask.update({
    where: { id },
    data: { isDailyThree: false },
    include: TASK_INCLUDE
  })
}
