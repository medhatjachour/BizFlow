import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, computeOrderTotals, convertToBaseUnit } from '../utils/mathEngine'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:Orders')

export async function recalcOrderTotalsInTx(tx: any, orderId: string) {
  const order = await tx.dineInOrder.findUnique({
    where: { id: orderId },
    include: { items: true }
  })
  if (!order) return null

  const totals = computeOrderTotals({
    items: order.items,
    discountType: order.discountType as any,
    discountAmount: order.discountAmount,
    taxRate: order.taxRate,
    serviceCharge: order.serviceCharge
  })

  const updated = await tx.dineInOrder.update({
    where: { id: orderId },
    data: {
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total
    },
    include: {
      table: true,
      items: { include: { menuItem: true }, orderBy: { createdAt: 'asc' } },
      payments: true
    }
  })

  broadcastRestaurantEvent('order:updated', updated)
  return updated
}

export async function deductOrderIngredientsInTx(tx: any, orderId: string) {
  const order = await tx.dineInOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { status: { not: 'voided' } },
        include: {
          menuItem: {
            include: {
              recipe: {
                include: { ingredients: { include: { ingredient: true } } }
              }
            }
          }
        }
      }
    }
  })

  if (!order || order.isStockDeducted) return

  for (const item of order.items) {
    const recipe = item.menuItem?.recipe
    if (!recipe || !recipe.ingredients?.length) continue

    for (const recipeIng of recipe.ingredients) {
      const { normalizedQty: deductPerYield } = convertToBaseUnit(recipeIng.quantity, recipeIng.unit)
      const totalDeduct = roundMoney((deductPerYield / (recipe.yieldCount || 1)) * item.quantity)

      const ingredient = await tx.restaurantIngredient.findUnique({
        where: { id: recipeIng.ingredientId }
      })

      if (ingredient) {
        const newStock = roundMoney(Math.max(0, ingredient.currentStock - totalDeduct))
        await tx.restaurantIngredient.update({
          where: { id: ingredient.id },
          data: { currentStock: newStock }
        })

        await tx.ingredientStockMovement.create({
          data: {
            ingredientId: ingredient.id,
            type: 'order_deduction',
            quantity: -totalDeduct,
            unitCost: ingredient.costPerUnit,
            referenceId: order.id,
            notes: `Order #${order.orderNumber || order.id.slice(0, 5)} - ${item.itemName} x${item.quantity}`
          }
        })

        if (newStock <= ingredient.minStockAlert) {
          broadcastRestaurantEvent('inventory:low_stock', {
            ingredientId: ingredient.id,
            name: ingredient.name,
            currentStock: newStock,
            minStockAlert: ingredient.minStockAlert
          })
        }
      }
    }
  }

  await tx.dineInOrder.update({
    where: { id: orderId },
    data: { isStockDeducted: true }
  })
}

export function registerOrderHandlers(prisma: any) {
  // ─── Get Orders ───────────────────────────────────────────────────────────
  ipcMain.handle('restaurant:getOrders', async (_e, options?: {
    status?: string
    startDate?: string
    endDate?: string
    tableId?: string
    orderType?: string
    shiftId?: string
  }) => {
    try {
      const where: any = {}
      if (options?.status) where.status = options.status
      if (options?.tableId) where.tableId = options.tableId
      if (options?.orderType) where.orderType = options.orderType
      if (options?.shiftId) where.shiftId = options.shiftId
      if (options?.startDate || options?.endDate) {
        where.openedAt = {}
        if (options.startDate) where.openedAt.gte = new Date(options.startDate)
        if (options.endDate) where.openedAt.lte = new Date(options.endDate)
      }

      return await prisma.dineInOrder.findMany({
        where,
        include: {
          table: true,
          items: {
            include: { menuItem: true },
            orderBy: [{ seatNumber: 'asc' }, { createdAt: 'asc' }]
          },
          payments: true
        },
        orderBy: { openedAt: 'desc' }
      })
    } catch (err) {
      log.error('getOrders error', err)
      throw err
    }
  })

  // ─── Get Single Order ─────────────────────────────────────────────────────
  ipcMain.handle('restaurant:getOrder', async (_e, id: string) => {
    try {
      return await prisma.dineInOrder.findUnique({
        where: { id },
        include: {
          table: true,
          items: {
            include: {
              menuItem: {
                include: { modifierGroups: { include: { options: true } } }
              }
            },
            orderBy: [{ seatNumber: 'asc' }, { createdAt: 'asc' }]
          },
          payments: true
        }
      })
    } catch (err) {
      log.error('getOrder error', err)
      throw err
    }
  })

  // ─── Open Order ───────────────────────────────────────────────────────────
  ipcMain.handle('restaurant:openOrder', async (_e, data: {
    tableId?: string | null
    serverName?: string
    serverId?: string
    shiftId?: string
    guestCount?: number
    notes?: string
    orderType?: string
    taxRate?: number
    serviceCharge?: number
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      if (data.tableId) {
        const existing = await tx.dineInOrder.findFirst({
          where: { tableId: data.tableId, status: { in: ['open', 'billing'] } }
        })
        if (existing) {
          throw new Error('Table already has an active order in progress')
        }

        await tx.restaurantTable.update({
          where: { id: data.tableId },
          data: { status: 'occupied' }
        })
      }

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0))
      const countToday = await tx.dineInOrder.count({
        where: { createdAt: { gte: todayStart } }
      })

      const newOrder = await tx.dineInOrder.create({
        data: {
          tableId: data.tableId || null,
          orderNumber: countToday + 1,
          serverName: data.serverName || 'Staff',
          serverId: data.serverId || null,
          shiftId: data.shiftId || null,
          guestCount: Math.max(1, Number(data.guestCount || 1)),
          notes: data.notes || '',
          orderType: data.orderType || (data.tableId ? 'dine_in' : 'takeout'),
          taxRate: Number(data.taxRate || 0),
          serviceCharge: Number(data.serviceCharge || 0),
          status: 'open'
        },
        include: { table: true, items: true, payments: true }
      })

      if (data.tableId) {
        broadcastRestaurantEvent('table:updated', { id: data.tableId, status: 'occupied' })
      }
      broadcastRestaurantEvent('order:created', newOrder)
      return newOrder
    })
  })

  // ─── Add Order Item ───────────────────────────────────────────────────────
  ipcMain.handle('restaurant:addOrderItem', async (_e, data: {
    orderId: string
    menuItemId?: string
    itemName: string
    quantity: number
    unitPrice: number
    course?: string
    seatNumber?: number
    station?: string
    notes?: string
    modifiers?: string
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const quantity = Math.max(1, Number(data.quantity || 1))
      const unitPrice = roundMoney(Number(data.unitPrice || 0))
      const totalPrice = roundMoney(unitPrice * quantity)

      await tx.dineInOrderItem.create({
        data: {
          orderId: data.orderId,
          menuItemId: data.menuItemId || null,
          itemName: data.itemName,
          quantity,
          unitPrice,
          totalPrice,
          course: data.course || 'main',
          seatNumber: Number(data.seatNumber || 1),
          station: data.station || 'Kitchen',
          notes: data.notes || null,
          modifiers: data.modifiers || null,
          status: 'pending'
        }
      })

      return await recalcOrderTotalsInTx(tx, data.orderId)
    })
  })

  // ─── Update Order Item ────────────────────────────────────────────────────
  ipcMain.handle('restaurant:updateOrderItem', async (_e, data: {
    id: string
    quantity?: number
    unitPrice?: number
    notes?: string
    course?: string
    seatNumber?: number
    modifiers?: string
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const current = await tx.dineInOrderItem.findUnique({ where: { id: data.id } })
      if (!current) throw new Error('Item not found')

      const qty = data.quantity !== undefined ? Math.max(1, Number(data.quantity)) : current.quantity
      const price = data.unitPrice !== undefined ? roundMoney(data.unitPrice) : current.unitPrice
      const total = roundMoney(price * qty)

      await tx.dineInOrderItem.update({
        where: { id: data.id },
        data: {
          quantity: qty,
          unitPrice: price,
          totalPrice: total,
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.course !== undefined ? { course: data.course } : {}),
          ...(data.seatNumber !== undefined ? { seatNumber: Number(data.seatNumber) } : {}),
          ...(data.modifiers !== undefined ? { modifiers: data.modifiers } : {})
        }
      })

      return await recalcOrderTotalsInTx(tx, current.orderId)
    })
  })

  // ─── Remove / Void Item ───────────────────────────────────────────────────
  ipcMain.handle('restaurant:removeOrderItem', async (_e, data: { itemId: string; voidReason?: string }) => {
    return await prisma.$transaction(async (tx: any) => {
      const current = await tx.dineInOrderItem.findUnique({ where: { id: data.itemId } })
      if (!current) throw new Error('Item not found')

      if (current.status === 'pending') {
        await tx.dineInOrderItem.delete({ where: { id: data.itemId } })
      } else {
        await tx.dineInOrderItem.update({
          where: { id: data.itemId },
          data: { status: 'voided', voidReason: data.voidReason || 'Cashier void' }
        })
      }

      return await recalcOrderTotalsInTx(tx, current.orderId)
    })
  })

  // ─── Fire Course ──────────────────────────────────────────────────────────
  ipcMain.handle('restaurant:fireCourse', async (_e, data: { orderId: string; course: string }) => {
    return await prisma.$transaction(async (tx: any) => {
      await tx.dineInOrderItem.updateMany({
        where: { orderId: data.orderId, course: data.course, status: 'pending' },
        data: { status: 'preparing', firedAt: new Date() }
      })

      const updated = await recalcOrderTotalsInTx(tx, data.orderId)
      broadcastRestaurantEvent('kds:item_bumped', { orderId: data.orderId, course: data.course })
      return updated
    })
  })

  // ─── Split Check by Seat ──────────────────────────────────────────────────
  ipcMain.handle('restaurant:splitCheckBySeat', async (_e, data: {
    sourceOrderId: string
    seatNumbers: number[]
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const source = await tx.dineInOrder.findUnique({
        where: { id: data.sourceOrderId },
        include: { items: true }
      })
      if (!source) throw new Error('Source order not found')

      const todayStart = new Date(new Date().setHours(0, 0, 0, 0))
      const countToday = await tx.dineInOrder.count({ where: { createdAt: { gte: todayStart } } })

      // Create new sub-order for the split seats
      const target = await tx.dineInOrder.create({
        data: {
          tableId: source.tableId,
          orderNumber: countToday + 1,
          serverName: source.serverName,
          serverId: source.serverId,
          shiftId: source.shiftId,
          orderType: source.orderType,
          taxRate: source.taxRate,
          serviceCharge: source.serviceCharge,
          status: 'open',
          notes: `Split from Bill #${source.orderNumber || source.id.slice(0, 5)}`
        }
      })

      // Move items of selected seats
      await tx.dineInOrderItem.updateMany({
        where: {
          orderId: source.id,
          seatNumber: { in: data.seatNumbers }
        },
        data: { orderId: target.id }
      })

      await recalcOrderTotalsInTx(tx, source.id)
      return await recalcOrderTotalsInTx(tx, target.id)
    })
  })

  // ─── Apply Discount ───────────────────────────────────────────────────────
  ipcMain.handle('restaurant:applyDiscount', async (_e, data: {
    orderId: string
    discountType: 'percentage' | 'fixed'
    discountAmount: number
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      await tx.dineInOrder.update({
        where: { id: data.orderId },
        data: {
          discountType: data.discountType,
          discountAmount: roundMoney(Number(data.discountAmount || 0))
        }
      })
      return await recalcOrderTotalsInTx(tx, data.orderId)
    })
  })

  // ─── Process Payment (Multi-tender & Tip) ──────────────────────────────────
  ipcMain.handle('restaurant:processPayment', async (_e, data: {
    orderId: string
    amount: number
    paymentMethod: string
    reference?: string
    tipAmount?: number
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const order = await tx.dineInOrder.findUnique({
        where: { id: data.orderId },
        include: { payments: true }
      })
      if (!order) throw new Error('Order not found')
      if (order.status === 'paid') throw new Error('Order is already fully settled')

      const payAmount = roundMoney(Number(data.amount))
      const tip = roundMoney(Number(data.tipAmount || 0))

      const payment = await tx.orderPayment.create({
        data: {
          orderId: data.orderId,
          amount: payAmount,
          tipAmount: tip,
          paymentMethod: data.paymentMethod || 'cash',
          reference: data.reference || null
        }
      })

      const allPayments = await tx.orderPayment.findMany({ where: { orderId: data.orderId } })
      const paidTotal = roundMoney(allPayments.reduce((s: number, p: any) => s + p.amount, 0))
      const totalTips = roundMoney(allPayments.reduce((s: number, p: any) => s + (p.tipAmount || 0), 0))

      // Check if settled
      if (paidTotal >= order.total) {
        await tx.dineInOrder.update({
          where: { id: data.orderId },
          data: {
            status: 'paid',
            tipAmount: totalTips,
            paymentMethod: data.paymentMethod,
            closedAt: new Date()
          }
        })

        if (order.tableId) {
          await tx.restaurantTable.update({
            where: { id: order.tableId },
            data: { status: 'cleaning' }
          })
          broadcastRestaurantEvent('table:updated', { id: order.tableId, status: 'cleaning' })
        }

        // Trigger BOM stock deduction
        await deductOrderIngredientsInTx(tx, order.id)
        broadcastRestaurantEvent('order:settled', { orderId: order.id, total: order.total })
      } else {
        await tx.dineInOrder.update({
          where: { id: data.orderId },
          data: { status: 'billing' }
        })
        if (order.tableId) {
          await tx.restaurantTable.update({
            where: { id: order.tableId },
            data: { status: 'billing' }
          })
          broadcastRestaurantEvent('table:updated', { id: order.tableId, status: 'billing' })
        }
      }

      return {
        payment,
        paidTotal,
        remaining: Math.max(0, roundMoney(order.total - paidTotal))
      }
    })
  })

  // ─── Close / Void Order ───────────────────────────────────────────────────
  ipcMain.handle('restaurant:closeOrder', async (_e, data: {
    orderId: string
    status: 'paid' | 'voided'
    notes?: string
  }) => {
    return await prisma.$transaction(async (tx: any) => {
      const order = await tx.dineInOrder.update({
        where: { id: data.orderId },
        data: {
          status: data.status,
          closedAt: new Date(),
          ...(data.notes ? { notes: data.notes } : {})
        }
      })

      if (order.tableId) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'available' }
        })
        broadcastRestaurantEvent('table:updated', { id: order.tableId, status: 'available' })
      }

      if (data.status === 'paid' && !order.isStockDeducted) {
        await deductOrderIngredientsInTx(tx, order.id)
      }

      broadcastRestaurantEvent('order:updated', order)
      return order
    })
  })
}