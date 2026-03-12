import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Menu')

export function registerMenuHandlers(prisma: any) {
  ipcMain.handle('restaurant:getMenuItems', async () => {
    try {
      return await prisma.menuItem.findMany({ orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }] })
    } catch (err) { log.error('getMenuItems error', err); throw err }
  })

  ipcMain.handle('restaurant:createMenuItem', async (_e, data: {
    name: string; category: string; description?: string;
    price: number; cost?: number; preparationTime?: number; notes?: string
  }) => {
    try {
      return await prisma.menuItem.create({ data: { ...data, price: Number(data.price), cost: Number(data.cost ?? 0) } })
    } catch (err) { log.error('createMenuItem error', err); throw err }
  })

  ipcMain.handle('restaurant:updateMenuItem', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, ...rest } = data
      if (rest.price !== undefined) rest.price = Number(rest.price)
      if (rest.cost  !== undefined) rest.cost  = Number(rest.cost)
      return await prisma.menuItem.update({ where: { id }, data: rest })
    } catch (err) { log.error('updateMenuItem error', err); throw err }
  })

  ipcMain.handle('restaurant:deleteMenuItem', async (_e, id: string) => {
    try {
      return await prisma.menuItem.delete({ where: { id } })
    } catch (err) { log.error('deleteMenuItem error', err); throw err }
  })
}
