import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Goals')

export function registerGymGoalHandlers(prisma: any) {
  ipcMain.handle('gym:goals:getAll', async (_e, traineeId: string) => {
    try {
      return prisma.gymGoal.findMany({
        where: { traineeId },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
      })
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:goals:create', async (_e, data: any) => {
    try {
      if (data.deadline) data = { ...data, deadline: new Date(data.deadline) }
      return prisma.gymGoal.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:goals:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      if (data.deadline) data = { ...data, deadline: new Date(data.deadline) }
      return prisma.gymGoal.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:goals:delete', async (_e, id: string) => {
    try {
      await prisma.gymGoal.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })

  ipcMain.handle('gym:goals:markAchieved', async (_e, id: string) => {
    try {
      return prisma.gymGoal.update({ where: { id }, data: { status: 'achieved' } })
    } catch (err) { log.error('markAchieved', err); throw err }
  })
}
