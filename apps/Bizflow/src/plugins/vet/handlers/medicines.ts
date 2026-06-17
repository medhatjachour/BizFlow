/**
 * Vet Medicines IPC Handlers
 *
 * Endpoints:
 *   vet:medicines:getAll       – paginated medicine catalogue with stock totals
 *   vet:medicines:create       – create a new medicine entry
 *   vet:medicines:update       – update medicine fields
 *   vet:medicines:delete       – delete medicine (cascades batches + sales)
 *   vet:medicines:getBatches   – get all batches for a medicine (FEFO order)
 *   vet:medicines:addBatch     – receive a new stock batch
 *   vet:medicines:updateBatch  – edit a batch (qty / expiry / etc.)
 *   vet:medicines:deleteBatch  – remove a batch
 *   vet:medicines:sell         – record a sale from a specific batch
 *   vet:medicines:getSales     – paginated sale history with filters
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Medicines')

export function registerVetMedicineHandlers(prisma: any) {
  // ─── Get All Medicines ───────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:getAll', async (_e, params?: {
    search?: string; category?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.search) {
        where.OR = [
          { name: { contains: params.search } },
          { description: { contains: params.search } }
        ]
      }
      if (params?.category && params.category !== 'all') {
        where.category = params.category
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetMedicine.count({ where })

      const medicines = await prisma.vetMedicine.findMany({
        where,
        include: {
          batches: {
            orderBy: { expiryDate: 'asc' },
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
              quantity: true,
              initialQty: true,
              costPerUnit: true,
              receivedDate: true,
              supplier: true,
              notes: true,
              createdAt: true
            }
          },
          _count: { select: { sales: true } }
        },
        orderBy: { name: 'asc' },
        skip,
        take
      })

      // Compute aggregated stock and expiry info per medicine
      const enriched = medicines.map((m: any) => {
        const now = new Date()
        const activeBatches = m.batches.filter((b: any) => b.quantity > 0)
        const totalStock = activeBatches.reduce((sum: number, b: any) => sum + b.quantity, 0)
        const nearestExpiry = activeBatches.length > 0 ? activeBatches[0].expiryDate : null
        const hasExpired = m.batches.some((b: any) =>
          new Date(b.expiryDate) < now && b.quantity > 0
        )
        const expiresWithin30Days = m.batches.some((b: any) => {
          const exp = new Date(b.expiryDate)
          const diff = (exp.getTime() - now.getTime()) / 86400000
          return diff >= 0 && diff <= 30 && b.quantity > 0
        })

        return {
          ...m,
          totalStock,
          nearestExpiry,
          hasExpired,
          expiresWithin30Days,
          batchCount: m.batches.length,
          activeBatchCount: activeBatches.length,
          salesCount: m._count.sales,
          isLowStock: totalStock <= m.minimumStock && m.minimumStock > 0
        }
      })

      return { data: enriched, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Create Medicine ──────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:create', async (_e, data: {
    name: string; category?: string; unit?: string;
    description?: string; minimumStock?: number
  }) => {
    try {
      return await prisma.vetMedicine.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Update Medicine ──────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:update', async (_e, id: string, data: any) => {
    try {
      return await prisma.vetMedicine.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete Medicine ──────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:delete', async (_e, id: string) => {
    try {
      await prisma.vetMedicine.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })

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
      if (!Number.isFinite(discount) || discount < 0) {
        throw new Error('Discount must be a non-negative number')
      }
      if (batch.medicineId !== data.medicineId) {
        throw new Error('Medicine ID does not match the selected batch')
      }
      if (batch.quantity < data.quantity) {
        throw new Error(`Insufficient stock. Available: ${batch.quantity}`)
      }
      const totalPrice  = data.quantity * data.unitPrice - discount

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

  // ─── Get Sales ────────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:getSales', async (_e, params?: {
    medicineId?: string; patientId?: string; search?: string; category?: string;
    from?: string; to?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.medicineId) where.medicineId = params.medicineId
      if (params?.patientId)  where.patientId  = params.patientId
      if (params?.category && params.category !== 'all') {
        where.medicine = { is: { category: params.category } }
      }
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [
          { ownerName:   { contains: q } },
          { patientName: { contains: q } },
          { notes:       { contains: q } },
          { medicine: { is: { name: { contains: q } } } },
          { batch:    { is: { batchNumber: { contains: q } } } },
        ]
      }
      if (params?.from || params?.to) {
        where.saleDate = {}
        if (params.from) where.saleDate.gte = new Date(params.from)
        // Inclusive end-of-day so same-day sales are not dropped.
        if (params.to)   where.saleDate.lte = new Date(new Date(params.to).getTime() + 86_399_999)
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetMedicineSale.count({ where })
      const data  = await prisma.vetMedicineSale.findMany({
        where,
        include: {
          medicine: { select: { id: true, name: true, unit: true, subUnit: true, subUnitsPerContainer: true, category: true } },
          batch:    { select: { id: true, batchNumber: true, expiryDate: true, costPerUnit: true } }
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take
      })

      // Enrich each sale with costTotal and grossProfit
      const enriched = data.map((s: any) => ({
        ...s,
        costPerUnit: s.batch?.costPerUnit ?? 0,
        costTotal:   s.quantity * (s.batch?.costPerUnit ?? 0),
        grossProfit: s.totalPrice - s.quantity * (s.batch?.costPerUnit ?? 0)
      }))

      return { data: enriched, total, hasMore: skip + take < total }
    } catch (err) { log.error('getSales', err); throw err }
  })

  // ─── Get Sales Grouped by Transaction (combined receipts) ─────────────────
  // Returns paginated "transactions": every line item sharing a saleGroupId is
  // one transaction; legacy single sales (saleGroupId = NULL) form their own
  // one-item transaction keyed by their row id.
  ipcMain.handle('vet:medicines:getSaleGroups', async (_e, params?: {
    from?: string; to?: string; search?: string; category?: string; skip?: number; take?: number
  }) => {
    try {
      const conditions: string[] = []
      const filterArgs: any[] = []
      if (params?.from) { conditions.push('s.saleDate >= ?'); filterArgs.push(new Date(params.from)) }
      if (params?.to)   { conditions.push('s.saleDate <= ?'); filterArgs.push(new Date(new Date(params.to).getTime() + 86_399_999)) }
      if (params?.category && params.category !== 'all') { conditions.push('m.category = ?'); filterArgs.push(params.category) }
      if (params?.search?.trim()) {
        const like = `%${params.search.trim()}%`
        conditions.push('(s.ownerName LIKE ? OR s.patientName LIKE ? OR s.notes LIKE ? OR m.name LIKE ? OR b.batchNumber LIKE ?)')
        filterArgs.push(like, like, like, like, like)
      }
      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      // A transaction matches if ANY of its line items matches the filters; the
      // aggregation then sums EVERY item of those matched transactions.
      const matchedCte = `
        WITH matched AS (
          SELECT DISTINCT COALESCE(s.saleGroupId, s.id) as gk
          FROM VetMedicineSale s
          JOIN VetMedicineBatch b ON s.batchId = b.id
          LEFT JOIN VetMedicine m ON s.medicineId = m.id
          ${whereSql}
        )`

      const skip = params?.skip ?? 0
      const take = params?.take ?? 15

      // Distinct transaction count for pagination
      const countRows = await prisma.$queryRawUnsafe(
        `${matchedCte} SELECT COUNT(*) as cnt FROM matched`,
        ...filterArgs
      ) as any[]
      const total = Number(countRows[0]?.cnt) || 0

      // One row per transaction with aggregates, newest first
      const groupRows = await prisma.$queryRawUnsafe(`
        ${matchedCte}
        SELECT
          COALESCE(s.saleGroupId, s.id)              as groupKey,
          MAX(s.saleDate)                            as saleDate,
          COUNT(*)                                   as itemCount,
          CAST(COALESCE(SUM(s.totalPrice), 0) AS REAL)             as total,
          CAST(COALESCE(SUM(s.discount), 0) AS REAL)               as discount,
          CAST(COALESCE(SUM(COALESCE(s.amountPaid, s.totalPrice)), 0) AS REAL) as paid,
          CAST(COALESCE(SUM(s.quantity * b.costPerUnit), 0) AS REAL) as cost,
          CAST(COALESCE(SUM(COALESCE(s.refundedAmount, 0)), 0) AS REAL) as refunded,
          CAST(SUM(CASE WHEN s.status = 'refunded' THEN 1 ELSE 0 END) AS INTEGER) as refundedCount
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        WHERE COALESCE(s.saleGroupId, s.id) IN (SELECT gk FROM matched)
        GROUP BY groupKey
        ORDER BY saleDate DESC
        LIMIT ? OFFSET ?
      `, ...filterArgs, take, skip) as any[]

      const keys: string[] = groupRows.map((g: any) => g.groupKey)

      // Fetch every line item belonging to the transactions on this page
      const items = keys.length === 0 ? [] : await prisma.vetMedicineSale.findMany({
        where: { OR: [{ saleGroupId: { in: keys } }, { id: { in: keys } }] },
        include: {
          medicine: { select: { id: true, name: true, unit: true, subUnit: true, subUnitsPerContainer: true, category: true } },
          batch:    { select: { id: true, batchNumber: true, expiryDate: true, costPerUnit: true } }
        },
        orderBy: { createdAt: 'asc' }
      })

      const itemsByKey = new Map<string, any[]>()
      for (const it of items as any[]) {
        const key = it.saleGroupId ?? it.id
        const enriched = {
          ...it,
          costPerUnit: it.batch?.costPerUnit ?? 0,
          costTotal:   it.quantity * (it.batch?.costPerUnit ?? 0),
          grossProfit: it.totalPrice - it.quantity * (it.batch?.costPerUnit ?? 0)
        }
        if (!itemsByKey.has(key)) itemsByKey.set(key, [])
        itemsByKey.get(key)!.push(enriched)
      }

      const groups = groupRows.map((g: any) => {
        const groupItems = itemsByKey.get(g.groupKey) ?? []
        const first = groupItems[0] ?? {}
        const totalVal = Number(g.total) || 0
        const refundedVal = Number(g.refunded) || 0
        const refundedCount = Number(g.refundedCount) || 0
        const paidVal  = Number(g.paid)  || 0
        const remaining = Math.max(0, totalVal - refundedVal - paidVal)
        const itemCount = Number(g.itemCount) || groupItems.length
        const txStatus = refundedCount >= itemCount ? 'refunded'
          : refundedCount > 0 ? 'partially_refunded' : 'completed'
        const status = remaining <= 0.005 ? 'paid' : paidVal > 0 ? 'partial' : 'unpaid'
        return {
          groupKey:      g.groupKey,
          saleGroupId:   first.saleGroupId ?? null,
          // Use the line item's real Date — the raw MAX(saleDate) comes back as a
          // BigInt (epoch ms) and would crash `new Date(...)` in the renderer.
          saleDate:      first.saleDate ?? (g.saleDate != null ? new Date(Number(g.saleDate)) : null),
          itemCount,
          total:         totalVal,
          discount:      Number(g.discount) || 0,
          cost:          Number(g.cost) || 0,
          grossProfit:   (totalVal - refundedVal) - (Number(g.cost) || 0),
          paid:          paidVal,
          remaining,
          refunded:      refundedVal,
          refundedCount,
          txStatus,
          paymentStatus: status,
          ownerId:       first.ownerId ?? null,
          ownerName:     first.ownerName ?? first.patientName ?? null,
          paymentMethod: first.paymentMethod ?? null,
          notes:         first.notes ?? null,
          items:         groupItems
        }
      })

      return { data: groups, total, hasMore: skip + take < total }
    } catch (err) { log.error('getSaleGroups', err); throw err }
  })

  // ─── Medicine History (timeline: batches received, sales, write-offs) ─────
  // Builds a unified, date-stamped activity log for a single medicine so the
  // user can audit every stock movement that ever happened to it.
  ipcMain.handle('vet:medicines:getHistory', async (_e, medicineId: string, params?: {
    from?: string; to?: string
  }) => {
    try {
      if (!medicineId) throw new Error('medicineId is required')
      const fromDate = params?.from ? new Date(params.from) : null
      // Treat `to` as inclusive end-of-day so same-day events aren't dropped.
      const toDate   = params?.to   ? new Date(new Date(params.to).getTime() + 86_399_999) : null
      const inRange  = (d: Date) =>
        (!fromDate || d >= fromDate) && (!toDate || d <= toDate)

      const medicine = await prisma.vetMedicine.findUnique({
        where: { id: medicineId },
        select: { id: true, name: true, unit: true, subUnit: true, category: true, minimumStock: true }
      })
      if (!medicine) throw new Error('Medicine not found')

      const batches = await prisma.vetMedicineBatch.findMany({
        where: { medicineId },
        orderBy: { receivedDate: 'desc' }
      })
      const sales = await prisma.vetMedicineSale.findMany({
        where: { medicineId },
        include: { batch: { select: { batchNumber: true, costPerUnit: true } } },
        orderBy: { saleDate: 'desc' }
      })

      const events: any[] = []

      for (const b of batches as any[]) {
        // Stock received
        events.push({
          id:        `recv_${b.id}`,
          type:      'received',
          date:      b.receivedDate,
          batchId:   b.id,
          batchNumber: b.batchNumber ?? null,
          quantity:  b.initialQty,
          unit:      medicine.unit,
          costPerUnit: b.costPerUnit ?? 0,
          totalCost: (b.initialQty ?? 0) * (b.costPerUnit ?? 0),
          supplier:  b.supplier ?? null,
          expiryDate: b.expiryDate,
          notes:     b.notes ?? null
        })
        // Write-off / disposal
        if (b.status === 'disposed' && b.disposedAt) {
          events.push({
            id:        `disp_${b.id}`,
            type:      'disposed',
            date:      b.disposedAt,
            batchId:   b.id,
            batchNumber: b.batchNumber ?? null,
            quantity:  b.disposedQty ?? 0,
            unit:      medicine.unit,
            costPerUnit: b.costPerUnit ?? 0,
            lossAmount: (b.disposedQty ?? 0) * (b.costPerUnit ?? 0),
            reason:    b.disposalReason ?? null
          })
        }
      }

      for (const s of sales as any[]) {
        events.push({
          id:        `sale_${s.id}`,
          type:      'sold',
          date:      s.saleDate,
          saleId:    s.id,
          saleGroupId: s.saleGroupId ?? null,
          batchId:   s.batchId,
          batchNumber: s.batch?.batchNumber ?? null,
          quantity:  s.quantity,
          saleUnit:  s.saleUnit ?? 'container',
          unit:      medicine.unit,
          subUnit:   medicine.subUnit ?? null,
          unitPrice: s.unitPrice,
          discount:  s.discount ?? 0,
          totalPrice: s.totalPrice,
          costPerUnit: s.batch?.costPerUnit ?? 0,
          grossProfit: s.totalPrice - s.quantity * (s.batch?.costPerUnit ?? 0),
          ownerName: s.ownerName ?? s.patientName ?? null,
          paymentStatus: s.paymentStatus ?? 'paid'
        })
      }

      const filtered = events
        .filter(e => e.date && inRange(new Date(e.date)))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Summary across the (date-filtered) timeline
      const summary = {
        totalReceived: filtered.filter(e => e.type === 'received').reduce((s, e) => s + (e.quantity || 0), 0),
        totalSold:     filtered.filter(e => e.type === 'sold').reduce((s, e) => {
          // Normalise sub-unit sales back to container units for an apples-to-apples figure
          const q = e.saleUnit === 'sub' && medicine.subUnit ? 0 : (e.quantity || 0)
          return s + q
        }, 0),
        totalDisposed: filtered.filter(e => e.type === 'disposed').reduce((s, e) => s + (e.quantity || 0), 0),
        salesRevenue:  filtered.filter(e => e.type === 'sold').reduce((s, e) => s + (e.totalPrice || 0), 0),
        salesProfit:   filtered.filter(e => e.type === 'sold').reduce((s, e) => s + (e.grossProfit || 0), 0),
        disposalLoss:  filtered.filter(e => e.type === 'disposed').reduce((s, e) => s + (e.lossAmount || 0), 0),
        eventCount:    filtered.length
      }

      return { medicine, events: filtered, summary }
    } catch (err) { log.error('getHistory', err); throw err }
  })

  // ─── Medicine Sales Summary (cost / revenue / profit) ────────────────────
  ipcMain.handle('vet:medicines:getSummary', async (_e, params?: {
    from?: string; to?: string
  }) => {
    try {
      const from = params?.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const to   = params?.to   ? new Date(params.to)   : new Date()

      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*)                                                  as saleCount,
          CAST(COALESCE(SUM(s.quantity), 0) AS REAL)                            as unitsSold,
          CAST(COALESCE(SUM(s.totalPrice), 0) AS REAL)                           as revenue,
          CAST(COALESCE(SUM(s.quantity * b.costPerUnit), 0) AS REAL)             as costOfGoods,
          CAST(COALESCE(SUM(s.totalPrice - s.quantity * b.costPerUnit), 0) AS REAL) as grossProfit
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
      `, from, to) as any[]

      const topRows = await prisma.$queryRawUnsafe(`
        SELECT
          m.id, m.name, m.unit,
          COUNT(*)                             as saleCount,
          CAST(COALESCE(SUM(s.totalPrice), 0) AS REAL)       as revenue,
          CAST(COALESCE(SUM(s.quantity * b.costPerUnit), 0) AS REAL) as costOfGoods
        FROM VetMedicineSale s
        JOIN VetMedicine m ON s.medicineId = m.id
        JOIN VetMedicineBatch b ON s.batchId = b.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
        GROUP BY m.id, m.name, m.unit
        ORDER BY revenue DESC
        LIMIT 10
      `, from, to) as any[]

      const r          = rows[0] ?? {}
      const revenue    = Number(r.revenue)    || 0
      const costOfGoods = Number(r.costOfGoods) || 0
      const grossProfit = Number(r.grossProfit) || 0
      const margin      = revenue > 0 ? (grossProfit / revenue) * 100 : 0
      const unitsSold   = Number(r.unitsSold) || 0

      // Pharmacy receivables: net (after refunds) minus amount paid, all-time, for non-refunded sales.
      const outstandingRows = await prisma.$queryRawUnsafe(`
        SELECT CAST(COALESCE(SUM(
          MAX(0, (s.totalPrice - COALESCE(s.refundedAmount,0)) - COALESCE(s.amountPaid, s.totalPrice))
        ), 0) AS REAL) as outstanding
        FROM VetMedicineSale s
        WHERE s.status IS NULL OR s.status != 'refunded'
      `) as any[]
      const pharmacyOutstanding = Number(outstandingRows[0]?.outstanding) || 0

      return {
        saleCount:   Number(r.saleCount) || 0,
        unitsSold,
        revenue,
        costOfGoods,
        grossProfit,
        margin,
        pharmacyOutstanding,
        topMedicines: topRows.map((t: any) => ({
          id:         t.id,
          name:       t.name,
          unit:       t.unit,
          saleCount:  Number(t.saleCount)   || 0,
          revenue:    Number(t.revenue)     || 0,
          costOfGoods: Number(t.costOfGoods) || 0,
          grossProfit: Number(t.revenue) - Number(t.costOfGoods)
        }))
      }
    } catch (err) { log.error('getSummary', err); throw err }
  })
}
