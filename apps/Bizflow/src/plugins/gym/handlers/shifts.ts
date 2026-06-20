import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Shifts')

export function registerGymShiftHandlers(prisma: any) {
  ipcMain.handle('gym:shifts:getAll', async (_e, params?: { coachId?: string; weekStart?: string }) => {
    try {
      const where: any = {}
      if (params?.coachId) where.coachId = params.coachId
      if (params?.weekStart) {
        const start = new Date(params.weekStart)
        const end = new Date(start)
        end.setDate(end.getDate() + 7)
        where.date = { gte: start, lt: end }
      }
      return prisma.gymShift.findMany({
        where,
        include: { coach: { select: { id: true, name: true } } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      })
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:shifts:create', async (_e, data: any) => {
    try {
      return prisma.gymShift.create({
        data: { ...data, date: new Date(data.date) },
        include: { coach: { select: { id: true, name: true } } }
      })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:shifts:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      if (data.date) data = { ...data, date: new Date(data.date) }
      return prisma.gymShift.update({
        where: { id },
        data,
        include: { coach: { select: { id: true, name: true } } }
      })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:shifts:delete', async (_e, id: string) => {
    try {
      await prisma.gymShift.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })
}
