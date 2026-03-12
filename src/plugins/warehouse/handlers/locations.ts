import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Warehouse:Locations')

export function registerLocationHandlers(prisma: any) {
  ipcMain.handle('warehouse:getLocations', async () => {
    try {
      return await prisma.warehouseLocation.findMany({
        where: { isActive: true },
        include: {
          parent: { select: { id: true, name: true, code: true } },
          _count: { select: { stockEntries: true, children: true } }
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }]
      })
    } catch (err) { log.error('getLocations error', err); throw err }
  })

  ipcMain.handle('warehouse:createLocation', async (_e, data: {
    name: string; code: string; type: string; parentId?: string; notes?: string
  }) => {
    try {
      return await prisma.warehouseLocation.create({ data: { ...data, parentId: data.parentId || null } })
    } catch (err) { log.error('createLocation error', err); throw err }
  })

  ipcMain.handle('warehouse:updateLocation', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, ...rest } = data
      return await prisma.warehouseLocation.update({ where: { id }, data: rest })
    } catch (err) { log.error('updateLocation error', err); throw err }
  })

  ipcMain.handle('warehouse:deleteLocation', async (_e, id: string) => {
    try {
      return await prisma.warehouseLocation.update({ where: { id }, data: { isActive: false } })
    } catch (err) { log.error('deleteLocation error', err); throw err }
  })
}
