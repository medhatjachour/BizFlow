/**
 * Clinic material batch audit trail: loss, expiry, and adjustment logging.
 *   clinic:batches:logLoss / logExpiry / logAdjustment
 * Split out of materials.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { syncMaterialExpiry } from './materials.shared'

export function registerMaterialLoggingHandlers(prisma: any) {
  // Log batch loss (damage, spillage, contamination, etc.)
  ipcMain.handle('clinic:batches:logLoss', async (_e, {
    batchId,
    materialId,
    quantityLost,
    reason = 'other',
    description = null,
    recordedBy = null,
  }: {
    batchId: string
    materialId: string
    quantityLost: number
    reason?: string
    description?: string | null
    recordedBy?: string | null
  }) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')
      if (batch.materialId !== materialId) throw new Error('BATCH_MATERIAL_MISMATCH')

      const requestedLoss = Math.max(0, Number(quantityLost) || 0)
      if (requestedLoss <= 0) throw new Error('INVALID_LOSS_QUANTITY')

      const actualLoss = Math.min(requestedLoss, batch.quantity)
      const newBatchQty = batch.quantity - actualLoss

      await tx.clinicMaterialBatch.update({
        where: { id: batchId },
        data: { quantity: newBatchQty },
      })

      const material = await tx.clinicMaterial.findUnique({ where: { id: materialId } })
      if (!material) throw new Error('MATERIAL_NOT_FOUND')
      const newMaterialQty = Math.max(0, material.quantity - actualLoss)

      await tx.clinicMaterial.update({
        where: { id: materialId },
        data: { quantity: newMaterialQty },
      })

      // Create loss record (audit trail)
      const loss = await tx.clinicMaterialLoss.create({
        data: {
          batchId,
          materialId,
          quantityLost: actualLoss,
          reason,
          description,
          recordedBy,
        },
      })

      await syncMaterialExpiry(tx, materialId)
      return loss
    })
  })

  // Log batch expiry
  ipcMain.handle('clinic:batches:logExpiry', async (_e, {
    batchId,
    materialId,
    quantityExpired,
    expiryDate,
    disposalMethod = null,
    recordedBy = null,
    notes = null,
  }: {
    batchId: string
    materialId: string
    quantityExpired: number
    expiryDate: string
    disposalMethod?: string | null
    recordedBy?: string | null
    notes?: string | null
  }) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')
      if (batch.materialId !== materialId) throw new Error('BATCH_MATERIAL_MISMATCH')

      const requestedExpiry = Math.max(0, Number(quantityExpired) || 0)
      if (requestedExpiry <= 0) throw new Error('INVALID_EXPIRY_QUANTITY')

      const actualExpired = Math.min(requestedExpiry, batch.quantity)
      const newBatchQty = batch.quantity - actualExpired

      await tx.clinicMaterialBatch.update({
        where: { id: batchId },
        data: { quantity: newBatchQty },
      })

      const material = await tx.clinicMaterial.findUnique({ where: { id: materialId } })
      if (!material) throw new Error('MATERIAL_NOT_FOUND')
      const newMaterialQty = Math.max(0, material.quantity - actualExpired)

      await tx.clinicMaterial.update({
        where: { id: materialId },
        data: { quantity: newMaterialQty },
      })

      // Create expiry record (audit trail)
      const expiry = await tx.clinicMaterialExpiry.create({
        data: {
          batchId,
          materialId,
          quantityExpired: actualExpired,
          expiryDate: new Date(expiryDate),
          disposalMethod,
          recordedBy,
          notes,
        },
      })

      await syncMaterialExpiry(tx, materialId)
      return expiry
    })
  })

  // Log batch adjustment (recount, received, etc.)
  ipcMain.handle('clinic:batches:logAdjustment', async (_e, {
    batchId,
    materialId,
    quantityAfter,
    reason = 'recount',
    description = null,
    adjustedBy = null,
  }: {
    batchId: string
    materialId: string
    quantityBefore: number
    quantityAfter: number
    reason?: string
    description?: string | null
    adjustedBy?: string | null
  }) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')
      if (batch.materialId !== materialId) throw new Error('BATCH_MATERIAL_MISMATCH')

      const targetQty = Math.max(0, Number(quantityAfter) || 0)
      const actualBefore = batch.quantity
      const quantityAdjusted = targetQty - actualBefore

      const material = await tx.clinicMaterial.findUnique({ where: { id: materialId } })
      if (!material) throw new Error('MATERIAL_NOT_FOUND')
      const newMaterialQty = Math.max(0, material.quantity + quantityAdjusted)

      // Create adjustment record (audit trail)
      const adjustment = await tx.clinicMaterialAdjustment.create({
        data: {
          batchId,
          materialId,
          quantityBefore: actualBefore,
          quantityAfter: targetQty,
          quantityAdjusted,
          reason,
          description,
          adjustedBy,
        },
      })

      await tx.clinicMaterialBatch.update({
        where: { id: batchId },
        data: { quantity: targetQty },
      })

      await tx.clinicMaterial.update({
        where: { id: materialId },
        data: { quantity: newMaterialQty },
      })

      await syncMaterialExpiry(tx, materialId)
      return adjustment
    })
  })
}
