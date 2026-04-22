import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Alerts')

export function registerGymAlertHandlers(prisma: any) {
  // Returns trainees who haven't checked in within the given threshold (days)
  ipcMain.handle('gym:alerts:atRisk', async (_e, thresholdDays = 14) => {
    try {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - thresholdDays)

      // Active subscribers only
      const activeSubs = await prisma.gymSubscription.findMany({
        where: { status: 'active' },
        select: {
          traineeId: true,
          trainee: { select: { id: true, name: true, phone: true } },
          endDate: true,
          plan: { select: { name: true } }
        }
      })

      const results: any[] = []
      for (const sub of activeSubs) {
        const lastSession = await prisma.gymWalkSession.findFirst({
          where: { traineeId: sub.traineeId },
          orderBy: { date: 'desc' },
          select: { date: true }
        })
        const lastVisit = lastSession?.date ?? null
        const daysSince = lastVisit
          ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86_400_000)
          : 999
        if (daysSince >= thresholdDays) {
          results.push({
            traineeId: sub.traineeId,
            name: sub.trainee.name,
            phone: sub.trainee.phone,
            planName: sub.plan.name,
            endDate: sub.endDate,
            lastVisit,
            daysSince
          })
        }
      }

      results.sort((a, b) => b.daysSince - a.daysSince)
      return results
    } catch (err) { log.error('atRisk', err); throw err }
  })
}
