import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Plans')

export function registerGymPlanHandlers(prisma: any) {
  ipcMain.handle('gym:plans:getAll', async () => {
    try {
      return prisma.gymPlan.findMany({ orderBy: { price: 'asc' } })
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:plans:create', async (_e, data: any) => {
    try {
      return prisma.gymPlan.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:plans:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      return prisma.gymPlan.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:plans:delete', async (_e, id: string) => {
    try {
      await prisma.gymPlan.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })
}
