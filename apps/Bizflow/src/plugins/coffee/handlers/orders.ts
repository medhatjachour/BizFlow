// ─── Coffee: Orders Handler ───────────────────────────────────────────────────
// Manages the full order lifecycle for dine-in, takeaway, and delivery orders.
//
// IPC channels:
//   coffee:orders:getAll / getById / create / addItem / removeItem
//   coffee:orders:updateItemStatus / close / void
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Orders')

// ── ADD THIS: Unit precision helpers ────────────────────────────────────────────
const UNITS: Record<string, { decimals: number }> = {
  piece: { decimals: 0 },
  kg:    { decimals: 3 },
  g:     { decimals: 0 },
  lb:    { decimals: 3 },
  liter: { decimals: 3 },
  ml:    { decimals: 0 },
}

const roundToUnit = (value: number, unit: string | null | undefined): number => {
  const decimals = UNITS[unit ?? 'piece']?.decimals ?? 0
  return parseFloat(value.toFixed(decimals))
}
// ────────────────────────────────────────────────────────────────────────────────

/** Recalculate and persist subtotal/tax/total from current items. */
async function recalcTotals(prisma: any, orderId: string) {
  const items = await prisma.coffeeOrderItem.findMany({
    where: { orderId, status: { not: 'cancelled' } }
  })
  const subtotal = items.reduce((s: number, i: any) => s + i.total, 0)
  const tax = 0 // Tax-free by default; adjust if needed
  await prisma.coffeeOrder.update({
    where: { id: orderId },
    data: { subtotal, tax, total: subtotal + tax }
  })
}

/** Generate next order number like #0001 (zero-padded, DB-based counter). */
async function nextOrderNumber(prisma: any): Promise<string> {
  const last = await prisma.coffeeOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true }
  })
  if (!last) return '#0001'
  const n = parseInt(last.orderNumber.replace('#', ''), 10)
  return `#${String(n + 1).padStart(4, '0')}`
}

export function registerOrderHandlers(prisma: any) {
  // ── List orders ──────────────────────────────────────────────────────────────
  ipcMain.handle(
    'coffee:orders:getAll',
    async (
      _e,
      opts?: {
        status?: string
        type?: string
        shiftId?: string
        search?: string
        page?: number
        pageSize?: number
        startDate?: string
        endDate?: string
      }
    ) => {
      try {
        const page = opts?.page ?? 1
        const pageSize = opts?.pageSize ?? 20
        const where: any = {}
        if (opts?.status) where.status = opts.status
        if (opts?.type) where.type = opts.type
        if (opts?.shiftId) where.shiftId = opts.shiftId
        if (opts?.search?.trim()) {
          const q = opts.search.trim()
          where.OR = [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { customerName: { contains: q, mode: 'insensitive' } },
            { customerPhone: { contains: q, mode: 'insensitive' } },
            { deliveryAddress: { contains: q, mode: 'insensitive' } },
            { table: { name: { contains: q, mode: 'insensitive' } } }
          ]
        }
        if (opts?.startDate || opts?.endDate) {
          where.openedAt = {}
          if (opts.startDate) where.openedAt.gte = new Date(opts.startDate)
          if (opts.endDate) where.openedAt.lte = new Date(opts.endDate)
        }
        const [total, items] = await Promise.all([
          prisma.coffeeOrder.count({ where }),
          prisma.coffeeOrder.findMany({
            where,
            include: {
              table: { select: { id: true, number: true, name: true, section: true } },
              cashier: { select: { id: true, username: true, fullName: true } },
              items: { orderBy: { createdAt: 'asc' } }
            },
            orderBy: { openedAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize
          })
        ])
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
      } catch (err) {
        log.error('orders:getAll', err)
        throw err
      }
    }
  )

  ipcMain.handle('coffee:orders:getById', async (_e, id: string) => {
    try {
      return await prisma.coffeeOrder.findUnique({
        where: { id },
        include: {
          table: { select: { id: true, number: true, name: true, section: true } },
          cashier: { select: { id: true, username: true, fullName: true } },
          items: {
            include: { product: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    } catch (err) {
      log.error('orders:getById', err)
      throw err
    }
  })

  // ── Create order ─────────────────────────────────────────────────────────────
  ipcMain.handle(
    'coffee:orders:create',
    async (
      _e,
      data: {
        type: string
        tableId?: string
        customerName?: string
        customerPhone?: string
        deliveryAddress?: string
        customerId?: string
        cashierId?: string
        shiftId?: string
        notes?: string
        items?: {
          productId?: string
          productName: string
          unitPrice: number
          quantity: number
          unit?: string // Added unit
          notes?: string
        }[]
      }
    ) => {
      try {
        if (data.type === 'dine_in' && data.tableId) {
          const existing = await prisma.coffeeOrder.findFirst({
            where: { tableId: data.tableId, status: 'open' }
          })
          if (existing)
            throw new Error(
              'This table already has an open order — close it before opening a new one.'
            )
        }

        const orderNumber = await nextOrderNumber(prisma)

        return await prisma.$transaction(async (tx: any) => {
          const order = await tx.coffeeOrder.create({
            data: {
              orderNumber,
              type: data.type,
              tableId: data.tableId || null,
              customerName: data.customerName || null,
              customerPhone: data.customerPhone || null,
              deliveryAddress: data.deliveryAddress || null,
              customerId: data.customerId || null,
              cashierId: data.cashierId || null,
              shiftId: data.shiftId || null,
              notes: data.notes || null,
              status: 'open'
            }
          })

          // Mark table as occupied if dine-in
          if (data.type === 'dine_in' && data.tableId) {
            await tx.coffeeTable.update({
              where: { id: data.tableId },
              data: { status: 'occupied' }
            })
          }

          // Add pre-filled items (e.g. from POS quick-checkout)
          if (data.items?.length) {
            for (const i of data.items) {
              const qty = roundToUnit(Number(i.quantity), i.unit)
              await tx.coffeeOrderItem.create({
                data: {
                  orderId: order.id,
                  productId: i.productId || null,
                  productName: i.productName,
                  unitPrice: Number(i.unitPrice),
                  quantity: qty,
                  unit: i.unit || 'piece', // Snapshot unit
                  total: Number(i.unitPrice) * qty,
                  notes: i.notes || null
                }
              })
            }
            await recalcTotals(tx, order.id)
          }

          return tx.coffeeOrder.findUnique({
            where: { id: order.id },
            include: { table: true, items: true }
          })
        })
      } catch (err) {
        log.error('orders:create', err)
        throw err
      }
    }
  )

  // ── Add item to open order ────────────────────────────────────────────────────
  ipcMain.handle(
    'coffee:orders:addItem',
    async (
      _e,
      data: {
        orderId: string
        productId?: string
        productName: string
        unitPrice: number
        quantity: number
        unit?: string // Added unit
        notes?: string
      }
    ) => {
      try {
        const qty = roundToUnit(Number(data.quantity), data.unit)
        const item = await prisma.coffeeOrderItem.create({
          data: {
            orderId: data.orderId,
            productId: data.productId || null,
            productName: data.productName,
            unitPrice: Number(data.unitPrice),
            quantity: qty,
            unit: data.unit || 'piece', // Snapshot unit
            total: Number(data.unitPrice) * qty,
            notes: data.notes || null
          }
        })
        await recalcTotals(prisma, data.orderId)
        return item
      } catch (err) {
        log.error('orders:addItem', err)
        throw err
      }
    }
  )

  // ── Remove item from open order ───────────────────────────────────────────────
  ipcMain.handle('coffee:orders:removeItem', async (_e, itemId: string) => {
    try {
      const item = await prisma.coffeeOrderItem.delete({ where: { id: itemId } })
      await recalcTotals(prisma, item.orderId)
      return item
    } catch (err) {
      log.error('orders:removeItem', err)
      throw err
    }
  })

  // ── Update item preparation status ────────────────────────────────────────────
  ipcMain.handle(
    'coffee:orders:updateItemStatus',
    async (_e, data: { id: string; status: string }) => {
      try {
        return await prisma.coffeeOrderItem.update({
          where: { id: data.id },
          data: { status: data.status }
        })
      } catch (err) {
        log.error('orders:updateItemStatus', err)
        throw err
      }
    }
  )

  // ── Close (pay) an order ──────────────────────────────────────────────────────
  ipcMain.handle(
    'coffee:orders:close',
    async (
      _e,
      data: {
        orderId: string
        paymentMethod: string
        discount?: number
        cashierId?: string
        shiftId?: string
      }
    ) => {
      try {
        return await prisma.$transaction(async (tx: any) => {
          // Get current order totals
          const order = await tx.coffeeOrder.findUniqueOrThrow({
            where: { id: data.orderId },
            include: { items: true }
          })

          const discount = Number(data.discount ?? order.discount ?? 0)
          const subtotal = order.subtotal
          const total = Math.max(0, subtotal - discount)

          const closed = await tx.coffeeOrder.update({
            where: { id: data.orderId },
            data: {
              status: 'paid',
              paymentMethod: data.paymentMethod,
              discount,
              total,
              closedAt: new Date(),
              ...(data.cashierId ? { cashierId: data.cashierId } : {}),
              ...(data.shiftId ? { shiftId: data.shiftId } : {})
            }
          })

          // Deduct stock for each item (if product is linked)
          for (const item of order.items) {
            if (!item.productId) continue
            const product = await tx.coffeeProduct.findUnique({ where: { id: item.productId } })
            if (!product) continue
            
            // Use float math and round based on product unit
            const newStock = Math.max(0, roundToUnit(product.stock - item.quantity, product.unit))
            
            await tx.coffeeProduct.update({
              where: { id: item.productId },
              data: { stock: newStock }
            })
            await tx.coffeeStockMovement.create({
              data: {
                productId: item.productId,
                type: 'sale',
                quantity: -roundToUnit(item.quantity, product.unit), // Store as negative float
                previousStock: product.stock,
                newStock,
                reason: 'order',
                referenceId: data.orderId
              }
            })
          }

          // Free the table
          if (closed.tableId) {
            await tx.coffeeTable.update({
              where: { id: closed.tableId },
              data: { status: 'available' }
            })
          }

          // Update shift totals
          if (closed.shiftId) {
            const field =
              data.paymentMethod === 'card'
                ? 'cardTotal'
                : data.paymentMethod === 'vodafone_cash'
                  ? 'vodafoneCashTotal'
                  : 'cashTotal'
            await tx.coffeeShift.update({
              where: { id: closed.shiftId },
              data: {
                totalSales: { increment: total },
                totalOrders: { increment: 1 },
                [field]: { increment: total }
              }
            })
          }

          return closed
        })
      } catch (err) {
        log.error('orders:close', err)
        throw err
      }
    }
  )

  // ── Void an order ─────────────────────────────────────────────────────────────
  ipcMain.handle('coffee:orders:void', async (_e, id: string) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const order = await tx.coffeeOrder.update({
          where: { id },
          data: { status: 'voided', closedAt: new Date() }
        })
        if (order.tableId) {
          await tx.coffeeTable.update({
            where: { id: order.tableId },
            data: { status: 'available' }
          })
        }
        return order
      })
    } catch (err) {
      log.error('orders:void', err)
      throw err
    }
  })

  // ── Refund an order ───────────────────────────────────────────────────────────
  ipcMain.handle('coffee:orders:refund', async (_e, {
    orderId, items, reason, notes, cashierId, restockItems = true
  }: {
    orderId: string
    items: Array<{ id: string; quantity: number }>
    reason: string
    notes?: string
    cashierId: string
    restockItems?: boolean
  }) => {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.coffeeOrder.findUnique({
          where: { id: orderId },
          include: { items: true }
        });

        if (!order) throw new Error('Order not found');
        if (order.status !== 'paid') throw new Error('Only paid orders can be refunded');

        let refundAmount = 0;
        const restockMovements: Array<{ productId: string; quantity: number; itemName: string }> = [];

        // Process each item to refund
        for (const refundItem of items) {
          const orderItem = order.items.find(oi => oi.id === refundItem.id);
          if (!orderItem) throw new Error(`Item ${refundItem.id} not found in order`);
          
          if (refundItem.quantity > orderItem.quantity) {
            throw new Error(`Cannot refund more than ordered quantity for ${orderItem.productName}`);
          }

          // Calculate refund amount for this item
          const itemRefundAmount = (orderItem.total / orderItem.quantity) * refundItem.quantity;
          refundAmount += itemRefundAmount;

          // Track for restocking (only if restockItems is true)
          if (restockItems && orderItem.productId) {
            restockMovements.push({
              productId: orderItem.productId,
              quantity: refundItem.quantity,
              itemName: orderItem.productName
            });
          }
        }

        const newRefundedAmount = order.refundedAmount + refundAmount;
        const isFullRefund = newRefundedAmount >= order.total;
        const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';

        // Update order
        const updatedOrder = await tx.coffeeOrder.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            refundedAmount: newRefundedAmount,
            refundedAt: new Date(),
            refundedById: cashierId,
            refundReason: reason,
            refundNotes: notes ? `${notes}${restockItems ? '' : ' [NO RESTOCK]'}` : (restockItems ? '' : '[NO RESTOCK]')
          }
        });

        // Restock items only if restockItems is true
        if (restockItems) {
          for (const movement of restockMovements) {
            const product = await tx.coffeeProduct.findUnique({ 
              where: { id: movement.productId } 
            });
            
            if (product) {
              // Use float math and round based on product unit
              const newStock = roundToUnit(product.stock + movement.quantity, product.unit);
              await tx.coffeeProduct.update({
                where: { id: movement.productId },
                data: { stock: newStock }
              });

              await tx.coffeeStockMovement.create({
                data: {
                  productId: movement.productId,
                  type: 'adjustment',
                  quantity: roundToUnit(movement.quantity, product.unit),
                  previousStock: product.stock,
                  newStock: newStock,
                  reason: `Refund: ${movement.itemName} (Order ${order.orderNumber})`,
                  referenceId: order.id,
                  notes: reason
                }
              });
            }
          }
        }

        return updatedOrder;
      });
    } catch (err) {
      log.error('orders:refund', err);
      throw err;
    }
  });

}
