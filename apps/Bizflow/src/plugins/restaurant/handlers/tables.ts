import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Tables')

export function registerTableHandlers(prisma: any) {
  ipcMain.handle('restaurant:getTables', async () => {
    try {
      return await prisma.restaurantTable.findMany({
        where: { isActive: true },
        include: { _count: { select: { orders: true, reservations: true } } },
        orderBy: { number: 'asc' }
      })
    } catch (err) { log.error('getTables error', err); throw err }
  })

  ipcMain.handle('restaurant:createTable', async (_e, data: { number: number; capacity: number; section?: string }) => {
    try {
      return await prisma.restaurantTable.create({ data })
    } catch (err) { log.error('createTable error', err); throw err }
  })

  ipcMain.handle('restaurant:updateTable', async (_e, data: { id: string; number?: number; capacity?: number; section?: string; status?: string }) => {
    try {
      const { id, ...rest } = data
      return await prisma.restaurantTable.update({ where: { id }, data: rest })
    } catch (err) { log.error('updateTable error', err); throw err }
  })

  ipcMain.handle('restaurant:deleteTable', async (_e, id: string) => {
    try {
      return await prisma.restaurantTable.update({ where: { id }, data: { isActive: false } })
    } catch (err) { log.error('deleteTable error', err); throw err }
  })
}
