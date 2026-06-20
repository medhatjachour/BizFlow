import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Gym:Measurements')

export function registerGymMeasurementHandlers(prisma: any) {
  ipcMain.handle('gym:measurements:getAll', async (_e, traineeId: string) => {
    try {
      return prisma.gymMeasurement.findMany({
        where: { traineeId },
        orderBy: { date: 'desc' }
      })
    } catch (err) { log.error('getAll', err); throw err }
  })

  ipcMain.handle('gym:measurements:create', async (_e, data: any) => {
    try {
      return prisma.gymMeasurement.create({
        data: { ...data, date: data.date ? new Date(data.date) : new Date() }
      })
    } catch (err) { log.error('create', err); throw err }
  })

  ipcMain.handle('gym:measurements:update', async (_e, { id, data }: { id: string; data: any }) => {
    try {
      if (data.date) data = { ...data, date: new Date(data.date) }
      return prisma.gymMeasurement.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  ipcMain.handle('gym:measurements:delete', async (_e, id: string) => {
    try {
      await prisma.gymMeasurement.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })
}
