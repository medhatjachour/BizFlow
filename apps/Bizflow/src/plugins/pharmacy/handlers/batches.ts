import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { getCurrentUser, requireCap } from '../../../main/ipc/handlers/session'

const log = createLogger('Pharmacy:Batches')

// Fields whose edits are recorded in the product history.
const AUDIT_FIELDS: Array<{ key: string; label: string; type?: 'date' | 'num' }> = [
  { key: 'quantity', label: 'Quantity', type: 'num' },
  { key: 'costPerUnit', label: 'Cost/unit', type: 'num' },
  { key: 'sellingPrice', label: 'Selling price', type: 'num' },
  { key: 'batchNumber', label: 'Lot #' },
  { key: 'expiryDate', label: 'Expiry', type: 'date' },
  { key: 'receivedDate', label: 'Received', type: 'date' }
]

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
      const before = await prisma.pharmacyBatch.findUnique({ where: { id } })
      const patch: any = {}
      if (data.batchNumber !== undefined) patch.batchNumber = data.batchNumber?.trim() || null
      // Stock quantity is intentionally NOT editable here — use
      // pharmacy:batches:adjust so every stock change is a reasoned, audited movement.
      if (data.costPerUnit !== undefined) patch.costPerUnit = Number(data.costPerUnit) || 0
      if (data.sellingPrice !== undefined) patch.sellingPrice = data.sellingPrice != null ? Number(data.sellingPrice) : null
      if (data.expiryDate !== undefined) patch.expiryDate = new Date(data.expiryDate)
      if (data.receivedDate !== undefined) patch.receivedDate = new Date(data.receivedDate)
      if (data.supplierId !== undefined) patch.supplierId = data.supplierId || null
      const updated = await prisma.pharmacyBatch.update({ where: { id }, data: patch })

      // Record an audit entry for the fields that changed (who + when + what).
      try {
        const changes = diffFields(before, updated)
        if (changes.length > 0) {
          const u = getCurrentUser()
          await prisma.pharmacyStockAudit.create({
            data: {
              productId: updated.productId,
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
        log.warn('batches:update audit skipped', auditErr)
      }

      return updated
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

  // Adjust stock (add / remove / set) — the only sanctioned way to change a
  // batch's remaining quantity. Records a PharmacyStockAudit movement
  // (who / when / how much / why). Amount may be given in base units or sub-units.
  ipcMain.handle('pharmacy:batches:adjust', async (_e, id: string, data: {
    mode: 'add' | 'remove' | 'set'; amount: number; unit?: 'base' | 'sub'; reason?: string
  }) => {
    try {
      requireCap('pharmacy_inventory')
      const batch = await prisma.pharmacyBatch.findUnique({ where: { id } })
      if (!batch) throw new Error('Batch not found')

      const mode = data?.mode
      if (!['add', 'remove', 'set'].includes(mode)) throw new Error('Invalid adjustment mode')
      const amount = Number(data?.amount)
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a positive number')
      if ((mode === 'add' || mode === 'remove') && amount <= 0) throw new Error('Amount must be greater than 0')

      const product = await prisma.pharmacyProduct.findUnique({
        where: { id: batch.productId },
        select: { unit: true, subUnit: true, subUnitsPerContainer: true }
      })
      const useSub    = data?.unit === 'sub' && !!product?.subUnitsPerContainer
      const ratio     = useSub ? Number(product!.subUnitsPerContainer) : 1
      const inBase    = amount / ratio
      const unitLabel = useSub ? (product?.subUnit ?? 'sub') : (product?.unit ?? 'unit')

      const current = batch.quantity
      let next: number
      if (mode === 'add') next = current + inBase
      else if (mode === 'remove') {
        if (inBase > current + 0.0001) {
          throw new Error(`Cannot remove ${amount} ${unitLabel} — only ${Math.round(current * ratio * 10000) / 10000} ${unitLabel} on hand`)
        }
        next = current - inBase
      } else next = inBase
      next = Math.max(0, Math.round(next * 10000) / 10000)

      const updated = await prisma.pharmacyBatch.update({
        where: { id },
        data: { quantity: next, status: next > 0 ? 'active' : batch.status }
      })

      try {
        const verb = mode === 'add' ? 'Added' : mode === 'remove' ? 'Removed' : 'Set stock to'
        const desc = `${verb} ${amount} ${unitLabel}`
        const note = data?.reason ? `${desc} — ${data.reason}` : desc
        const u = getCurrentUser()
        await prisma.pharmacyStockAudit.create({
          data: {
            productId:   batch.productId,
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
        log.warn('batches:adjust audit skipped', auditErr)
      }

      return { batch: updated, from: current, to: next }
    } catch (err) { log.error('batches:adjust', err); throw err }
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
