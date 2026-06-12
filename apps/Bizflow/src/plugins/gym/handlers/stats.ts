import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Stats')

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  switch (period) {
    case 'today':  start.setHours(0, 0, 0, 0); break
    case 'week': {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      start.setDate(now.getDate() - dow); start.setHours(0, 0, 0, 0)
      break
    }
    case 'year':   start.setMonth(0, 1); start.setHours(0, 0, 0, 0); break
    default: /* month */ start.setDate(1); start.setHours(0, 0, 0, 0)
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

export function registerGymStatsHandlers(prisma: any) {
  ipcMain.handle('gym:stats:overview', async (_e, period = 'month') => {
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6); sevenDaysAgo.setHours(0,0,0,0)
      const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7)
      const { start, end } = getPeriodRange(period)

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const [
        activeMembers,
        expiringSoon,
        todayCheckIns,
        subRevAgg,
        walkRevAgg,
        expensesAgg,
        trendSessions,
        newMembersThisMonth,
        activePrograms,
        occupiedLockers,
        totalLockers,
        totalTrainees,
        anonymousWalkInsToday
      ] = await Promise.all([
        prisma.gymSubscription.count({ where: { status: 'active' } }),
        prisma.gymSubscription.count({ where: { status: 'active', endDate: { gte: now, lte: nextWeek } } }),
        prisma.gymWalkSession.count({ where: { date: { gte: todayStart, lt: todayEnd } } }),
        prisma.gymSubscription.aggregate({
          _sum: { amountPaid: true },
          where: { createdAt: { gte: start, lt: end } }
        }),
        prisma.gymWalkSession.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lt: end } }
        }),
        prisma.gymExpense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: start, lt: end } }
        }),
        prisma.gymWalkSession.findMany({
          where: { date: { gte: sevenDaysAgo, lt: todayEnd } },
          select: { date: true }
        }),
        prisma.gymTrainee.count({ where: { createdAt: { gte: monthStart, lt: todayEnd } } }),
        prisma.gymProgram.count({ where: { isActive: true } }),
        prisma.gymLockerAssignment.count({ where: { isActive: true } }),
        prisma.gymLocker.count(),
        prisma.gymTrainee.count(),
        prisma.gymWalkSession.count({ where: { traineeId: null, date: { gte: todayStart, lt: todayEnd } } })
      ])

      // Build 7-day trend
      const trendMap: Record<string, number> = {}
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo); d.setDate(sevenDaysAgo.getDate() + i)
        trendMap[d.toISOString().slice(0,10)] = 0
      }
      for (const s of trendSessions) {
        const key = new Date(s.date).toISOString().slice(0,10)
        if (key in trendMap) trendMap[key]++
      }
      const visitTrend = Object.entries(trendMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }))

      const subRevenue = subRevAgg._sum.amountPaid ?? 0
      const walkRevenue = walkRevAgg._sum.amount ?? 0
      const revenue = subRevenue + walkRevenue
      const totalExpenses = expensesAgg._sum.amount ?? 0

      return {
        activeMembers,
        expiringSoon,
        todayCheckIns,
        revenue,
        subRevenue,
        walkRevenue,
        totalExpenses,
        netIncome: revenue - totalExpenses,
        visitTrend,
        newMembersThisMonth,
        activePrograms,
        occupiedLockers,
        totalLockers,
        totalTrainees,
        anonymousWalkInsToday
      }
    } catch (err) { log.error('overview', err); throw err }
  })
}
