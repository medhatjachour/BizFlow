import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { writeWarehouseAudit, writeWarehouseMovement } from './audit'

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
    createdBy?: string;
    items: Array<{ productName: string; sku?: string; quantity: number; unit?: string; notes?: string }>
  }) => {
    try {
      const row = await prisma.stockTransfer.create({
        data: {
          fromLocationId: data.fromLocationId,
          toLocationId:   data.toLocationId,
          notes:          data.notes,
          createdBy:      data.createdBy,
          status:         'draft',
          items: { create: data.items.map(i => ({ ...i, quantity: Number(i.quantity) })) }
        },
        include: { fromLocation: true, toLocation: true, items: true }
      })

      await writeWarehouseAudit(prisma, {
        entityType: 'transfer',
        entityId: row.id,
        action: 'transfer.created',
        actor: data.createdBy,
        details: `${row.fromLocationId} -> ${row.toLocationId} (${row.items.length} items)`
      })

      return row
    } catch (err) { log.error('createTransfer error', err); throw err }
  })

  ipcMain.handle('warehouse:updateTransferStatus', async (_e, data: { id: string; status: string; actedBy?: string }) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const transfer = await tx.stockTransfer.findUnique({
          where: { id: data.id },
          include: { items: true, fromLocation: true, toLocation: true }
        })
        if (!transfer) throw new Error('Transfer not found')

        if (data.status === 'completed') {
          for (const item of transfer.items) {
            const moveQty = Number(item.quantity)

            const fromStock = await tx.warehouseStock.findUnique({
              where: {
                locationId_productName: {
                  locationId: transfer.fromLocationId,
                  productName: item.productName
                }
              }
            })

            if (!fromStock || Number(fromStock.quantity) < moveQty) {
              throw new Error(`Insufficient stock for transfer item: ${item.productName}`)
            }

            const decrementResult = await tx.warehouseStock.updateMany({
              where: {
                id: fromStock.id,
                quantity: { gte: moveQty }
              },
              data: { quantity: { decrement: moveQty } }
            })

            if (decrementResult.count !== 1) {
              throw new Error(`Stock changed during transfer completion for: ${item.productName}`)
            }

            const toStockBefore = await tx.warehouseStock.findUnique({
              where: {
                locationId_productName: {
                  locationId: transfer.toLocationId,
                  productName: item.productName
                }
              }
            })

            const toStock = await tx.warehouseStock.upsert({
              where: {
                locationId_productName: {
                  locationId: transfer.toLocationId,
                  productName: item.productName
                }
              },
              create: {
                locationId: transfer.toLocationId,
                productName: item.productName,
                sku: item.sku,
                quantity: moveQty,
                unit: item.unit || 'pcs'
              },
              update: { quantity: { increment: moveQty } }
            })

            await writeWarehouseMovement(tx, {
              movementType: 'transfer_out',
              stockId: fromStock.id,
              locationId: transfer.fromLocationId,
              productName: item.productName,
              sku: item.sku,
              quantity: -moveQty,
              unit: item.unit || 'pcs',
              beforeQty: Number(fromStock.quantity),
              afterQty: Number(fromStock.quantity) - moveQty,
              sourceType: 'transfer',
              sourceId: transfer.id,
              actedBy: data.actedBy,
              notes: transfer.notes
            })

            await writeWarehouseMovement(tx, {
              movementType: 'transfer_in',
              stockId: toStock.id,
              locationId: transfer.toLocationId,
              productName: item.productName,
              sku: item.sku,
              quantity: moveQty,
              unit: item.unit || 'pcs',
              beforeQty: toStockBefore ? Number(toStockBefore.quantity) : 0,
              afterQty: Number(toStock.quantity),
              sourceType: 'transfer',
              sourceId: transfer.id,
              actedBy: data.actedBy,
              notes: transfer.notes
            })
          }
        }

        const update: any = { status: data.status }
        if (data.status === 'completed') {
          update.completedAt = new Date()
          update.completedBy = data.actedBy ?? null
        }

        const updated = await tx.stockTransfer.update({ where: { id: data.id }, data: update })

        await writeWarehouseAudit(tx, {
          entityType: 'transfer',
          entityId: updated.id,
          action: `transfer.status.${data.status}`,
          actor: data.actedBy,
          details: `${updated.fromLocationId} -> ${updated.toLocationId}`
        })

        return updated
      })
    } catch (err) { log.error('updateTransferStatus error', err); throw err }
  })

  ipcMain.handle('warehouse:deleteTransfer', async (_e, id: string) => {
    try {
      return await prisma.stockTransfer.delete({ where: { id } })
    } catch (err) { log.error('deleteTransfer error', err); throw err }
  })
}
