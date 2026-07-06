import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Subscriptions')

const INCLUDE = {
  trainee: { select: { id: true, name: true, phone: true } },
  plan: true,
  coach: { select: { id: true, name: true } },
  freezes: { orderBy: { createdAt: 'asc' } }
}

export function registerGymSubscriptionHandlers(prisma: any) {
  ipcMain.handle('gym:subscriptions:getAll', async (_e, params?: { status?: string; traineeId?: string; skip?: number; take?: number }) => {
    try {
      const where: any = {}
      if (params?.status && params.status !== 'all') where.status = params.status
      if (params?.traineeId) where.traineeId = params.traineeId
      const skip = params?.skip ?? 0
      const take = params?.take ?? 50
      const [data, total] = await Promise.all([
        prisma.gymSubscription.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.gymSubscription.count({ where })
      ])
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:subscriptions:getById', async (_e, id: string) => {
    try {
      return prisma.gymSubscription.findUnique({ where: { id }, include: INCLUDE })
    } catch (err) { log.error('getById', err); throw err }
  })

  ipcMain.handle('gym:subscriptions:create', async (_e, data: any) => {
    try {
      // Compute endDate from plan if not provided
      if (!data.endDate) {
        const plan = await prisma.gymPlan.findUnique({ where: { id: data.planId }, select: { durationDays: true } })
        if (!plan) throw new Error('Plan not found')
        const start = new Date(data.startDate)
        start.setDate(start.getDate() + plan.durationDays)
        data = { ...data, endDate: start.toISOString() }
      }
      // Prisma requires full ISO-8601 DateTime — coerce date-only strings
      const startDate = new Date(data.startDate)
      const endDate   = new Date(data.endDate)
      // Auto-expire any previous active sub for this trainee
      await prisma.gymSubscription.updateMany({
        where: { traineeId: data.traineeId, status: 'active' },
        data: { status: 'expired' }
      })
      return prisma.gymSubscription.create({
        data: { ...data, startDate, endDate },
        include: INCLUDE
      })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:subscriptions:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      // Coerce date-only strings to full DateTime
      if (data.startDate) data = { ...data, startDate: new Date(data.startDate) }
      if (data.endDate)   data = { ...data, endDate:   new Date(data.endDate) }
      return prisma.gymSubscription.update({ where: { id }, data, include: INCLUDE })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:subscriptions:delete', async (_e, id: string) => {
    try {
      await prisma.gymSubscription.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })

  ipcMain.handle('gym:subscriptions:freeze', async (_e, { id, data }: { id: string; data: { startDate: string; endDate: string; days: number; reason?: string } }) => {
    try {
      const sub = await prisma.gymSubscription.findUnique({ where: { id }, include: { plan: true } })
      if (!sub) throw new Error('Subscription not found')
      // Guard: don't exceed the plan's allowed freeze days.
      const maxFreeze = sub.plan?.maxFreezeDays ?? 0
      if (maxFreeze > 0 && sub.freezeDaysUsed + data.days > maxFreeze) {
        throw new Error(`Freeze limit exceeded — plan allows ${maxFreeze} freeze day(s); ${sub.freezeDaysUsed} already used`)
      }
      // Extend end date by freeze days
      const newEnd = new Date(sub.endDate)
      newEnd.setDate(newEnd.getDate() + data.days)
      return prisma.$transaction([
        prisma.gymFreeze.create({
          data: {
            subscriptionId: id,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            days: data.days,
            reason: data.reason
          }
        }),
        prisma.gymSubscription.update({
          where: { id },
          data: {
            status: 'frozen',
            endDate: newEnd,
            freezeDaysUsed: sub.freezeDaysUsed + data.days
          },
          include: INCLUDE
        })
      ])
    } catch (err) { log.error('freeze', err); throw err }
  })

  ipcMain.handle('gym:subscriptions:unfreeze', async (_e, id: string) => {
    try {
      const now = new Date()
      const sub = await prisma.gymSubscription.findUnique({ where: { id } })
      if (!sub) throw new Error('Subscription not found')
      const status = now > new Date(sub.endDate) ? 'expired' : 'active'
      return prisma.gymSubscription.update({
        where: { id },
        data: { status },
        include: INCLUDE
      })
    } catch (err) { log.error('unfreeze', err); throw err }
  })
}
