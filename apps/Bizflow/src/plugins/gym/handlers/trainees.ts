import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Trainees')

export function registerGymTraineeHandlers(prisma: any) {
  ipcMain.handle('gym:trainees:getAll', async (_e, params?: { search?: string; skip?: number; take?: number }) => {
    try {
      const where: any = {}
      if (params?.search) {
        where.OR = [
          { name: { contains: params.search } },
          { phone: { contains: params.search } },
          { email: { contains: params.search } }
        ]
      }
      const skip = params?.skip ?? 0
      const take = params?.take ?? 50
      const now = new Date()
      const [data, total] = await Promise.all([
        prisma.gymTrainee.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take,
          include: {
            subscriptions: {
              where: { status: 'active', endDate: { gte: now } },
              include: { plan: true },
              orderBy: { endDate: 'desc' },
              take: 1
            },
            _count: { select: { sessions: true } }
          }
        }),
        prisma.gymTrainee.count({ where })
      ])
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:trainees:getById', async (_e, id: string) => {
    try {
      return prisma.gymTrainee.findUnique({
        where: { id },
        include: {
          subscriptions: {
            include: { plan: true, coach: { select: { id: true, name: true } }, freezes: true },
            orderBy: { createdAt: 'desc' }
          },
          sessions: {
            orderBy: { date: 'desc' },
            take: 50,
            include: { coach: { select: { id: true, name: true } } }
          }
        }
      })
    } catch (err) { log.error('getById', err); throw err }
  })

  ipcMain.handle('gym:trainees:searchLite', async (_e, query: string) => {
    try {
      return prisma.gymTrainee.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { phone: { contains: query } }
          ]
        },
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
        take: 10
      })
    } catch (err) { log.error('searchLite', err); throw err }
  })

  ipcMain.handle('gym:trainees:create', async (_e, data: any) => {
    try {
      return prisma.gymTrainee.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:trainees:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      return prisma.gymTrainee.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:trainees:delete', async (_e, id: string) => {
    try {
      await prisma.gymTrainee.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })
}
