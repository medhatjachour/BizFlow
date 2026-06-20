import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Coaches')

export function registerGymCoachHandlers(prisma: any) {
  ipcMain.handle('gym:coaches:getAll', async (_e, params?: { search?: string; isActive?: boolean; skip?: number; take?: number }) => {
    try {
      const where: any = {}
      if (params?.search) {
        where.OR = [
          { name: { contains: params.search } },
          { phone: { contains: params.search } },
          { specialty: { contains: params.search } }
        ]
      }
      if (params?.isActive !== undefined) where.isActive = params.isActive
      const skip = params?.skip ?? 0
      const take = params?.take ?? 100
      const [data, total] = await Promise.all([
        prisma.gymCoach.findMany({ where, orderBy: { name: 'asc' }, skip, take }),
        prisma.gymCoach.count({ where })
      ])
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:coaches:getById', async (_e, id: string) => {
    try {
      return prisma.gymCoach.findUnique({
        where: { id },
        include: {
          subscriptions: {
            include: { trainee: { select: { id: true, name: true, phone: true } }, plan: true },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    } catch (err) { log.error('getById', err); throw err }
  })

  ipcMain.handle('gym:coaches:create', async (_e, data: any) => {
    try {
      // coerce hireDate string → Date; drop null so schema default(now()) applies
      if (data.hireDate) data = { ...data, hireDate: new Date(data.hireDate) }
      else { const { hireDate: _h, ...rest } = data; data = rest }
      return prisma.gymCoach.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:coaches:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      if (data.hireDate) data = { ...data, hireDate: new Date(data.hireDate) }
      return prisma.gymCoach.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:coaches:delete', async (_e, id: string) => {
    try {
      await prisma.gymCoach.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })

  ipcMain.handle('gym:coaches:getStats', async (_e, coachId: string) => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const dow        = now.getDay() === 0 ? 6 : now.getDay() - 1
      const weekStart  = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0, 0, 0, 0)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const sevenDays  = new Date(now); sevenDays.setDate(now.getDate() + 7)

      const [sessionsToday, sessionsWeek, sessionsMonth, subscriptions] = await Promise.all([
        prisma.gymWalkSession.count({ where: { coachId, date: { gte: todayStart, lt: todayEnd } } }),
        prisma.gymWalkSession.count({ where: { coachId, date: { gte: weekStart,  lt: todayEnd } } }),
        prisma.gymWalkSession.count({ where: { coachId, date: { gte: monthStart, lt: todayEnd } } }),
        prisma.gymSubscription.findMany({
          where: { coachId },
          include: {
            trainee: { select: { id: true, name: true, phone: true } },
            plan:    { select: { id: true, name: true, durationDays: true } }
          },
          orderBy: { startDate: 'desc' }
        })
      ])

      const activeTrainees = subscriptions.filter((s: any) => s.status === 'active').length
      const uniqueTrainees = new Set(subscriptions.map((s: any) => s.traineeId)).size
      const totalRevenue   = subscriptions.reduce((sum: number, s: any) => sum + (s.amountPaid ?? 0), 0)
      const expiringSoon   = subscriptions.filter((s: any) =>
        s.status === 'active' && new Date(s.endDate) <= sevenDays
      ).length

      return { sessionsToday, sessionsWeek, sessionsMonth, activeTrainees, uniqueTrainees, totalRevenue, expiringSoon, subscriptions }
    } catch (err) { log.error('getStats', err); throw err }
  })
}
