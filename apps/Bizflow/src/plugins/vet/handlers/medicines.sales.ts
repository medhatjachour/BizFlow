/**
 * Vet medicine sale operations (mutations): selling, payments, settlement, refunds.
 *   vet:medicines:sell / sellCombo / updateSalePayment / settleOwnerSales
 *   vet:medicines:updateSale / refundSale / refundSaleGroup
 * Split out of medicines.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { requireCap } from '../../../main/ipc/handlers/session'

const log = createLogger('Vet:Medicines')

export function registerVetMedicineSalesHandlers(prisma: any) {
  // ─── Sell from Batch ──────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:sell', async (_e, data: {
    medicineId: string; batchId: string; quantity: number;
    unitPrice: number; discount?: number;
    patientId?: string; patientName?: string;
    paymentMethod?: string; notes?: string; saleDate?: string
  }) => {
    try {
      const batch = await prisma.vetMedicineBatch.findUnique({ where: { id: data.batchId } })
      if (!batch) throw new Error('Batch not found')
      if (batch.status === 'disposed') throw new Error('This batch has been disposed and cannot be sold from')
      if (new Date(batch.expiryDate) < new Date()) {
        throw new Error('Cannot sell from an expired batch — please write it off as a loss first')
      }
      if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
        throw new Error('Quantity must be a positive number')
      }
      if (!Number.isFinite(data.unitPrice) || data.unitPrice < 0) {
        throw new Error('Unit price must be a non-negative number')
      }
      const discount = data.discount ?? 0
      if (discount > 0) requireCap('vet_discount')
      if (!Number.isFinite(discount) || discount < 0) {
        throw new Error('Discount must be a non-negative number')
      }
      if (batch.medicineId !== data.medicineId) {
        throw new Error('Medicine ID does not match the selected batch')
      }
      if (batch.quantity < data.quantity) {
        throw new Error(`Insufficient stock. Available: ${batch.quantity}`)
      }
      const totalPrice  = Math.max(0, data.quantity * data.unitPrice - discount)

      const [sale] = await prisma.$transaction([
        prisma.vetMedicineSale.create({
          data: {
            medicineId:    data.medicineId,
            batchId:       data.batchId,
            quantity:      data.quantity,
            unitPrice:     data.unitPrice,
            totalPrice,
            discount,
            patientId:     data.patientId ?? null,
            patientName:   data.patientName ?? null,
            paymentMethod: data.paymentMethod ?? null,
            notes:         data.notes ?? null,
            saleDate:      data.saleDate ? new Date(data.saleDate) : new Date()
          }
        }),
        prisma.vetMedicineBatch.update({
          where: { id: data.batchId },
          data:  { quantity: { decrement: data.quantity } }
        })
      ])

      return sale
    } catch (err) { log.error('sell', err); throw err }
  })

  // ─── Sell Combo (multi-item cart) ─────────────────────────────────────────
  ipcMain.handle('vet:medicines:sellCombo', async (_e, data: {
    items: Array<{
      medicineId: string; batchId: string; quantity: number;
      unitPrice: number; discount?: number; saleUnit?: string
    }>
    ownerId?: string; ownerName?: string;
    paymentMethod?: string; notes?: string; saleDate?: string;
    amountPaid?: number; cartDiscount?: number
  }) => {
    try {
      if (!data.items || data.items.length === 0) throw new Error('No items in cart')
      if ((Number(data.cartDiscount) || 0) > 0 || data.items.some(it => (Number(it.discount) || 0) > 0)) requireCap('vet_discount')

      // One receipt id ties every line item of this checkout together so the
      // sales history can show them grouped as a single transaction.
      const saleGroupId = (globalThis.crypto?.randomUUID?.() ?? `grp_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      const saleDate = data.saleDate ? new Date(data.saleDate) : new Date()
      // A cart-wide discount is spread proportionally across every line item so
      // each stored row's discount/total stays internally consistent.
      const grossCart = data.items.reduce((s, it) =>
        s + Math.max(0, it.quantity * it.unitPrice - (it.discount ?? 0)), 0)
      const cartDiscount = Math.min(Math.max(0, data.cartDiscount ?? 0), grossCart)
      const totalCart = Math.max(0, grossCart - cartDiscount)
      let amountPaid = data.amountPaid != null ? data.amountPaid : totalCart
      // Validate and clamp amountPaid to [0, totalCart]
      if (isNaN(amountPaid) || amountPaid < 0) amountPaid = 0
      if (amountPaid > totalCart) amountPaid = totalCart
      const paymentStatus = amountPaid >= totalCart - 0.005 ? 'paid'
        : amountPaid > 0 ? 'partial' : 'unpaid'

      // Validate all items first
      for (const it of data.items) {
        const batch = await prisma.vetMedicineBatch.findUnique({ where: { id: it.batchId } })
        if (!batch) throw new Error(`Batch not found: ${it.batchId}`)
        if (batch.status === 'disposed') throw new Error(`Batch ${it.batchId} has been disposed`)
        if (new Date(batch.expiryDate) < new Date()) throw new Error(`Batch ${batch.batchNumber ?? it.batchId} is expired — write it off first`)
        if (batch.medicineId !== it.medicineId) throw new Error('Medicine/batch mismatch')

        // Convert quantity to container units for stock deduction
        const medicine = await prisma.vetMedicine.findUnique({ where: { id: it.medicineId } })
        const deductQty = (it.saleUnit === 'sub' && medicine?.subUnitsPerContainer)
          ? it.quantity / medicine.subUnitsPerContainer
          : it.quantity
        if (batch.quantity < deductQty - 0.0001) {
          throw new Error(`Insufficient stock for ${medicine?.name ?? it.medicineId}. Available: ${batch.quantity}`)
        }
      }

      // Run everything in a single transaction
      const sales = await prisma.$transaction(async (tx: any) => {
        const created: any[] = []
        for (const it of data.items) {
          const medicine = await tx.vetMedicine.findUnique({ where: { id: it.medicineId } })
          const deductQty = (it.saleUnit === 'sub' && medicine?.subUnitsPerContainer)
            ? it.quantity / medicine.subUnitsPerContainer
            : it.quantity

          const itemGross  = Math.max(0, it.quantity * it.unitPrice - (it.discount ?? 0))
          const itemCartDisc = grossCart > 0 ? cartDiscount * (itemGross / grossCart) : 0
          const disc       = (it.discount ?? 0) + itemCartDisc
          const totalPrice = Math.max(0, it.quantity * it.unitPrice - disc)
          // Distribute amountPaid proportionally across items
          const itemFraction = totalCart > 0 ? totalPrice / totalCart : 1
          const itemPaid = amountPaid * itemFraction

          const sale = await tx.vetMedicineSale.create({
            data: {
              medicineId:    it.medicineId,
              batchId:       it.batchId,
              quantity:      it.quantity,
              unitPrice:     it.unitPrice,
              totalPrice,
              discount:      disc,
              saleGroupId,
              saleUnit:      it.saleUnit ?? 'container',
              ownerId:       data.ownerId    ?? null,
              ownerName:     data.ownerName  ?? null,
              paymentMethod: data.paymentMethod ?? null,
              amountPaid:    itemPaid,
              paymentStatus,
              notes:         data.notes ?? null,
              saleDate,
            }
          })
          // Atomic conditional update: fail if insufficient stock (prevents race condition)
          const updated = await tx.vetMedicineBatch.updateMany({
            where: { id: it.batchId, quantity: { gte: deductQty - 0.0001 } },
            data:  { quantity: { decrement: deductQty } }
          })
          if (updated.count !== 1) throw new Error('Insufficient stock (batch quantity changed)')
          created.push(sale)
        }
        return created
      })

      return { count: sales.length, saleGroupId, sales }
    } catch (err) { log.error('sellCombo', err); throw err }
  })

  // ─── Update Sale Payment ───────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:updateSalePayment', async (_e, id: string, amountPaid: number) => {
    try {
      const sale = await prisma.vetMedicineSale.findUnique({ where: { id } })
      if (!sale) throw new Error('Sale not found')
      // Validate and clamp amountPaid to [0, totalPrice]
      let validAmount = amountPaid
      if (isNaN(validAmount) || validAmount < 0) validAmount = 0
      if (validAmount > sale.totalPrice) validAmount = sale.totalPrice
      const status = validAmount >= sale.totalPrice - 0.005 ? 'paid'
        : validAmount > 0 ? 'partial' : 'unpaid'
      return await prisma.vetMedicineSale.update({
        where: { id },
        data: { amountPaid: validAmount, paymentStatus: status }
      })
    } catch (err) { log.error('updateSalePayment', err); throw err }
  })

  // ─── Settle an owner's outstanding pharmacy sales (full or partial) ───────
  // Applies a payment across the owner's unpaid/partial medicine sales,
  // oldest first. Separate from clinical session settlement.
  ipcMain.handle('vet:medicines:settleOwnerSales', async (_e, ownerId: string, data?: {
    amount?: number
  }) => {
    try {
      if (!ownerId) throw new Error('ownerId is required')
      const sales = await prisma.vetMedicineSale.findMany({
        where: { ownerId, status: { not: 'refunded' } },
        orderBy: { saleDate: 'asc' }
      })
      let budget = (data?.amount != null && Number.isFinite(data.amount)) ? Math.max(0, data.amount) : Number.POSITIVE_INFINITY
      let applied = 0
      let settledCount = 0
      await prisma.$transaction(async (tx: any) => {
        for (const s of sales) {
          if (budget <= 0.005) break
          const refunded = s.refundedAmount ?? 0
          const net  = Math.max(0, (s.totalPrice ?? 0) - refunded)
          const paid = Math.min(s.amountPaid ?? s.totalPrice ?? 0, net)
          const outstanding = Math.max(0, net - paid)
          if (outstanding <= 0.005) continue
          const pay = Math.min(outstanding, budget)
          const newPaid = paid + pay
          const status = newPaid >= net - 0.005 ? 'paid' : 'partial'
          await tx.vetMedicineSale.update({ where: { id: s.id }, data: { amountPaid: newPaid, paymentStatus: status } })
          budget -= pay; applied += pay
          if (status === 'paid') settledCount++
        }
      })
      return { applied: Math.round(applied * 100) / 100, settledCount }
    } catch (err) { log.error('settleOwnerSales', err); throw err }
  })

  // ─── Update a Sale (edit qty / price / discount / payment) ────────────────
  ipcMain.handle('vet:medicines:updateSale', async (_e, id: string, data: {
    quantity?: number; unitPrice?: number; discount?: number;
    paymentMethod?: string; notes?: string; amountPaid?: number
  }) => {
    try {
      const sale = await prisma.vetMedicineSale.findUnique({ where: { id } })
      if (!sale) throw new Error('Sale not found')
      if (sale.status === 'refunded') throw new Error('Refunded sales cannot be edited')

      const medicine = await prisma.vetMedicine.findUnique({ where: { id: sale.medicineId } })
      const ratio = (sale.saleUnit === 'sub' && medicine?.subUnitsPerContainer) ? medicine.subUnitsPerContainer : 1

      const newQty   = data.quantity  != null ? data.quantity  : sale.quantity
      const newPrice = data.unitPrice != null ? data.unitPrice : sale.unitPrice
      const newDisc  = data.discount  != null ? data.discount  : sale.discount
      if (!Number.isFinite(newQty) || newQty <= 0) throw new Error('Quantity must be positive')
      if (!Number.isFinite(newPrice) || newPrice < 0) throw new Error('Unit price must be non-negative')
      if (!Number.isFinite(newDisc) || newDisc < 0) throw new Error('Discount must be non-negative')

      // Stock delta in container units (positive = need more stock).
      const oldContainerQty = sale.quantity / ratio
      const newContainerQty = newQty / ratio
      const deltaContainers = newContainerQty - oldContainerQty

      const newTotal = Math.max(0, newQty * newPrice - newDisc)
      let amountPaid = data.amountPaid != null ? data.amountPaid : (sale.amountPaid ?? sale.totalPrice)
      if (isNaN(amountPaid) || amountPaid < 0) amountPaid = 0
      if (amountPaid > newTotal) amountPaid = newTotal
      const paymentStatus = amountPaid >= newTotal - 0.005 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'

      const updated = await prisma.$transaction(async (tx: any) => {
        if (Math.abs(deltaContainers) > 0.0001) {
          if (deltaContainers > 0) {
            // Need to pull more units from the batch — verify availability.
            const ok = await tx.vetMedicineBatch.updateMany({
              where: { id: sale.batchId, quantity: { gte: deltaContainers - 0.0001 } },
              data:  { quantity: { decrement: deltaContainers } }
            })
            if (ok.count !== 1) throw new Error('Insufficient batch stock for the new quantity')
          } else {
            // Returning units to the batch.
            await tx.vetMedicineBatch.update({
              where: { id: sale.batchId },
              data:  { quantity: { increment: -deltaContainers } }
            })
          }
        }
        return tx.vetMedicineSale.update({
          where: { id },
          data: {
            quantity:      newQty,
            unitPrice:     newPrice,
            discount:      newDisc,
            totalPrice:    newTotal,
            amountPaid,
            paymentStatus,
            paymentMethod: data.paymentMethod ?? sale.paymentMethod,
            notes:         data.notes !== undefined ? data.notes : sale.notes,
          }
        })
      })
      return updated
    } catch (err) { log.error('updateSale', err); throw err }
  })

  // ─── Refund a Sale (full or partial) ──────────────────────────────────────
  // Returns the refunded quantity to its batch and records the refund on the row.
  ipcMain.handle('vet:medicines:refundSale', async (_e, id: string, data?: {
    quantity?: number; reason?: string
  }) => {
    try {
      requireCap('vet_refund')
      const sale = await prisma.vetMedicineSale.findUnique({ where: { id } })
      if (!sale) throw new Error('Sale not found')
      const alreadyRefunded = sale.refundedQty ?? 0
      const refundable = sale.quantity - alreadyRefunded
      if (refundable <= 0.0001) throw new Error('This sale has already been fully refunded')

      const qty = data?.quantity != null ? data.quantity : refundable
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Refund quantity must be positive')
      if (qty > refundable + 0.0001) throw new Error(`Only ${refundable} unit(s) can still be refunded`)

      const medicine = await prisma.vetMedicine.findUnique({ where: { id: sale.medicineId } })
      const ratio = (sale.saleUnit === 'sub' && medicine?.subUnitsPerContainer) ? medicine.subUnitsPerContainer : 1
      const restockContainers = qty / ratio

      // Money returned for this quantity, proportional to the line total.
      const refundAmount = sale.quantity > 0
        ? Math.round((qty / sale.quantity) * sale.totalPrice * 100) / 100
        : 0
      const newRefundedQty    = alreadyRefunded + qty
      const newRefundedAmount = (sale.refundedAmount ?? 0) + refundAmount
      const fullyRefunded     = newRefundedQty >= sale.quantity - 0.0001

      const result = await prisma.$transaction(async (tx: any) => {
        await tx.vetMedicineBatch.update({
          where: { id: sale.batchId },
          data:  { quantity: { increment: restockContainers } }
        })
        return tx.vetMedicineSale.update({
          where: { id },
          data: {
            refundedQty:    newRefundedQty,
            refundedAmount: newRefundedAmount,
            refundedAt:     new Date(),
            refundReason:   data?.reason ?? sale.refundReason ?? 'Customer refund',
            status:         fullyRefunded ? 'refunded' : 'partially_refunded',
          }
        })
      })
      return { sale: result, refundAmount, restockedQty: restockContainers }
    } catch (err) { log.error('refundSale', err); throw err }
  })

  // ─── Refund an entire Transaction (all items in a sale group) ─────────────
  ipcMain.handle('vet:medicines:refundSaleGroup', async (_e, groupKey: string, data?: {
    reason?: string
  }) => {
    try {
      requireCap('vet_refund')
      if (!groupKey) throw new Error('groupKey is required')
      const lines = await prisma.vetMedicineSale.findMany({
        where: { OR: [{ saleGroupId: groupKey }, { id: groupKey }] }
      })
      if (lines.length === 0) throw new Error('Transaction not found')

      let totalRefund = 0
      await prisma.$transaction(async (tx: any) => {
        for (const sale of lines) {
          const alreadyRefunded = sale.refundedQty ?? 0
          const refundable = sale.quantity - alreadyRefunded
          if (refundable <= 0.0001) continue
          const medicine = await tx.vetMedicine.findUnique({ where: { id: sale.medicineId } })
          const ratio = (sale.saleUnit === 'sub' && medicine?.subUnitsPerContainer) ? medicine.subUnitsPerContainer : 1
          const refundAmount = sale.quantity > 0
            ? Math.round((refundable / sale.quantity) * sale.totalPrice * 100) / 100
            : 0
          totalRefund += refundAmount
          await tx.vetMedicineBatch.update({
            where: { id: sale.batchId },
            data:  { quantity: { increment: refundable / ratio } }
          })
          await tx.vetMedicineSale.update({
            where: { id: sale.id },
            data: {
              refundedQty:    sale.quantity,
              refundedAmount: (sale.refundedAmount ?? 0) + refundAmount,
              refundedAt:     new Date(),
              refundReason:   data?.reason ?? 'Transaction refund',
              status:         'refunded',
            }
          })
        }
      })
      return { count: lines.length, totalRefund }
    } catch (err) { log.error('refundSaleGroup', err); throw err }
  })
}
