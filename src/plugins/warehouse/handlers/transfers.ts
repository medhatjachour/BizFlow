import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Warehouse:Transfers')

export function registerTransferHandlers(prisma: any) {
  ipcMain.handle('warehouse:getTransfers', async (_e, options?: { status?: string }) => {
    try {
      const where = options?.status ? { status: options.status } : {}
      return await prisma.stockTransfer.findMany({
        where,
        include: {
          fromLocation: { select: { id: true, name: true, code: true } },
          toLocation:   { select: { id: true, name: true, code: true } },
          items: true,
          _count: { select: { items: true } }
        },
        orderBy: { transferDate: 'desc' }
      })
    } catch (err) { log.error('getTransfers error', err); throw err }
  })

  ipcMain.handle('warehouse:createTransfer', async (_e, data: {
    fromLocationId: string; toLocationId: string; notes?: string;
    items: Array<{ productName: string; sku?: string; quantity: number; unit?: string; notes?: string }>
  }) => {
    try {
      return await prisma.stockTransfer.create({
        data: {
          fromLocationId: data.fromLocationId,
          toLocationId:   data.toLocationId,
          notes:          data.notes,
          status:         'draft',
          items: { create: data.items.map(i => ({ ...i, quantity: Number(i.quantity) })) }
        },
        include: { fromLocation: true, toLocation: true, items: true }
      })
    } catch (err) { log.error('createTransfer error', err); throw err }
  })

  ipcMain.handle('warehouse:updateTransferStatus', async (_e, data: { id: string; status: string }) => {
    try {
      const update: any = { status: data.status }
      if (data.status === 'completed') {
        update.completedAt = new Date()
        const transfer = await prisma.stockTransfer.findUnique({
          where: { id: data.id },
          include: { items: true, fromLocation: true, toLocation: true }
        })
        if (transfer) {
          for (const item of transfer.items) {
            await prisma.warehouseStock.updateMany({
              where: { locationId: transfer.fromLocationId, productName: item.productName },
              data: { quantity: { decrement: item.quantity } }
            })
            await prisma.warehouseStock.upsert({
              where: { locationId_productName: { locationId: transfer.toLocationId, productName: item.productName } },
              create: { locationId: transfer.toLocationId, productName: item.productName, sku: item.sku, quantity: item.quantity, unit: item.unit || 'pcs' },
              update: { quantity: { increment: item.quantity } }
            })
          }
        }
      }
      return await prisma.stockTransfer.update({ where: { id: data.id }, data: update })
    } catch (err) { log.error('updateTransferStatus error', err); throw err }
  })

  ipcMain.handle('warehouse:deleteTransfer', async (_e, id: string) => {
    try {
      return await prisma.stockTransfer.delete({ where: { id } })
    } catch (err) { log.error('deleteTransfer error', err); throw err }
  })
}
