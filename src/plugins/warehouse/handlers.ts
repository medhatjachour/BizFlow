/**
 * Warehouse Plugin – IPC Handlers
 * Covers: Locations, Stock Entries, Transfers, Overview stats
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Warehouse')

export function registerWarehouseHandlers(prisma: any) {

  // ─── Locations ───────────────────────────────────────────────────────────

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

  // ─── Stock ───────────────────────────────────────────────────────────────

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
        // Fallback: raw comparison
        return await prisma.$queryRaw`
          SELECT ws.*, wl.name as locationName, wl.code as locationCode
          FROM WarehouseStock ws
          JOIN WarehouseLocation wl ON ws.locationId = wl.id
          WHERE ws.quantity <= ws.minQuantity AND ws.minQuantity > 0
        `
      })
    } catch (err) { log.error('getLowStock error', err); throw err }
  })

  // ─── Transfers ───────────────────────────────────────────────────────────

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
        // Apply stock movements
        const transfer = await prisma.stockTransfer.findUnique({
          where: { id: data.id },
          include: { items: true, fromLocation: true, toLocation: true }
        })
        if (transfer) {
          for (const item of transfer.items) {
            // Deduct from source
            await prisma.warehouseStock.updateMany({
              where: { locationId: transfer.fromLocationId, productName: item.productName },
              data: { quantity: { decrement: item.quantity } }
            })
            // Add to destination (upsert)
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

  // ─── Overview ────────────────────────────────────────────────────────────

  ipcMain.handle('warehouse:getOverview', async () => {
    try {
      const [totalLocations, totalSKUs, pendingTransfers, recentTransfers] = await Promise.all([
        prisma.warehouseLocation.count({ where: { isActive: true } }),
        prisma.warehouseStock.count(),
        prisma.stockTransfer.count({ where: { status: { in: ['draft', 'in_transit'] } } }),
        prisma.stockTransfer.findMany({
          take: 5,
          orderBy: { transferDate: 'desc' },
          include: {
            fromLocation: { select: { name: true, code: true } },
            toLocation:   { select: { name: true, code: true } },
            _count: { select: { items: true } }
          }
        })
      ])

      // Low stock: items where quantity <= minQuantity (minQuantity > 0)
      const lowStockItems = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM WarehouseStock WHERE quantity <= minQuantity AND minQuantity > 0
      `.catch(() => [{ count: 0 }])
      const lowStockCount = Number(lowStockItems[0]?.count ?? 0)

      return { totalLocations, totalSKUs, pendingTransfers, lowStockCount, recentTransfers }
    } catch (err) { log.error('getOverview error', err); throw err }
  })
}
