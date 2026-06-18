import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Pharmacy:Sales')

function paymentStatusFor(total: number, paid: number): string {
  if (paid >= total - 0.005) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

export function registerPharmacySaleHandlers(prisma: any): void {
  // ─── Create a sale (POS checkout) with FEFO batch deduction ───────────────
  ipcMain.handle('pharmacy:sales:create', async (_e, data: {
    items: Array<{ productId: string; quantity: number; unitPrice?: number; saleUnit?: 'base' | 'sub' }>
    discount?: number; amountPaid?: number; paymentMethod?: string
    customerId?: string; customerName?: string; customerPhone?: string; notes?: string
  }) => {
    try {
      if (!Array.isArray(data?.items) || data.items.length === 0) {
        throw new Error('Cart is empty')
      }

      return await prisma.$transaction(async (tx: any) => {
        const lineRows: any[] = []
        let subtotal = 0

        for (const item of data.items) {
          const qtyWanted = Number(item.quantity) // expressed in saleUnit
          if (!Number.isFinite(qtyWanted) || qtyWanted <= 0) continue

          const product = await tx.pharmacyProduct.findUnique({ where: { id: item.productId } })
          if (!product) throw new Error('Product not found')

          const saleUnit = item.saleUnit === 'sub' ? 'sub' : 'base'
          const ratio = saleUnit === 'sub' ? (product.subUnitsPerContainer || 0) : 1
          if (saleUnit === 'sub' && ratio <= 0) throw new Error(`"${product.name}" cannot be sold by sub-unit`)

          const unitPrice = item.unitPrice != null
            ? Number(item.unitPrice)
            : saleUnit === 'sub'
              ? (product.subUnitPrice ?? (product.sellingPrice / ratio))
              : (product.sellingPrice ?? 0)

          // FEFO — consume earliest-expiring active batches first (always in base units).
          const batches = await tx.pharmacyBatch.findMany({
            where: { productId: item.productId, status: 'active', quantity: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
          })

          let baseNeeded = saleUnit === 'sub' ? qtyWanted / ratio : qtyWanted
          for (const batch of batches) {
            if (baseNeeded <= 0) break
            const takeBase = Math.min(baseNeeded, batch.quantity)
            const newQty = batch.quantity - takeBase
            await tx.pharmacyBatch.update({
              where: { id: batch.id },
              data: { quantity: newQty, status: newQty <= 0 ? 'depleted' : 'active' },
            })
            const soldQty = saleUnit === 'sub' ? takeBase * ratio : takeBase
            const costPerSold = saleUnit === 'sub' ? (batch.costPerUnit ?? 0) / ratio : (batch.costPerUnit ?? 0)
            lineRows.push({
              productId: product.id,
              batchId: batch.id,
              productName: product.name,
              quantity: soldQty,
              saleUnit,
              unitPrice,
              costPerUnit: costPerSold,
              lineTotal: Math.round(soldQty * unitPrice * 100) / 100,
            })
            subtotal += soldQty * unitPrice
            baseNeeded -= takeBase
          }

          if (baseNeeded > 0.0001) {
            const short = saleUnit === 'sub' ? baseNeeded * ratio : baseNeeded
            throw new Error(`Insufficient stock for "${product.name}" (short by ${short.toFixed(saleUnit === 'sub' ? 0 : 0)})`)
          }
        }

        if (lineRows.length === 0) throw new Error('Nothing to sell')

        subtotal = Math.round(subtotal * 100) / 100
        let discount = Number(data.discount) || 0
        if (discount < 0) discount = 0
        if (discount > subtotal) discount = subtotal
        const total = Math.round((subtotal - discount) * 100) / 100

        let amountPaid = data.amountPaid != null ? Number(data.amountPaid) : total
        if (!Number.isFinite(amountPaid) || amountPaid < 0) amountPaid = 0
        if (amountPaid > total) amountPaid = total

        const agg = await tx.pharmacySale.aggregate({ _max: { saleNumber: true } })
        const saleNumber = (agg._max.saleNumber ?? 0) + 1

        // Resolve customer name/phone snapshot from a linked customer when present.
        let customerName = data.customerName?.trim() || null
        let customerPhone = data.customerPhone?.trim() || null
        if (data.customerId) {
          const c = await tx.pharmacyCustomer.findUnique({ where: { id: data.customerId } })
          if (c) { customerName = c.name; customerPhone = c.phone ?? customerPhone }
        }

        const sale = await tx.pharmacySale.create({
          data: {
            saleNumber,
            customerId: data.customerId || null,
            customerName,
            customerPhone,
            subtotal,
            discount,
            total,
            amountPaid,
            paymentStatus: paymentStatusFor(total, amountPaid),
            paymentMethod: data.paymentMethod || 'cash',
            status: 'completed',
            notes: data.notes?.trim() || null,
            items: { create: lineRows },
          },
          include: { items: true },
        })
        return sale
      })
    } catch (err) { log.error('sales:create', err); throw err }
  })

  // ─── List sales (paginated, filterable) ───────────────────────────────────
  ipcMain.handle('pharmacy:sales:getAll', async (_e, params?: {
    search?: string; from?: string; to?: string
    status?: string; paymentStatus?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.status && params.status !== 'all') where.status = params.status
      if (params?.paymentStatus && params.paymentStatus !== 'all') where.paymentStatus = params.paymentStatus
      if (params?.from || params?.to) {
        where.saleDate = {}
        if (params.from) where.saleDate.gte = new Date(params.from)
        if (params.to) where.saleDate.lte = new Date(new Date(params.to).getTime() + 86_399_999)
      }
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [
          { customerName: { contains: q } },
          { customerPhone: { contains: q } },
          { notes: { contains: q } },
          { items: { some: { productName: { contains: q } } } },
        ]
        const asNum = Number(q)
        if (Number.isInteger(asNum)) where.OR.push({ saleNumber: asNum })
      }

      const skip = params?.skip ?? 0
      const take = params?.take ?? 25
      const total = await prisma.pharmacySale.count({ where })
      const data = await prisma.pharmacySale.findMany({
        where,
        include: { items: true },
        orderBy: { saleDate: 'desc' },
        skip, take,
      })
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('sales:getAll', err); throw err }
  })

  ipcMain.handle('pharmacy:sales:getById', async (_e, id: string) => {
    try {
      return await prisma.pharmacySale.findUnique({
        where: { id },
        include: { items: { include: { batch: { select: { batchNumber: true, expiryDate: true } } } } },
      })
    } catch (err) { log.error('sales:getById', err); throw err }
  })

  // ─── Settle outstanding payment on a sale ─────────────────────────────────
  ipcMain.handle('pharmacy:sales:updatePayment', async (_e, id: string, data: { amount?: number; payFull?: boolean }) => {
    try {
      const sale = await prisma.pharmacySale.findUnique({ where: { id } })
      if (!sale) throw new Error('Sale not found')
      const net = sale.total - (sale.refundedAmount ?? 0)
      const outstanding = Math.max(0, net - sale.amountPaid)
      if (outstanding <= 0.005) throw new Error('This sale is already fully paid')
      let pay = data?.payFull ? outstanding : Number(data?.amount)
      if (!Number.isFinite(pay) || pay <= 0) throw new Error('Enter a valid amount')
      if (pay > outstanding) pay = outstanding
      const newPaid = sale.amountPaid + pay
      return await prisma.pharmacySale.update({
        where: { id },
        data: { amountPaid: newPaid, paymentStatus: paymentStatusFor(net, newPaid) },
      })
    } catch (err) { log.error('sales:updatePayment', err); throw err }
  })

  // ─── Refund a whole sale (restock all batches) ────────────────────────────
  ipcMain.handle('pharmacy:sales:refund', async (_e, id: string, data?: { reason?: string }) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const sale = await tx.pharmacySale.findUnique({ where: { id }, include: { items: { include: { product: { select: { subUnitsPerContainer: true } } } } } })
        if (!sale) throw new Error('Sale not found')
        if (sale.status === 'refunded') throw new Error('This sale is already fully refunded')

        let refundTotal = 0
        for (const item of sale.items) {
          const refundable = item.quantity - (item.refundedQty ?? 0)
          if (refundable <= 0.0001) continue
          if (item.batchId) {
            const r = item.product?.subUnitsPerContainer
            const baseRestock = item.saleUnit === 'sub' && r ? refundable / r : refundable
            await tx.pharmacyBatch.update({
              where: { id: item.batchId },
              data: { quantity: { increment: baseRestock }, status: 'active' },
            })
          }
          const lineRefund = item.quantity > 0 ? (refundable / item.quantity) * item.lineTotal : 0
          refundTotal += lineRefund
          await tx.pharmacySaleItem.update({ where: { id: item.id }, data: { refundedQty: item.quantity } })
        }

        // Proportional refund of any cart-level discount.
        const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1
        refundTotal = Math.round(refundTotal * ratio * 100) / 100

        return await tx.pharmacySale.update({
          where: { id },
          data: {
            status: 'refunded',
            refundedAmount: Math.min(sale.total, (sale.refundedAmount ?? 0) + refundTotal),
            notes: data?.reason ? `${sale.notes ? sale.notes + ' · ' : ''}Refund: ${data.reason}` : sale.notes,
          },
          include: { items: true },
        })
      })
    } catch (err) { log.error('sales:refund', err); throw err }
  })

  // ─── Refund a single line item (partial) ──────────────────────────────────
  ipcMain.handle('pharmacy:sales:refundItem', async (_e, itemId: string, data?: { quantity?: number; reason?: string }) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const item = await tx.pharmacySaleItem.findUnique({ where: { id: itemId }, include: { sale: { include: { items: true } }, product: { select: { subUnitsPerContainer: true } } } })
        if (!item) throw new Error('Sale item not found')
        const refundable = item.quantity - (item.refundedQty ?? 0)
        if (refundable <= 0.0001) throw new Error('Nothing left to refund on this item')
        let qty = data?.quantity != null ? Number(data.quantity) : refundable
        if (!Number.isFinite(qty) || qty <= 0 || qty > refundable) throw new Error(`Invalid quantity — max ${refundable}`)

        if (item.batchId) {
          const r = item.product?.subUnitsPerContainer
          const baseRestock = item.saleUnit === 'sub' && r ? qty / r : qty
          await tx.pharmacyBatch.update({ where: { id: item.batchId }, data: { quantity: { increment: baseRestock }, status: 'active' } })
        }
        await tx.pharmacySaleItem.update({ where: { id: itemId }, data: { refundedQty: (item.refundedQty ?? 0) + qty } })

        const sale = item.sale
        const lineRefund = item.quantity > 0 ? (qty / item.quantity) * item.lineTotal : 0
        const ratio = sale.subtotal > 0 ? sale.total / sale.subtotal : 1
        const addRefund = Math.round(lineRefund * ratio * 100) / 100
        const newRefunded = Math.min(sale.total, (sale.refundedAmount ?? 0) + addRefund)

        // Determine new sale status from item refund state.
        const updatedItems = sale.items.map((it: any) => it.id === itemId ? { ...it, refundedQty: (item.refundedQty ?? 0) + qty } : it)
        const allRefunded = updatedItems.every((it: any) => (it.refundedQty ?? 0) >= it.quantity - 0.0001)
        const anyRefunded = updatedItems.some((it: any) => (it.refundedQty ?? 0) > 0.0001)
        const status = allRefunded ? 'refunded' : anyRefunded ? 'partially_refunded' : sale.status

        return await tx.pharmacySale.update({
          where: { id: sale.id },
          data: { refundedAmount: newRefunded, status },
          include: { items: true },
        })
      })
    } catch (err) { log.error('sales:refundItem', err); throw err }
  })
}
