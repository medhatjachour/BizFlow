/**
 * Vet medicine batch (stock lot) handlers.
 *   vet:medicines:getBatches / addBatch / updateBatch / deleteBatch / disposeBatch
 * Split out of medicines.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { getCurrentUser, requireCap } from '../../../main/ipc/handlers/session'

const log = createLogger('Vet:Medicines')

// Fields whose edits are worth recording in the medicine history.
const AUDIT_FIELDS: Array<{ key: string; label: string; type?: 'date' | 'num' }> = [
  { key: 'quantity', label: 'Quantity', type: 'num' },
  { key: 'costPerUnit', label: 'Cost/unit', type: 'num' },
  { key: 'sellingPrice', label: 'Selling price', type: 'num' },
  { key: 'batchNumber', label: 'Lot #' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'expiryDate', label: 'Expiry', type: 'date' },
  { key: 'receivedDate', label: 'Received', type: 'date' },
  { key: 'notes', label: 'Notes' }
]

/** Build a list of {field,label,from,to} for the fields that actually changed. */
function diffFields(before: any, after: any): Array<{ field: string; label: string; from: any; to: any }> {
  const changes: Array<{ field: string; label: string; from: any; to: any }> = []
  for (const f of AUDIT_FIELDS) {
    let b = before?.[f.key]
    let a = after?.[f.key]
    if (f.type === 'date') {
      b = b ? new Date(b).toISOString() : null
      a = a ? new Date(a).toISOString() : null
    }
    const from = b ?? null
    const to = a ?? null
    const same =
      f.type === 'num' ? Number(from || 0) === Number(to || 0) : String(from) === String(to)
    if (!same) changes.push({ field: f.key, label: f.label, from, to })
  }
  return changes
}

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
  // NOTE: stock quantity is intentionally NOT editable here — use
  // vet:medicines:adjustBatchStock so every stock change is a reasoned, audited
  // movement. Any quantity/initialQty in the patch is ignored.
  ipcMain.handle('vet:medicines:updateBatch', async (_e, id: string, data: any) => {
    try {
      const before = await prisma.vetMedicineBatch.findUnique({ where: { id } })
      const { expiryDate, receivedDate, ...rest } = data
      delete rest.quantity
      delete rest.initialQty
      const updated = await prisma.vetMedicineBatch.update({
        where: { id },
        data: {
          ...rest,
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
          ...(receivedDate ? { receivedDate: new Date(receivedDate) } : {})
        }
      })

      // Record an audit entry for the fields that changed (who + when + what).
      try {
        const changes = diffFields(before, updated)
        if (changes.length > 0) {
          const u = getCurrentUser()
          await prisma.vetMedicineAudit.create({
            data: {
              medicineId: updated.medicineId,
              batchId: updated.id,
              batchNumber: updated.batchNumber ?? null,
              action: 'edit_batch',
              changes: JSON.stringify(changes),
              userId: u?.id ?? null,
              userName: u?.username ?? null
            }
          })
        }
      } catch (auditErr) {
        log.warn('updateBatch audit skipped', auditErr)
      }

      return updated
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

  // ─── Adjust Batch Stock (add / remove / set, with reason + audit) ─────────
  // The only sanctioned way to change a batch's remaining quantity. Records a
  // VetMedicineAudit movement (who / when / how much / why). Amount may be given
  // in containers or sub-units.
  ipcMain.handle('vet:medicines:adjustBatchStock', async (_e, batchId: string, data: {
    mode: 'add' | 'remove' | 'set'; amount: number; unit?: 'container' | 'sub'; reason?: string
  }) => {
    try {
      requireCap('vet_medicines')
      const batch = await prisma.vetMedicineBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('Batch not found')

      const mode = data?.mode
      if (!['add', 'remove', 'set'].includes(mode)) throw new Error('Invalid adjustment mode')
      const amount = Number(data?.amount)
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a positive number')
      if ((mode === 'add' || mode === 'remove') && amount <= 0) throw new Error('Amount must be greater than 0')

      const medicine = await prisma.vetMedicine.findUnique({
        where: { id: batch.medicineId },
        select: { unit: true, subUnit: true, subUnitsPerContainer: true }
      })
      const useSub   = data?.unit === 'sub' && !!medicine?.subUnitsPerContainer
      const ratio    = useSub ? (medicine!.subUnitsPerContainer as number) : 1
      const inContainers = amount / ratio
      const unitLabel = useSub ? (medicine?.subUnit ?? 'sub') : (medicine?.unit ?? 'unit')

      const current = batch.quantity
      let next: number
      if (mode === 'add')      next = current + inContainers
      else if (mode === 'remove') {
        if (inContainers > current + 0.0001) {
          throw new Error(`Cannot remove ${amount} ${unitLabel} — only ${Math.round(current * ratio * 10000) / 10000} ${unitLabel} on hand`)
        }
        next = current - inContainers
      } else next = inContainers // 'set' — absolute new quantity
      next = Math.max(0, Math.round(next * 10000) / 10000)

      const updated = await prisma.vetMedicineBatch.update({
        where: { id: batchId },
        data: { quantity: next }
      })

      // Audit the movement so it appears in the medicine history timeline.
      try {
        const verb = mode === 'add' ? 'Added' : mode === 'remove' ? 'Removed' : 'Set stock to'
        const desc = `${verb} ${amount} ${unitLabel}`
        const note = data?.reason ? `${desc} — ${data.reason}` : desc
        const u = getCurrentUser()
        await prisma.vetMedicineAudit.create({
          data: {
            medicineId:  batch.medicineId,
            batchId:     batch.id,
            batchNumber: batch.batchNumber ?? null,
            action:      'adjust_stock',
            changes:     JSON.stringify([{ field: 'quantity', label: 'Quantity', from: current, to: next }]),
            note,
            userId:      u?.id ?? null,
            userName:    u?.username ?? null
          }
        })
      } catch (auditErr) {
        log.warn('adjustBatchStock audit skipped', auditErr)
      }

      return { batch: updated, from: current, to: next }
    } catch (err) { log.error('adjustBatchStock', err); throw err }
  })
}
