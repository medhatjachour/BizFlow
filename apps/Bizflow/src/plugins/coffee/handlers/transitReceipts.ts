import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:TransitReceipts')

function withDateRange(field: string, opts?: { startDate?: string; endDate?: string }) {
  const where: any = {}
  if (opts?.startDate || opts?.endDate) {
    where[field] = {}
    if (opts.startDate) where[field].gte = new Date(opts.startDate)
    if (opts.endDate) where[field].lte = new Date(opts.endDate)
  }
  return where
}

async function nextTransitNumber(prisma: any): Promise<string> {
  const last = await prisma.coffeeTransitReceipt.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true }
  })
  const num = last?.receiptNumber ? parseInt(last.receiptNumber.replace('TR-', ''), 10) : 0
  return `TR-${String((Number.isFinite(num) ? num : 0) + 1).padStart(6, '0')}`
}

export function registerTransitReceiptHandlers(prisma: any) {
  ipcMain.handle('coffee:transitReceipts:getAll', async (_e, opts?: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    priority?: string
    startDate?: string
    endDate?: string
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 20
      const where: any = { ...withDateRange('receivedAt', opts) }

      if (opts?.search?.trim()) {
        const q = opts.search.trim()
        where.OR = [
          { receiptNumber: { contains: q, mode: 'insensitive' } },
          { senderName: { contains: q, mode: 'insensitive' } },
          { recipientName: { contains: q, mode: 'insensitive' } },
          { recipientPhone: { contains: q, mode: 'insensitive' } },
          { senderPhone: { contains: q, mode: 'insensitive' } },
          { items: { some: { description: { contains: q, mode: 'insensitive' } } } }
        ]
      }

      if (opts?.status && opts.status !== 'all') where.status = opts.status
      if (opts?.priority && opts.priority !== 'all') where.priority = opts.priority

      const [total, items] = await Promise.all([
        prisma.coffeeTransitReceipt.count({ where }),
        prisma.coffeeTransitReceipt.findMany({
          where,
          include: { items: { orderBy: { createdAt: 'asc' } } },
          orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) {
      log.error('transitReceipts:getAll', err)
      throw err
    }
  })

  ipcMain.handle('coffee:transitReceipts:getSummary', async (_e, opts?: {
    startDate?: string
    endDate?: string
  }) => {
    try {
      const where: any = { ...withDateRange('receivedAt', opts) }
      const receipts = await prisma.coffeeTransitReceipt.findMany({ where, include: { items: true } })

      let totalAmount = 0
      let totalDeliveryFees = 0
      let totalItems = 0
      const statusCounts: any = { received: 0, in_transit: 0, delivered: 0, cancelled: 0 }
      const priorityCounts: any = { low: 0, normal: 0, high: 0, urgent: 0 }
      const senders = new Set<string>()
      const recipients = new Set<string>()

      for (const receipt of receipts) {
        totalAmount += Number(receipt.totalAmount || 0)
        totalDeliveryFees += Number(receipt.deliveryFee || 0)
        totalItems += receipt.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
        
        if (statusCounts[receipt.status] !== undefined) statusCounts[receipt.status]++
        if (priorityCounts[receipt.priority] !== undefined) priorityCounts[receipt.priority]++
        
        if (receipt.senderName) senders.add(receipt.senderName)
        if (receipt.recipientName) recipients.add(receipt.recipientName)
      }

      return {
        totalReceipts: receipts.length,
        totalAmount,
        totalDeliveryFees,
        totalItems,
        statusCounts,
        priorityCounts,
        senderCount: senders.size,
        recipientCount: recipients.size,
        deliveredCount: statusCounts.delivered,
        pendingCount: statusCounts.received + statusCounts.in_transit
      }
    } catch (err) {
      log.error('transitReceipts:getSummary', err)
      throw err
    }
  })

  ipcMain.handle('coffee:transitReceipts:create', async (_e, data: {
    senderName?: string
    senderPhone?: string
    recipientName?: string
    recipientPhone?: string
    recipientAddress?: string
    receivedAt?: string
    deliveryFee?: number
    priority?: string
    notes?: string
    createdById?: string
    items: Array<{ description: string; quantity: number; unitPrice: number; weight?: number; notes?: string }>
  }) => {
    try {
      if (!data.items?.length) throw new Error('Add at least one item to transit')
      if (!data.items.every(i => i.description?.trim())) throw new Error('All items need a description')

      return await prisma.$transaction(async (tx: any) => {
        const receiptNumber = await nextTransitNumber(tx)
        const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date()
        let itemsTotal = 0

        const receipt = await tx.coffeeTransitReceipt.create({
          data: {
            receiptNumber,
            senderName: data.senderName || null,
            senderPhone: data.senderPhone || null,
            recipientName: data.recipientName || null,
            recipientPhone: data.recipientPhone || null,
            recipientAddress: data.recipientAddress || null,
            receivedAt,
            deliveryFee: Number(data.deliveryFee || 0),
            priority: data.priority || 'normal',
            totalAmount: 0, // Temporary, will update below
            notes: data.notes || null,
            createdById: data.createdById || null
          }
        })

        for (const item of data.items) {
          const quantity = Number(item.quantity)
          const unitPrice = Number(item.unitPrice)
          const lineTotal = Math.round(quantity * unitPrice * 100) / 100
          itemsTotal += lineTotal

          await tx.coffeeTransitReceiptItem.create({
            data: {
              receiptId: receipt.id,
              description: item.description.trim(),
              quantity,
              unitPrice,
              lineTotal,
              weight: item.weight ? Number(item.weight) : null,
              notes: item.notes || null
            }
          })
        }

        const grandTotal = Math.round((itemsTotal + Number(data.deliveryFee || 0)) * 100) / 100
        return tx.coffeeTransitReceipt.update({
          where: { id: receipt.id },
          data: { totalAmount: grandTotal },
          include: { items: { orderBy: { createdAt: 'asc' } } }
        })
      })
    } catch (err) {
      log.error('transitReceipts:create', err)
      throw err
    }
  })

  ipcMain.handle('coffee:transitReceipts:updateStatus', async (_e, data: {
    id: string
    status: string
  }) => {
    try {
      return await prisma.coffeeTransitReceipt.update({
        where: { id: data.id },
        data: {
          status: data.status,
          deliveredAt: data.status === 'delivered' ? new Date() : null
        },
        include: { items: true }
      })
    } catch (err) {
      log.error('transitReceipts:updateStatus', err)
      throw err
    }
  })

  ipcMain.handle('coffee:transitReceipts:delete', async (_e, id: string) => {
    try {
      return await prisma.coffeeTransitReceipt.delete({ where: { id } })
    } catch (err) {
      log.error('transitReceipts:delete', err)
      throw err
    }
  })
}
