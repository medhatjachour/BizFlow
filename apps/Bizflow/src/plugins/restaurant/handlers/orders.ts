import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney, computeOrderTotals, convertBetweenUnits } from '../utils/mathEngine'
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
      const ingredient = await tx.restaurantIngredient.findUnique({
        where: { id: recipeIng.ingredientId }
      })

      if (!ingredient) continue

      // Stock is held in the ingredient's own unit, so a recipe line written in a
      // different (but compatible) unit has to be converted before deducting.
      const deductPerYield = convertBetweenUnits(
        recipeIng.quantity,
        recipeIng.unit,
        ingredient.unit
      )
      const totalDeduct = roundMoney((deductPerYield / (recipe.yieldCount || 1)) * item.quantity)

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

  await tx.dineInOrder.update({
    where: { id: orderId },
    data: { isStockDeducted: true }
  })
}

export function registerOrderHandlers(prisma: any) {
  // ─── Get Orders ───────────────────────────────────────────────────────────
  ipcMain.handle(
    'restaurant:getOrders',
    async (
      _e,
      options?: {
        status?: string
        startDate?: string
        endDate?: string
        tableId?: string
        orderType?: string
        shiftId?: string
      }
    ) => {
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
    }
  )

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
  ipcMain.handle(
    'restaurant:openOrder',
    async (
      _e,
      data: {
        tableId?: string | null
        serverName?: string
        serverId?: string
        shiftId?: string
        guestCount?: number
        notes?: string
        orderType?: string
        taxRate?: number
        serviceCharge?: number
      }
    ) => {
      const ORDER_TYPES = ['dine_in', 'takeout', 'delivery', 'bar_tab']
      return await prisma.$transaction(async (tx: any) => {
        if (data.orderType && !ORDER_TYPES.includes(data.orderType)) {
          throw new Error(`Unknown order type "${data.orderType}"`)
        }
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
            // Rates are fractions (0.08 = 8%), so anything outside 0..1 is a bug.
            taxRate: Math.min(1, Math.max(0, Number(data.taxRate || 0))),
            serviceCharge: Math.min(1, Math.max(0, Number(data.serviceCharge || 0))),
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
    }
  )

  // ─── Add Order Item ───────────────────────────────────────────────────────
  ipcMain.handle(
    'restaurant:addOrderItem',
    async (
      _e,
      data: {
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
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        if (!data?.orderId) throw new Error('Order id is required')

        // A settled or voided check must never accept new lines: the totals would
        // move after the fact and the stock deduction flag would stay stale.
        const order = await tx.dineInOrder.findUnique({ where: { id: data.orderId } })
        if (!order) throw new Error('Order not found')
        if (order.status === 'paid' || order.status === 'voided') {
          throw new Error(`Cannot add items to a ${order.status} check`)
        }

        // Availability is enforced here so an out-of-date menu screen can never
        // sell an 86'd dish.
        if (data.menuItemId) {
          const menuItem = await tx.menuItem.findUnique({ where: { id: data.menuItemId } })
          if (!menuItem) throw new Error('Menu item not found')
          if (!menuItem.isAvailable)
            throw new Error(`${menuItem.name} is currently out of stock (86'd)`)
          if (data.station === undefined) data.station = menuItem.station
        }

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
    }
  )

  // ─── Update Order Item ────────────────────────────────────────────────────
  ipcMain.handle(
    'restaurant:updateOrderItem',
    async (
      _e,
      data: {
        id: string
        quantity?: number
        unitPrice?: number
        notes?: string
        course?: string
        seatNumber?: number
        modifiers?: string
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        const current = await tx.dineInOrderItem.findUnique({ where: { id: data.id } })
        if (!current) throw new Error('Item not found')

        const qty =
          data.quantity !== undefined ? Math.max(1, Number(data.quantity)) : current.quantity
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
    }
  )

  // ─── Remove / Void Item ───────────────────────────────────────────────────
  // Accepts either the legacy bare-id call or the { itemId, voidReason } shape;
  // the POS used to pass a string while the handler read `data.itemId`, so every
  // void failed with "Item not found".
  ipcMain.handle(
    'restaurant:removeOrderItem',
    async (_e, payload: string | { itemId: string; voidReason?: string }) => {
      const itemId = typeof payload === 'string' ? payload : payload?.itemId
      const voidReason = typeof payload === 'string' ? undefined : payload?.voidReason

      return await prisma.$transaction(async (tx: any) => {
        if (!itemId) throw new Error('Order item id is required')

        const current = await tx.dineInOrderItem.findUnique({ where: { id: itemId } })
        if (!current) throw new Error('Item not found')

        const parent = await tx.dineInOrder.findUnique({ where: { id: current.orderId } })
        if (parent && (parent.status === 'paid' || parent.status === 'voided')) {
          throw new Error(`Cannot void an item on a ${parent.status} check`)
        }

        if (current.status === 'pending') {
          await tx.dineInOrderItem.delete({ where: { id: itemId } })
        } else {
          // Anything already fired stays on the ticket as a voided line so the
          // kitchen and the Z-report keep an audit trail of what was sent. The
          // totals engine already excludes voided rows, so the original value is
          // preserved for the audit trail.
          await tx.dineInOrderItem.update({
            where: { id: itemId },
            data: {
              status: 'voided',
              voidReason: voidReason || 'Cashier void'
            }
          })
        }

        return await recalcOrderTotalsInTx(tx, current.orderId)
      })
    }
  )

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
  // Accepts `sourceOrderId` (canonical) or `orderId` (what the POS sent), so the
  // split no longer fails with "Source order not found".
  ipcMain.handle(
    'restaurant:splitCheckBySeat',
    async (
      _e,
      payload: {
        sourceOrderId?: string
        orderId?: string
        seatNumbers: number[]
      }
    ) => {
      const sourceOrderId = payload?.sourceOrderId || payload?.orderId
      const seatNumbers = (payload?.seatNumbers || [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n))

      return await prisma.$transaction(async (tx: any) => {
        if (!sourceOrderId) throw new Error('Source order id is required')
        if (seatNumbers.length === 0) throw new Error('Select at least one seat to move')

        const source = await tx.dineInOrder.findUnique({
          where: { id: sourceOrderId },
          include: { items: true }
        })
        if (!source) throw new Error('Source order not found')
        if (source.status === 'paid' || source.status === 'voided') {
          throw new Error(`Cannot split a ${source.status} check`)
        }

        const movable = source.items.filter(
          (i: any) => i.status !== 'voided' && seatNumbers.includes(i.seatNumber)
        )
        if (movable.length === 0) {
          throw new Error('Those seats have no open items to move')
        }
        if (movable.length === source.items.filter((i: any) => i.status !== 'voided').length) {
          throw new Error('Cannot move every item off the check — leave at least one line behind')
        }

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

        // Move items of selected seats (voided lines stay behind with the source
        // check so its audit trail is not split up)
        await tx.dineInOrderItem.updateMany({
          where: {
            orderId: source.id,
            seatNumber: { in: seatNumbers },
            status: { not: 'voided' }
          },
          data: { orderId: target.id }
        })

        const sourceTotals = await recalcOrderTotalsInTx(tx, source.id)
        const targetTotals = await recalcOrderTotalsInTx(tx, target.id)
        return {
          sourceOrderId: source.id,
          targetOrderId: target.id,
          targetOrderNumber: target.orderNumber,
          movedItemCount: movable.length,
          sourceTotals,
          targetTotals
        }
      })
    }
  )

  // ─── Apply Discount ───────────────────────────────────────────────────────
  ipcMain.handle(
    'restaurant:applyDiscount',
    async (
      _e,
      data: {
        orderId: string
        discountType: 'percentage' | 'fixed' | null
        discountAmount: number
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        if (!data?.orderId) throw new Error('Order id is required')

        const order = await tx.dineInOrder.findUnique({ where: { id: data.orderId } })
        if (!order) throw new Error('Order not found')
        if (order.status === 'paid')
          throw new Error('Order is already settled — discount cannot be applied')
        if (order.status === 'voided') throw new Error('Order was voided')

        // Clearing a discount (type null / amount 0) must actually wipe both columns,
        // otherwise a stale percentage keeps re-applying on every total recalc.
        const clearing = !data.discountType || Number(data.discountAmount || 0) <= 0
        let discountType: string | null = null
        let discountAmount = 0

        if (!clearing) {
          discountAmount = roundMoney(Number(data.discountAmount))
          discountType = data.discountType
          if (data.discountType === 'percentage' && discountAmount > 100) {
            throw new Error('Discount percentage cannot exceed 100%')
          }
          if (data.discountType === 'fixed' && discountAmount > (order.subtotal || 0)) {
            throw new Error('Fixed discount cannot exceed the subtotal')
          }
        }

        await tx.dineInOrder.update({
          where: { id: data.orderId },
          data: { discountType, discountAmount }
        })
        return await recalcOrderTotalsInTx(tx, data.orderId)
      })
    }
  )

  // ─── Process Payment (Multi-tender & Tip) ──────────────────────────────────
  ipcMain.handle(
    'restaurant:processPayment',
    async (
      _e,
      data: {
        orderId: string
        amount: number
        paymentMethod: string
        reference?: string
        tipAmount?: number
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        if (!data?.orderId) throw new Error('Order id is required')

        const order = await tx.dineInOrder.findUnique({
          where: { id: data.orderId },
          include: { payments: true }
        })
        if (!order) throw new Error('Order not found')
        if (order.status === 'paid') throw new Error('Order is already fully settled')
        if (order.status === 'voided')
          throw new Error('Order was voided — reopen it before taking payment')

        const payAmount = roundMoney(Number(data.amount))
        if (!Number.isFinite(payAmount) || payAmount <= 0) {
          throw new Error('Payment amount must be greater than zero')
        }

        const alreadyPaid = roundMoney(
          (order.payments || []).reduce((s: number, p: any) => s + p.amount, 0)
        )
        const outstanding = roundMoney(order.total - alreadyPaid)
        if (payAmount > outstanding) {
          throw new Error(
            `Payment of ${payAmount.toFixed(2)} exceeds the ${outstanding.toFixed(2)} still due on this check`
          )
        }

        const tip = roundMoney(Number(data.tipAmount || 0))
        if (tip < 0) throw new Error('Tip cannot be negative')

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
        const totalTips = roundMoney(
          allPayments.reduce((s: number, p: any) => s + (p.tipAmount || 0), 0)
        )

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
          broadcastRestaurantEvent('order:settled', {
            orderId: order.id,
            total: order.total,
            tipAmount: totalTips
          })
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
          // Other terminals / KDS screens must see that money landed on the check.
          broadcastRestaurantEvent('order:updated', {
            orderId: data.orderId,
            status: 'billing',
            paidTotal,
            remaining: roundMoney(order.total - paidTotal)
          })
        }

        return {
          payment,
          paidTotal,
          total: order.total,
          remaining: Math.max(0, roundMoney(order.total - paidTotal))
        }
      })
    }
  )

  // ─── Close / Void Order ───────────────────────────────────────────────────
  ipcMain.handle(
    'restaurant:closeOrder',
    async (
      _e,
      data: {
        orderId: string
        status: 'paid' | 'voided'
        notes?: string
        voidReason?: string
      }
    ) => {
      return await prisma.$transaction(async (tx: any) => {
        if (!data?.orderId) throw new Error('Order id is required')
        if (data.status !== 'paid' && data.status !== 'voided') {
          throw new Error('Order can only be closed as paid or voided')
        }

        const existing = await tx.dineInOrder.findUnique({ where: { id: data.orderId } })
        if (!existing) throw new Error('Order not found')
        if (existing.status === 'paid') throw new Error('Order is already settled')
        if (existing.status === 'voided') throw new Error('Order is already voided')

        const order = await tx.dineInOrder.update({
          where: { id: data.orderId },
          data: {
            status: data.status,
            closedAt: new Date(),
            ...(data.notes ? { notes: data.notes } : {})
          }
        })

        // A voided check must stop cooking: leaving its lines as pending keeps the
        // ticket alive on the kitchen display forever.
        if (data.status === 'voided') {
          await tx.dineInOrderItem.updateMany({
            where: { orderId: order.id, status: { not: 'voided' } },
            data: { status: 'voided', voidReason: data.voidReason || data.notes || 'Check voided' }
          })
          broadcastRestaurantEvent('kds:ticket_bumped', { orderId: order.id })
        }

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

        const refreshed = await tx.dineInOrder.findUnique({
          where: { id: order.id },
          include: { table: true, items: true, payments: true }
        })
        broadcastRestaurantEvent('order:updated', refreshed ?? order)
        return refreshed ?? order
      })
    }
  )
}
