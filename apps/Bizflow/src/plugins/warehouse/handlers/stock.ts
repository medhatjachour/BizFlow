import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { writeWarehouseAudit, writeWarehouseMovement } from './audit'

const log = createLogger('Warehouse:Stock')

export function registerStockHandlers(prisma: any) {
  ipcMain.handle('warehouse:getStock', async (_e, options?: string | { locationId?: string; search?: string; itemType?: string }) => {
    try {
      const locationId = typeof options === 'string' ? options : options?.locationId
      const search = typeof options === 'string' ? '' : (options?.search?.trim() || '')
      const itemType = typeof options === 'string' ? '' : (options?.itemType || '')

      const where: any = {}
      if (locationId) where.locationId = locationId
      if (itemType) where.itemType = itemType
      if (search) {
        where.OR = [
          { productName: { contains: search } },
          { sku: { contains: search } },
          { lotNumber: { contains: search } },
          { batchNumber: { contains: search } },
          { serialNumber: { contains: search } }
        ]
      }

      return await prisma.warehouseStock.findMany({
        where,
        include: { location: { select: { id: true, name: true, code: true } } },
        orderBy: [{ location: { name: 'asc' } }, { productName: 'asc' }]
      })
    } catch (err) { log.error('getStock error', err); throw err }
  })

  ipcMain.handle('warehouse:upsertStock', async (_e, data: {
    locationId: string; productName: string; productId?: string; sku?: string;
    quantity: number; unit?: string; minQuantity?: number; notes?: string;
    itemType?: string; barcode?: string; lotNumber?: string; batchNumber?: string;
    serialNumber?: string; expiryDate?: string; dimensions?: string; weight?: number;
    volume?: number; binCode?: string; aisleCode?: string; shelfCode?: string;
    palletCode?: string; isQuarantine?: boolean; isDamaged?: boolean; actedBy?: string
  }) => {
    try {
      const existing = await prisma.warehouseStock.findUnique({
        where: { locationId_productName: { locationId: data.locationId, productName: data.productName } }
      })
      const nextQty = Number(data.quantity)

      const row = await prisma.warehouseStock.upsert({
        where: { locationId_productName: { locationId: data.locationId, productName: data.productName } },
        create: {
          ...data,
          quantity: nextQty,
          minQuantity: Number(data.minQuantity ?? 0),
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          itemType: data.itemType || 'finished_goods'
        },
        update: {
          quantity: nextQty,
          unit: data.unit,
          minQuantity: Number(data.minQuantity ?? 0),
          notes: data.notes,
          sku: data.sku,
          itemType: data.itemType || 'finished_goods',
          barcode: data.barcode,
          lotNumber: data.lotNumber,
          batchNumber: data.batchNumber,
          serialNumber: data.serialNumber,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          dimensions: data.dimensions,
          weight: data.weight == null ? undefined : Number(data.weight),
          volume: data.volume == null ? undefined : Number(data.volume),
          binCode: data.binCode,
          aisleCode: data.aisleCode,
          shelfCode: data.shelfCode,
          palletCode: data.palletCode,
          isQuarantine: !!data.isQuarantine,
          isDamaged: !!data.isDamaged
        }
      })

      await writeWarehouseMovement(prisma, {
        movementType: existing ? 'adjust' : 'in',
        stockId: row.id,
        locationId: row.locationId,
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        quantity: existing ? nextQty - Number(existing.quantity) : nextQty,
        unit: row.unit,
        beforeQty: existing ? Number(existing.quantity) : 0,
        afterQty: Number(row.quantity),
        sourceType: 'manual',
        sourceId: row.id,
        actedBy: data.actedBy,
        notes: data.notes
      })

      await writeWarehouseAudit(prisma, {
        entityType: 'stock',
        entityId: row.id,
        action: existing ? 'stock.updated' : 'stock.created',
        actor: data.actedBy,
        details: `${row.productName} @ ${row.locationId} => ${row.quantity} ${row.unit}`
      })

      return row
    } catch (err) { log.error('upsertStock error', err); throw err }
  })

  ipcMain.handle('warehouse:adjustStock', async (_e, data: { id: string; delta?: number; quantity?: number; actedBy?: string; reason?: string }) => {
    try {
      const row = await prisma.warehouseStock.findUnique({ where: { id: data.id } })
      if (!row) throw new Error('Stock entry not found')

      const beforeQty = Number(row.quantity)
      const hasAbsolute = data.quantity != null && !Number.isNaN(Number(data.quantity))
      const afterQty = hasAbsolute
        ? Math.max(0, Number(data.quantity))
        : Math.max(0, beforeQty + Number(data.delta ?? 0))

      const updated = await prisma.warehouseStock.update({
        where: { id: data.id },
        data: { quantity: afterQty }
      })

      await writeWarehouseMovement(prisma, {
        movementType: 'adjust',
        stockId: updated.id,
        locationId: updated.locationId,
        productId: updated.productId,
        productName: updated.productName,
        sku: updated.sku,
        quantity: afterQty - beforeQty,
        unit: updated.unit,
        beforeQty,
        afterQty,
        sourceType: 'manual',
        sourceId: updated.id,
        actedBy: data.actedBy,
        notes: data.reason
      })

      await writeWarehouseAudit(prisma, {
        entityType: 'stock',
        entityId: updated.id,
        action: 'stock.adjusted',
        actor: data.actedBy,
        details: `${updated.productName}: ${beforeQty} -> ${afterQty}`
      })

      return updated
    } catch (err) { log.error('adjustStock error', err); throw err }
  })

  ipcMain.handle('warehouse:deleteStock', async (_e, id: string, actedBy?: string) => {
    try {
      const deleted = await prisma.warehouseStock.delete({ where: { id } })
      await writeWarehouseAudit(prisma, {
        entityType: 'stock',
        entityId: deleted.id,
        action: 'stock.deleted',
        actor: actedBy,
        details: `${deleted.productName} @ ${deleted.locationId}`
      })
      return deleted
    } catch (err) { log.error('deleteStock error', err); throw err }
  })

  ipcMain.handle('warehouse:getLowStock', async () => {
    try {
      if (prisma.warehouseStock?.fields?.minQuantity) {
        return await prisma.warehouseStock.findMany({
          where: {
            minQuantity: { gt: 0 },
            quantity: { lte: prisma.warehouseStock.fields.minQuantity }
          },
          include: { location: { select: { id: true, name: true, code: true } } }
        })
      }

      const rows = await prisma.warehouseStock.findMany({
        where: { minQuantity: { gt: 0 } },
        include: { location: { select: { id: true, name: true, code: true } } }
      })
      return rows.filter((r: any) => Number(r.quantity) <= Number(r.minQuantity))
    } catch (err) { log.error('getLowStock error', err); throw err }
  })

  ipcMain.handle('warehouse:getMovements', async (_e, params?: { locationId?: string; movementType?: string; actor?: string; skip?: number; take?: number }) => {
    try {
      const where: any = {}
      if (params?.locationId) where.locationId = params.locationId
      if (params?.movementType) where.movementType = params.movementType
      if (params?.actor) where.actedBy = params.actor

      const skip = Number(params?.skip ?? 0)
      const take = Number(params?.take ?? 100)

      const [data, total] = await Promise.all([
        prisma.warehouseStockMovement.findMany({
          where,
          include: { location: { select: { id: true, name: true, code: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.warehouseStockMovement.count({ where })
      ])

      return { data, total, hasMore: skip + data.length < total }
    } catch (err) { log.error('getMovements error', err); throw err }
  })

  ipcMain.handle('warehouse:getAuditLogs', async (_e, params?: { entityType?: string; actor?: string; search?: string; skip?: number; take?: number }) => {
    try {
      const where: any = {}
      if (params?.entityType) where.entityType = params.entityType
      if (params?.actor) where.actor = params.actor
      if (params?.search) {
        where.OR = [
          { entityId: { contains: params.search.trim() } },
          { action: { contains: params.search.trim() } },
          { details: { contains: params.search.trim() } }
        ]
      }

      const skip = Number(params?.skip ?? 0)
      const take = Number(params?.take ?? 100)

      const [data, total] = await Promise.all([
        prisma.warehouseAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.warehouseAuditLog.count({ where })
      ])

      return { data, total, hasMore: skip + data.length < total }
    } catch (err) { log.error('getAuditLogs error', err); throw err }
  })
}
