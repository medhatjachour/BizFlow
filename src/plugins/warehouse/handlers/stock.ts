import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Warehouse:Stock')

export function registerStockHandlers(prisma: any) {
  ipcMain.handle('warehouse:getStock', async (_e, locationId?: string) => {
    try {
      const where = locationId ? { locationId } : {}
      return await prisma.warehouseStock.findMany({
        where,
        include: { location: { select: { id: true, name: true, code: true } } },
        orderBy: [{ location: { name: 'asc' } }, { productName: 'asc' }]
      })
    } catch (err) { log.error('getStock error', err); throw err }
  })

  ipcMain.handle('warehouse:upsertStock', async (_e, data: {
    locationId: string; productName: string; productId?: string; sku?: string;
    quantity: number; unit?: string; minQuantity?: number; notes?: string
  }) => {
    try {
      return await prisma.warehouseStock.upsert({
        where: { locationId_productName: { locationId: data.locationId, productName: data.productName } },
        create: { ...data, quantity: Number(data.quantity), minQuantity: Number(data.minQuantity ?? 0) },
        update: { quantity: Number(data.quantity), unit: data.unit, minQuantity: Number(data.minQuantity ?? 0), notes: data.notes, sku: data.sku }
      })
    } catch (err) { log.error('upsertStock error', err); throw err }
  })

  ipcMain.handle('warehouse:adjustStock', async (_e, data: { id: string; delta: number }) => {
    try {
      return await prisma.warehouseStock.update({
        where: { id: data.id },
        data: { quantity: { increment: Number(data.delta) } }
      })
    } catch (err) { log.error('adjustStock error', err); throw err }
  })

  ipcMain.handle('warehouse:deleteStock', async (_e, id: string) => {
    try {
      return await prisma.warehouseStock.delete({ where: { id } })
    } catch (err) { log.error('deleteStock error', err); throw err }
  })

  ipcMain.handle('warehouse:getLowStock', async () => {
    try {
      return await prisma.warehouseStock.findMany({
        where: { quantity: { lte: prisma.warehouseStock.fields?.minQuantity } },
        include: { location: { select: { id: true, name: true, code: true } } }
      }).catch(async () => {
        return await prisma.$queryRaw`
          SELECT ws.*, wl.name as locationName, wl.code as locationCode
          FROM WarehouseStock ws
          JOIN WarehouseLocation wl ON ws.locationId = wl.id
          WHERE ws.quantity <= ws.minQuantity AND ws.minQuantity > 0
        `
      })
    } catch (err) { log.error('getLowStock error', err); throw err }
  })
}
