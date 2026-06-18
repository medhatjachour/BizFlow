import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Pharmacy:PurchaseOrders')

function computeTotal(items: any[]): number {
  return Math.round(items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0), 0) * 100) / 100
}

export function registerPharmacyPurchaseOrderHandlers(prisma: any): void {
  ipcMain.handle('pharmacy:purchaseOrders:getAll', async (_e, params?: {
    status?: string; search?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.status && params.status !== 'all') where.status = params.status
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [
          { notes: { contains: q } },
          { supplier: { is: { name: { contains: q } } } },
          { items: { some: { productName: { contains: q } } } },
        ]
        const asNum = Number(q)
        if (Number.isInteger(asNum)) where.OR.push({ orderNumber: asNum })
      }
      const skip = params?.skip ?? 0
      const take = params?.take ?? 25
      const total = await prisma.pharmacyPurchaseOrder.count({ where })
      const data = await prisma.pharmacyPurchaseOrder.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } }, _count: { select: { items: true } } },
        orderBy: { orderDate: 'desc' },
        skip, take,
      })
      return { data: data.map((o: any) => ({ ...o, itemCount: o._count.items, _count: undefined })), total, hasMore: skip + take < total }
    } catch (err) { log.error('purchaseOrders:getAll', err); throw err }
  })

  ipcMain.handle('pharmacy:purchaseOrders:getById', async (_e, id: string) => {
    try {
      return await prisma.pharmacyPurchaseOrder.findUnique({
        where: { id },
        include: { supplier: true, items: { orderBy: { createdAt: 'asc' } } },
      })
    } catch (err) { log.error('purchaseOrders:getById', err); throw err }
  })

  ipcMain.handle('pharmacy:purchaseOrders:create', async (_e, data: {
    supplierId?: string; notes?: string; status?: string
    items: Array<{ productId?: string; productName: string; quantity: number; costPerUnit: number; sellingPrice?: number; expiryDate?: string }>
  }) => {
    try {
      const items = (data?.items ?? []).filter(it => it.productName?.trim() && Number(it.quantity) > 0)
      if (items.length === 0) throw new Error('Add at least one item')
      const agg = await prisma.pharmacyPurchaseOrder.aggregate({ _max: { orderNumber: true } })
      const orderNumber = (agg._max.orderNumber ?? 0) + 1
      return await prisma.pharmacyPurchaseOrder.create({
        data: {
          orderNumber,
          supplierId: data.supplierId || null,
          status: data.status || 'draft',
          total: computeTotal(items),
          notes: data.notes?.trim() || null,
          items: {
            create: items.map(it => ({
              productId: it.productId || null,
              productName: it.productName.trim(),
              quantity: Number(it.quantity) || 0,
              costPerUnit: Number(it.costPerUnit) || 0,
              sellingPrice: it.sellingPrice != null ? Number(it.sellingPrice) : null,
              expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
              lineTotal: Math.round((Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0) * 100) / 100,
            })),
          },
        },
        include: { items: true, supplier: true },
      })
    } catch (err) { log.error('purchaseOrders:create', err); throw err }
  })

  ipcMain.handle('pharmacy:purchaseOrders:update', async (_e, id: string, data: any) => {
    try {
      const po = await prisma.pharmacyPurchaseOrder.findUnique({ where: { id } })
      if (!po) throw new Error('Purchase order not found')
      if (po.status === 'received') throw new Error('A received order cannot be edited')

      const patch: any = {}
      if (data.supplierId !== undefined) patch.supplierId = data.supplierId || null
      if (data.notes !== undefined) patch.notes = data.notes?.trim() || null
      if (data.status !== undefined) patch.status = data.status

      if (Array.isArray(data.items)) {
        const items = data.items.filter((it: any) => it.productName?.trim() && Number(it.quantity) > 0)
        patch.total = computeTotal(items)
        await prisma.pharmacyPurchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } })
        patch.items = {
          create: items.map((it: any) => ({
            productId: it.productId || null,
            productName: it.productName.trim(),
            quantity: Number(it.quantity) || 0,
            costPerUnit: Number(it.costPerUnit) || 0,
            sellingPrice: it.sellingPrice != null ? Number(it.sellingPrice) : null,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
            lineTotal: Math.round((Number(it.quantity) || 0) * (Number(it.costPerUnit) || 0) * 100) / 100,
          })),
        }
      }
      return await prisma.pharmacyPurchaseOrder.update({ where: { id }, data: patch, include: { items: true, supplier: true } })
    } catch (err) { log.error('purchaseOrders:update', err); throw err }
  })

  // Receive a PO → turn each line into stock (a new batch) for its product.
  ipcMain.handle('pharmacy:purchaseOrders:receive', async (_e, id: string) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const po = await tx.pharmacyPurchaseOrder.findUnique({ where: { id }, include: { items: true } })
        if (!po) throw new Error('Purchase order not found')
        if (po.status === 'received') throw new Error('This order has already been received')

        let createdBatches = 0
        for (const it of po.items) {
          if (it.received) continue
          if (!it.productId) continue // can only stock items linked to a product
          await tx.pharmacyBatch.create({
            data: {
              productId: it.productId,
              quantity: it.quantity,
              initialQty: it.quantity,
              costPerUnit: it.costPerUnit,
              sellingPrice: it.sellingPrice ?? null,
              expiryDate: it.expiryDate ?? new Date(Date.now() + 365 * 86_400_000),
              supplierId: po.supplierId || null,
              status: 'active',
            },
          })
          await tx.pharmacyPurchaseOrderItem.update({ where: { id: it.id }, data: { received: true } })
          createdBatches++
        }

        const updated = await tx.pharmacyPurchaseOrder.update({
          where: { id },
          data: { status: 'received', receivedDate: new Date() },
          include: { items: true, supplier: true },
        })
        return { ...updated, createdBatches }
      })
    } catch (err) { log.error('purchaseOrders:receive', err); throw err }
  })

  ipcMain.handle('pharmacy:purchaseOrders:delete', async (_e, id: string) => {
    try {
      await prisma.pharmacyPurchaseOrder.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('purchaseOrders:delete', err); throw err }
  })
}
