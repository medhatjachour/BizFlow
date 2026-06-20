/**
 * Clinic material batch (stock lot) CRUD handlers.
 *   clinic:materialBatches:getByMaterial / create / update / delete
 * Split out of materials.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { syncMaterialExpiry } from './materials.shared'

export function registerMaterialBatchHandlers(prisma: any) {
  ipcMain.handle('clinic:materialBatches:getByMaterial', async (_e, materialId: string) => {
    return prisma.clinicMaterialBatch.findMany({
      where: { materialId },
      orderBy: [{ isActive: 'desc' }, { receivedAt: 'desc' }],
    })
  })

  ipcMain.handle(
    'clinic:materialBatches:create',
    async (_e, { materialId, data }: { materialId: string; data: any }) => {
      const { expiryDate, quantity = 0, ...rest } = data
      const batch = await prisma.$transaction(async (tx: any) => {
        const created = await tx.clinicMaterialBatch.create({
          data: {
            ...rest,
            materialId,
            quantity,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
          },
        })
        // Increment material stock by the new batch quantity
        if (quantity > 0) {
          await tx.clinicMaterial.update({
            where: { id: materialId },
            data: { quantity: { increment: quantity } },
          })
        }
        await syncMaterialExpiry(tx, materialId)
        return created
      })
      return batch
    }
  )

  ipcMain.handle(
    'clinic:materialBatches:update',
    async (_e, { id, data }: { id: string; data: any }) => {
      return prisma.$transaction(async (tx: any) => {
        const existing = await tx.clinicMaterialBatch.findUnique({ where: { id } })
        if (!existing) throw new Error('BATCH_NOT_FOUND')

        const { expiryDate, quantity, ...rest } = data
        const updated = await tx.clinicMaterialBatch.update({
          where: { id },
          data: {
            ...rest,
            ...(quantity !== undefined ? { quantity } : {}),
            ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
          },
        })

        // Adjust material stock by the quantity delta
        if (quantity !== undefined && existing.isActive) {
          const delta = quantity - existing.quantity
          if (delta !== 0) {
            await tx.clinicMaterial.update({
              where: { id: existing.materialId },
              data: { quantity: { increment: delta } },
            })
          }
        }

        await syncMaterialExpiry(tx, existing.materialId)
        return updated
      })
    }
  )

  ipcMain.handle('clinic:materialBatches:delete', async (_e, id: string) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')

      const usageCount = await tx.clinicSessionMaterial.count({ where: { batchId: id } })
      if (usageCount > 0) throw new Error('BATCH_IN_USE')

      // Decrement material stock by the deleted batch quantity
      if (batch.isActive && batch.quantity > 0) {
        await tx.clinicMaterial.update({
          where: { id: batch.materialId },
          data: { quantity: { decrement: batch.quantity } },
        })
      }

      await tx.clinicMaterialBatch.delete({ where: { id } })
      await syncMaterialExpiry(tx, batch.materialId)
    })
  })
}
