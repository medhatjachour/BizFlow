/**
 * Vet medicine batch (stock lot) handlers.
 *   vet:medicines:getBatches / addBatch / updateBatch / deleteBatch / disposeBatch
 * Split out of medicines.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Medicines')

export function registerVetMedicineBatchHandlers(prisma: any) {
  // ─── Get Batches for a Medicine ───────────────────────────────────────────
  ipcMain.handle('vet:medicines:getBatches', async (_e, medicineId: string) => {
    try {
      return await prisma.vetMedicineBatch.findMany({
        where: { medicineId },
        orderBy: { expiryDate: 'asc' } // FEFO — First Expired, First Out
      })
    } catch (err) { log.error('getBatches', err); throw err }
  })

  // ─── Add Batch ────────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:addBatch', async (_e, data: {
    medicineId: string; batchNumber?: string; supplier?: string;
    expiryDate: string; quantity: number; costPerUnit?: number;
    receivedDate?: string; notes?: string
  }) => {
    try {
      const { expiryDate, receivedDate, quantity, ...rest } = data
      return await prisma.vetMedicineBatch.create({
        data: {
          ...rest,
          quantity,
          initialQty: quantity,
          expiryDate: new Date(expiryDate),
          receivedDate: receivedDate ? new Date(receivedDate) : new Date()
        }
      })
    } catch (err) { log.error('addBatch', err); throw err }
  })

  // ─── Update Batch ─────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:updateBatch', async (_e, id: string, data: any) => {
    try {
      const { expiryDate, receivedDate, ...rest } = data
      return await prisma.vetMedicineBatch.update({
        where: { id },
        data: {
          ...rest,
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
          ...(receivedDate ? { receivedDate: new Date(receivedDate) } : {})
        }
      })
    } catch (err) { log.error('updateBatch', err); throw err }
  })

  // ─── Delete Batch ─────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:deleteBatch', async (_e, id: string) => {
    try {
      await prisma.vetMedicineBatch.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('deleteBatch', err); throw err }
  })

  // ─── Dispose (Write-Off) Expired Batch ───────────────────────────────────
  // Marks the batch as disposed, zeroes the remaining stock, and creates a
  // VetExpense record so the loss shows in the financial reports.
  ipcMain.handle('vet:medicines:disposeBatch', async (_e, batchId: string, data?: {
    reason?: string; disposedQty?: number
  }) => {
    try {
      const batch = await prisma.vetMedicineBatch.findUnique({
        where: { id: batchId },
        include: { medicine: { select: { name: true, unit: true } } }
      })
      if (!batch) throw new Error('Batch not found')
      if (batch.status === 'disposed') throw new Error('Batch already disposed')

      const writeOffQty = data?.disposedQty ?? batch.quantity
      if (!Number.isFinite(writeOffQty) || writeOffQty < 0 || writeOffQty > batch.quantity) {
        throw new Error(`Invalid disposedQty: must be between 0 and ${batch.quantity}`)
      }
      const lossAmount   = writeOffQty * (batch.costPerUnit ?? 0)
      const lotLabel     = batch.batchNumber ? ` LOT-${batch.batchNumber}` : ''
      const description  = `Medicine write-off: ${batch.medicine.name}${lotLabel} (expired stock)`

      const [updatedBatch, expense] = await prisma.$transaction([
        prisma.vetMedicineBatch.update({
          where: { id: batchId },
          data: {
            status:         'disposed',
            disposedAt:     new Date(),
            disposedQty:    writeOffQty,
            disposalReason: data?.reason ?? 'Expired batch disposal',
            quantity:       0
          }
        }),
        prisma.vetExpense.create({
          data: {
            date:          new Date(),
            category:      'medications',
            description,
            amount:        lossAmount,
            vendor:        batch.supplier ?? undefined,
            paymentMethod: null,
            recurrence:    'one_time',
            notes:         data?.reason ?? 'Expired stock written off'
          }
        })
      ])

      return { batch: updatedBatch, expense, lossAmount }
    } catch (err) { log.error('disposeBatch', err); throw err }
  })
}
