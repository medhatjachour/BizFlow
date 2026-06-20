import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Sessions')

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'week': {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      start.setDate(now.getDate() - dow)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
    default:
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

export function registerGymSessionHandlers(prisma: any) {
  ipcMain.handle('gym:sessions:getAll', async (_e, params?: { date?: string; period?: string; type?: string; traineeId?: string; skip?: number; take?: number }) => {
    try {
      const where: any = {}
      if (params?.date) {
        // specific day filter (YYYY-MM-DD)
        const d = new Date(params.date + 'T00:00:00')
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const dayEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
        where.date = { gte: dayStart, lt: dayEnd }
      } else if (params?.period) {
        const { start, end } = getPeriodRange(params.period)
        where.date = { gte: start, lt: end }
      }
      if (params?.type) where.type = params.type
      if (params?.traineeId) where.traineeId = params.traineeId
      const skip = params?.skip ?? 0
      const take = params?.take ?? 50
      const [data, total] = await Promise.all([
        prisma.gymWalkSession.findMany({
          where,
          orderBy: { date: 'desc' },
          skip,
          take,
          include: {
            trainee: { select: { id: true, name: true, phone: true } },
            coach: { select: { id: true, name: true } }
          }
        }),
        prisma.gymWalkSession.count({ where })
      ])
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:sessions:create', async (_e, data: any) => {
    try {
      return prisma.gymWalkSession.create({
        data: { ...data, date: data.date ? new Date(data.date) : new Date() },
        include: {
          trainee: { select: { id: true, name: true } },
          coach: { select: { id: true, name: true } }
        }
      })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:sessions:delete', async (_e, id: string) => {
    try {
      await prisma.gymWalkSession.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })

  ipcMain.handle('gym:sessions:getCalendar', async (_e, { year, month }: { year: number; month: number }) => {
    try {
      const start = new Date(year, month - 1, 1)
      const end   = new Date(year, month, 1)
      const sessions = await prisma.gymWalkSession.findMany({
        where: { date: { gte: start, lt: end } },
        select: { date: true, type: true, amount: true }
      })
      const byDay: Record<string, { total: number; walkin: number; sub: number; revenue: number }> = {}
      for (const s of sessions) {
        const day = new Date(s.date).toISOString().slice(0, 10)
        if (!byDay[day]) byDay[day] = { total: 0, walkin: 0, sub: 0, revenue: 0 }
        byDay[day].total++
        if (s.type === 'walkin') byDay[day].walkin++
        else byDay[day].sub++
        byDay[day].revenue += s.amount ?? 0
      }
      return byDay
    } catch (err) { log.error('getCalendar', err); throw err }
  })
}
