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
    amountPaid?: number
  }) => {
    try {
      if (!data.items || data.items.length === 0) throw new Error('No items in cart')

      const saleDate = data.saleDate ? new Date(data.saleDate) : new Date()
      const totalCart = data.items.reduce((s, it) => {
        const disc = it.discount ?? 0
        return s + Math.max(0, it.quantity * it.unitPrice - disc)
      }, 0)
      const amountPaid   = data.amountPaid != null ? data.amountPaid : totalCart
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

          const disc       = it.discount ?? 0
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
          await tx.vetMedicineBatch.update({
            where: { id: it.batchId },
            data:  { quantity: { decrement: deductQty } }
          })
          created.push(sale)
        }
        return created
      })

      return { count: sales.length, sales }
    } catch (err) { log.error('sellCombo', err); throw err }
  })

  // ─── Update Sale Payment ───────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:updateSalePayment', async (_e, id: string, amountPaid: number) => {
    try {
      const sale = await prisma.vetMedicineSale.findUnique({ where: { id } })
      if (!sale) throw new Error('Sale not found')
      const status = amountPaid >= sale.totalPrice - 0.005 ? 'paid'
        : amountPaid > 0 ? 'partial' : 'unpaid'
      return await prisma.vetMedicineSale.update({
        where: { id },
        data: { amountPaid, paymentStatus: status }
      })
    } catch (err) { log.error('updateSalePayment', err); throw err }
  })

  // ─── Get Sales ────────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:getSales', async (_e, params?: {
    medicineId?: string; patientId?: string;
    from?: string; to?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.medicineId) where.medicineId = params.medicineId
      if (params?.patientId)  where.patientId  = params.patientId
      if (params?.from || params?.to) {
        where.saleDate = {}
        if (params.from) where.saleDate.gte = new Date(params.from)
        if (params.to)   where.saleDate.lte = new Date(params.to)
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetMedicineSale.count({ where })
      const data  = await prisma.vetMedicineSale.findMany({
        where,
        include: {
          medicine: { select: { id: true, name: true, unit: true } },
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
          COALESCE(SUM(s.totalPrice), 0)                           as revenue,
          COALESCE(SUM(s.quantity * b.costPerUnit), 0)             as costOfGoods,
          COALESCE(SUM(s.totalPrice - s.quantity * b.costPerUnit), 0) as grossProfit
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
      `, from, to) as any[]

      const topRows = await prisma.$queryRawUnsafe(`
        SELECT
          m.id, m.name, m.unit,
          COUNT(*)                             as saleCount,
          COALESCE(SUM(s.totalPrice), 0)       as revenue,
          COALESCE(SUM(s.quantity * b.costPerUnit), 0) as costOfGoods
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

      return {
        saleCount:   Number(r.saleCount) || 0,
        revenue,
        costOfGoods,
        grossProfit,
        margin,
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
