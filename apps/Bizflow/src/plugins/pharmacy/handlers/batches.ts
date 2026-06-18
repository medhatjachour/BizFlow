import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Pharmacy:Batches')

export function registerPharmacyBatchHandlers(prisma: any): void {
  ipcMain.handle('pharmacy:batches:getByProduct', async (_e, productId: string) => {
    try {
      return await prisma.pharmacyBatch.findMany({
        where: { productId },
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { expiryDate: 'asc' },
      })
    } catch (err) { log.error('batches:getByProduct', err); throw err }
  })

  ipcMain.handle('pharmacy:batches:add', async (_e, data: {
    productId: string; batchNumber?: string; quantity: number; costPerUnit: number
    sellingPrice?: number; expiryDate: string; receivedDate?: string; supplierId?: string
  }) => {
    try {
      if (!data?.productId) throw new Error('Product is required')
      const quantity = Number(data.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than 0')
      if (!data.expiryDate) throw new Error('Expiry date is required')
      return await prisma.pharmacyBatch.create({
        data: {
          productId: data.productId,
          batchNumber: data.batchNumber?.trim() || null,
          quantity,
          initialQty: quantity,
          costPerUnit: Number(data.costPerUnit) || 0,
          sellingPrice: data.sellingPrice != null ? Number(data.sellingPrice) : null,
          expiryDate: new Date(data.expiryDate),
          receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
          supplierId: data.supplierId || null,
          status: 'active',
        },
      })
    } catch (err) { log.error('batches:add', err); throw err }
  })

  ipcMain.handle('pharmacy:batches:update', async (_e, id: string, data: any) => {
    try {
      const patch: any = {}
      if (data.batchNumber !== undefined) patch.batchNumber = data.batchNumber?.trim() || null
      if (data.quantity !== undefined) patch.quantity = Number(data.quantity) || 0
      if (data.costPerUnit !== undefined) patch.costPerUnit = Number(data.costPerUnit) || 0
      if (data.sellingPrice !== undefined) patch.sellingPrice = data.sellingPrice != null ? Number(data.sellingPrice) : null
      if (data.expiryDate !== undefined) patch.expiryDate = new Date(data.expiryDate)
      if (data.receivedDate !== undefined) patch.receivedDate = new Date(data.receivedDate)
      if (data.supplierId !== undefined) patch.supplierId = data.supplierId || null
      return await prisma.pharmacyBatch.update({ where: { id }, data: patch })
    } catch (err) { log.error('batches:update', err); throw err }
  })

  ipcMain.handle('pharmacy:batches:delete', async (_e, id: string) => {
    try {
      const sold = await prisma.pharmacySaleItem.count({ where: { batchId: id } })
      if (sold > 0) throw new Error('This batch has sales history and cannot be deleted. Dispose it instead.')
      await prisma.pharmacyBatch.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('batches:delete', err); throw err }
  })

  // Write off (dispose) remaining stock — e.g. expired/damaged.
  ipcMain.handle('pharmacy:batches:dispose', async (_e, id: string, data?: { quantity?: number; reason?: string }) => {
    try {
      const batch = await prisma.pharmacyBatch.findUnique({ where: { id } })
      if (!batch) throw new Error('Batch not found')
      const qty = data?.quantity != null ? Number(data.quantity) : batch.quantity
      if (!Number.isFinite(qty) || qty < 0 || qty > batch.quantity) {
        throw new Error(`Invalid quantity — must be between 0 and ${batch.quantity}`)
      }
      const remaining = batch.quantity - qty
      return await prisma.pharmacyBatch.update({
        where: { id },
        data: {
          quantity: remaining,
          disposedQty: (batch.disposedQty ?? 0) + qty,
          disposedAt: new Date(),
          disposeReason: data?.reason?.trim() || 'Disposed',
          status: remaining <= 0 ? 'disposed' : batch.status,
        },
      })
    } catch (err) { log.error('batches:dispose', err); throw err }
  })

  // All batches with an expiry concern (expired / expiring within N days).
  ipcMain.handle('pharmacy:batches:getExpiring', async (_e, params?: { days?: number; includeExpired?: boolean }) => {
    try {
      const days = params?.days ?? 30
      const now = new Date()
      const horizon = new Date(now.getTime() + days * 86_400_000)
      const rows = await prisma.pharmacyBatch.findMany({
        where: { quantity: { gt: 0 }, status: 'active', expiryDate: { lte: horizon } },
        include: { product: { select: { id: true, name: true, unit: true } } },
        orderBy: { expiryDate: 'asc' },
      })
      const nowMs = now.getTime()
      return rows.map((b: any) => {
        const diffDays = Math.floor((new Date(b.expiryDate).getTime() - nowMs) / 86_400_000)
        return {
          ...b,
          daysToExpiry: diffDays,
          isExpired: diffDays < 0,
          value: b.quantity * (b.costPerUnit ?? 0),
        }
      }).filter((b: any) => params?.includeExpired === false ? !b.isExpired : true)
    } catch (err) { log.error('batches:getExpiring', err); throw err }
  })
}
