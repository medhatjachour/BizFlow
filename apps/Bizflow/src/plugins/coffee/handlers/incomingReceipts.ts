import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:IncomingReceipts')

function withDateRange(field: string, opts?: { startDate?: string; endDate?: string }) {
  const where: any = {}
  if (opts?.startDate || opts?.endDate) {
    where[field] = {}
    if (opts.startDate) where[field].gte = new Date(opts.startDate)
    if (opts.endDate) where[field].lte = new Date(opts.endDate)
  }
  return where
}

async function nextReceiptNumber(prisma: any): Promise<string> {
  const last = await prisma.coffeeIncomingReceipt.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true }
  })
  const num = last?.receiptNumber ? parseInt(last.receiptNumber.replace('IN-', ''), 10) : 0
  return `IN-${String((Number.isFinite(num) ? num : 0) + 1).padStart(6, '0')}`
}

export function registerIncomingReceiptHandlers(prisma: any) {
  ipcMain.handle('coffee:incomingReceipts:getAll', async (_e, opts?: {
    page?: number
    pageSize?: number
    search?: string
    categoryId?: string
    productId?: string
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
          { supplierName: { contains: q, mode: 'insensitive' } },
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { items: { some: { productName: { contains: q, mode: 'insensitive' } } } }
        ]
      }

      if (opts?.productId || opts?.categoryId) {
        where.items = {
          some: {
            ...(opts.productId ? { productId: opts.productId } : {}),
            ...(opts.categoryId ? { product: { categoryId: opts.categoryId } } : {})
          }
        }
      }

      const [total, items] = await Promise.all([
        prisma.coffeeIncomingReceipt.count({ where }),
        prisma.coffeeIncomingReceipt.findMany({
          where,
          include: {
            items: {
              include: {
                product: { select: { id: true, categoryId: true, category: { select: { id: true, name: true } } } }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) {
      log.error('incomingReceipts:getAll', err)
      throw err
    }
  })

  ipcMain.handle('coffee:incomingReceipts:getSummary', async (_e, opts?: {
    startDate?: string
    endDate?: string
    categoryId?: string
    productId?: string
  }) => {
    try {
      const where: any = { ...withDateRange('receivedAt', opts) }
      if (opts?.productId || opts?.categoryId) {
        where.items = {
          some: {
            ...(opts.productId ? { productId: opts.productId } : {}),
            ...(opts.categoryId ? { product: { categoryId: opts.categoryId } } : {})
          }
        }
      }

      const receipts = await prisma.coffeeIncomingReceipt.findMany({
        where,
        include: {
          items: { include: { product: { select: { categoryId: true, category: { select: { name: true } } } } } }
        }
      })

      let totalCost = 0
      let totalUnits = 0
      const suppliers = new Set<string>()
      const byCategory = new Map<string, { categoryName: string; units: number; totalCost: number }>()

      for (const receipt of receipts) {
        totalCost += Number(receipt.totalCost || 0)
        if (receipt.supplierName) suppliers.add(receipt.supplierName)
        for (const item of receipt.items) {
          totalUnits += Number(item.quantity || 0)
          const key = item.product?.categoryId || 'uncategorized'
          const categoryName = item.product?.category?.name || 'Uncategorized'
          const row = byCategory.get(key) || { categoryName, units: 0, totalCost: 0 }
          row.units += Number(item.quantity || 0)
          row.totalCost += Number(item.lineTotal || 0)
          byCategory.set(key, row)
        }
      }

      return {
        totalReceipts: receipts.length,
        totalCost,
        totalUnits,
        averageReceiptCost: receipts.length > 0 ? totalCost / receipts.length : 0,
        supplierCount: suppliers.size,
        topCategories: Array.from(byCategory.values()).sort((a, b) => b.totalCost - a.totalCost).slice(0, 6)
      }
    } catch (err) {
      log.error('incomingReceipts:getSummary', err)
      throw err
    }
  })

  ipcMain.handle('coffee:incomingReceipts:create', async (_e, data: {
    supplierName?: string
    invoiceNumber?: string
    receivedAt?: string
    notes?: string
    createdById?: string
    items: Array<{ productId: string; quantity: number; unitCost: number; notes?: string }>
  }) => {
    try {
      if (!data.items?.length) throw new Error('Add at least one product')

      return await prisma.$transaction(async (tx: any) => {
        const receiptNumber = await nextReceiptNumber(tx)
        const receivedAt = data.receivedAt ? new Date(data.receivedAt) : new Date()
        const receiptItems: any[] = []
        let totalCost = 0

        for (const input of data.items) {
          const product = await tx.coffeeProduct.findUnique({ where: { id: input.productId } })
          if (!product) throw new Error('Product not found')
          const quantity = Number(input.quantity)
          const unitCost = Number(input.unitCost)
          if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Invalid quantity for ${product.name}`)
          if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error(`Invalid unit cost for ${product.name}`)

          const lineTotal = Math.round(quantity * unitCost * 100) / 100
          totalCost += lineTotal
          receiptItems.push({
            product,
            quantity,
            unitCost,
            lineTotal,
            notes: input.notes || null
          })
        }

        const receipt = await tx.coffeeIncomingReceipt.create({
          data: {
            receiptNumber,
            supplierName: data.supplierName || null,
            invoiceNumber: data.invoiceNumber || null,
            receivedAt,
            totalCost: Math.round(totalCost * 100) / 100,
            notes: data.notes || null,
            createdById: data.createdById || null
          }
        })

        for (const item of receiptItems) {
          await tx.coffeeIncomingReceiptItem.create({
            data: {
              receiptId: receipt.id,
              productId: item.product.id,
              productName: item.product.name,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
              notes: item.notes
            }
          })

          const previousStock = Number(item.product.stock || 0)
          const newStock = previousStock + item.quantity
          await tx.coffeeProduct.update({
            where: { id: item.product.id },
            data: {
              stock: newStock,
              cost: item.unitCost > 0 ? item.unitCost : item.product.cost
            }
          })
          await tx.coffeeStockMovement.create({
            data: {
              productId: item.product.id,
              type: 'restock',
              quantity: item.quantity,
              previousStock,
              newStock,
              reason: data.supplierName ? `Incoming receipt from ${data.supplierName}` : 'Incoming receipt',
              referenceId: receipt.id,
              notes: data.invoiceNumber ? `Invoice ${data.invoiceNumber}` : data.notes || null,
              createdAt: receivedAt
            }
          })
        }

        return tx.coffeeIncomingReceipt.findUnique({
          where: { id: receipt.id },
          include: {
            items: { include: { product: { select: { id: true, categoryId: true, category: { select: { id: true, name: true } } } } } }
          }
        })
      })
    } catch (err) {
      log.error('incomingReceipts:create', err)
      throw err
    }
  })
}
