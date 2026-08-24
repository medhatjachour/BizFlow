import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Orders')

async function recalcOrderTotals(prisma: any, orderId: string) {
  const order = await prisma.dineInOrder.findUnique({ where: { id: orderId } })
  if (!order) return

  const items = await prisma.dineInOrderItem.findMany({
    where: { orderId, status: { not: 'voided' } }
  })

  const subtotal = items.reduce(
    (s: number, i: any) => s + (i.totalPrice || i.unitPrice * i.quantity),
    0
  )
  const tax = subtotal * (order.taxRate || 0)
  let discount = order.discountAmount || 0
  if (order.discountType === 'percentage') {
    discount = (subtotal * discount) / 100
  }
  const total = Math.max(0, subtotal + tax + (order.serviceCharge || 0) - discount)

  return await prisma.dineInOrder.update({
    where: { id: orderId },
    data: { subtotal, tax, total }
  })
}

// Auto-deplete raw ingredients from pantry stock based on item recipes
async function deductIngredientsForOrder(prisma: any, orderId: string) {
  try {
    const order = await prisma.dineInOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipe: {
                  include: {
                    ingredients: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!order || order.isStockDeducted) return

    for (const item of order.items) {
      if (item.status === 'voided') continue

      const recipe = item.menuItem?.recipe
      if (!recipe || !recipe.ingredients?.length) continue

      for (const recipeIng of recipe.ingredients) {
        const totalDeduct =
          (recipeIng.quantity / (recipe.yieldCount || 1)) * item.quantity

        const ingredient = await prisma.restaurantIngredient.findUnique({
          where: { id: recipeIng.ingredientId }
        })

        if (ingredient) {
          const newStock = Math.max(0, ingredient.currentStock - totalDeduct)
          await prisma.restaurantIngredient.update({
            where: { id: ingredient.id },
            data: { currentStock: newStock }
          })

          await prisma.ingredientStockMovement.create({
            data: {
              ingredientId: ingredient.id,
              type: 'order_deduction',
              quantity: -totalDeduct,
              unitCost: ingredient.costPerUnit,
              referenceId: order.id,
              notes: `Order #${order.orderNumber || order.id.slice(0, 5)} - ${item.itemName} x${item.quantity}`
            }
          })
        }
      }
    }

    await prisma.dineInOrder.update({
      where: { id: orderId },
      data: { isStockDeducted: true }
    })
  } catch (err) {
    log.error('Failed to auto-deduct order ingredients:', err)
  }
}

export function registerOrderHandlers(prisma: any) {
  ipcMain.handle(
    'restaurant:getOrders',
    async (
      _e,
      options?: {
        status?: string
        startDate?: string
        endDate?: string
        tableId?: string
      }
    ) => {
      try {
        const where: any = {}
        if (options?.status) where.status = options.status
        if (options?.tableId) where.tableId = options.tableId
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
              orderBy: { createdAt: 'asc' }
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

  ipcMain.handle('restaurant:getOrder', async (_e, id: string) => {
    try {
      return await prisma.dineInOrder.findUnique({
        where: { id },
        include: {
          table: true,
          items: {
            include: {
              menuItem: {
                include: {
                  modifierGroups: { include: { options: true } }
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          payments: true
        }
      })
    } catch (err) {
      log.error('getOrder error', err)
      throw err
    }
  })

  ipcMain.handle(
    'restaurant:openOrder',
    async (
      _e,
      data: {
        tableId: string
        serverName?: string
        serverId?: string
        guestCount?: number
        notes?: string
        orderType?: string
        taxRate?: number
      }
    ) => {
      try {
        const existingOpen = await prisma.dineInOrder.findFirst({
          where: { tableId: data.tableId, status: { in: ['open', 'billing'] } }
        })
        if (existingOpen) {
          throw new Error(
            'This table already has an active order — settle or void it before opening a new one'
          )
        }

        await prisma.restaurantTable.update({
          where: { id: data.tableId },
          data: { status: 'occupied' }
        })

        const countToday = await prisma.dineInOrder.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })

        return await prisma.dineInOrder.create({
          data: {
            tableId: data.tableId,
            orderNumber: countToday + 1,
            serverName: data.serverName || 'Staff',
            serverId: data.serverId || null,
            guestCount: Number(data.guestCount || 1),
            notes: data.notes || '',
            orderType: data.orderType || 'dine_in',
            taxRate: data.taxRate !== undefined ? Number(data.taxRate) : 0,
            status: 'open'
          },
          include: { table: true, items: true, payments: true }
        })
      } catch (err) {
        log.error('openOrder error', err)
        throw err
      }
    }
  )

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
        totalPrice?: number
        course?: string
        station?: string
        notes?: string
        modifiers?: string
      }
    ) => {
      try {
        const quantity = Math.max(1, Number(data.quantity || 1))
        const unitPrice = Number(data.unitPrice || 0)
        const totalPrice =
          data.totalPrice !== undefined
            ? Number(data.totalPrice)
            : unitPrice * quantity

        const item = await prisma.dineInOrderItem.create({
          data: {
            orderId: data.orderId,
            menuItemId: data.menuItemId || null,
            itemName: data.itemName,
            quantity,
            unitPrice,
            totalPrice,
            course: data.course || 'main',
            station: data.station || 'Kitchen',
            notes: data.notes || null,
            modifiers: data.modifiers || null,
            status: 'pending'
          }
        })
        await recalcOrderTotals(prisma, data.orderId)
        return item
      } catch (err) {
        log.error('addOrderItem error', err)
        throw err
      }
    }
  )

  ipcMain.handle(
    'restaurant:updateOrderItem',
    async (
      _e,
      data: {
        id: string
        quantity?: number
        notes?: string
        course?: string
        modifiers?: string
        totalPrice?: number
      }
    ) => {
      try {
        const { id, ...rest } = data
        const current = await prisma.dineInOrderItem.findUnique({ where: { id } })
        if (!current) throw new Error('Order item not found')

        const qty =
          rest.quantity !== undefined ? Number(rest.quantity) : current.quantity
        const total =
          rest.totalPrice !== undefined
            ? Number(rest.totalPrice)
            : current.unitPrice * qty

        const updated = await prisma.dineInOrderItem.update({
          where: { id },
          data: { ...rest, quantity: qty, totalPrice: total }
        })
        await recalcOrderTotals(prisma, current.orderId)
        return updated
      } catch (err) {
        log.error('updateOrderItem error', err)
        throw err
      }
    }
  )

  ipcMain.handle('restaurant:removeOrderItem', async (_e, itemId: string) => {
    try {
      const item = await prisma.dineInOrderItem.delete({ where: { id: itemId } })
      await recalcOrderTotals(prisma, item.orderId)
      return item
    } catch (err) {
      log.error('removeOrderItem error', err)
      throw err
    }
  })

  ipcMain.handle(
    'restaurant:updateOrderItemStatus',
    async (_e, data: { id: string; status: string }) => {
      try {
        const updateData: any = { status: data.status }
        if (data.status === 'preparing') updateData.firedAt = new Date()
        if (data.status === 'ready') updateData.readyAt = new Date()
        if (data.status === 'served') updateData.servedAt = new Date()

        return await prisma.dineInOrderItem.update({
          where: { id: data.id },
          data: updateData
        })
      } catch (err) {
        log.error('updateOrderItemStatus error', err)
        throw err
      }
    }
  )

  ipcMain.handle(
    'restaurant:fireCourse',
    async (_e, data: { orderId: string; course: string }) => {
      try {
        await prisma.dineInOrderItem.updateMany({
          where: { orderId: data.orderId, course: data.course, status: 'pending' },
          data: { status: 'preparing', firedAt: new Date() }
        })
        return { success: true, orderId: data.orderId, course: data.course }
      } catch (err) {
        log.error('fireCourse error', err)
        throw err
      }
    }
  )

  ipcMain.handle(
    'restaurant:applyDiscount',
    async (
      _e,
      data: {
        orderId: string
        discountType: 'percentage' | 'fixed'
        discountAmount: number
      }
    ) => {
      try {
        await prisma.dineInOrder.update({
          where: { id: data.orderId },
          data: {
            discountType: data.discountType,
            discountAmount: Number(data.discountAmount || 0)
          }
        })
        return await recalcOrderTotals(prisma, data.orderId)
      } catch (err) {
        log.error('applyDiscount error', err)
        throw err
      }
    }
  )

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
      try {
        const payment = await prisma.orderPayment.create({
          data: {
            orderId: data.orderId,
            amount: Number(data.amount),
            paymentMethod: data.paymentMethod || 'cash',
            reference: data.reference || null
          }
        })

        const allPayments = await prisma.orderPayment.findMany({
          where: { orderId: data.orderId }
        })
        const paidTotal = allPayments.reduce(
          (s: number, p: any) => s + p.amount,
          0
        )

        const order = await prisma.dineInOrder.findUnique({
          where: { id: data.orderId }
        })
        if (!order) throw new Error('Order not found')

        const tip = Number(data.tipAmount || 0)
        if (tip > 0) {
          await prisma.dineInOrder.update({
            where: { id: data.orderId },
            data: { tipAmount: (order.tipAmount || 0) + tip }
          })
        }

        // If fully paid, settle, release table, and auto-deduct ingredients
        if (paidTotal >= order.total) {
          await prisma.dineInOrder.update({
            where: { id: data.orderId },
            data: {
              status: 'paid',
              paymentMethod: data.paymentMethod,
              closedAt: new Date()
            }
          })
          await prisma.restaurantTable.update({
            where: { id: order.tableId },
            data: { status: 'cleaning' }
          })

          // Deduct pantry stock for this completed order
          await deductIngredientsForOrder(prisma, data.orderId)
        } else {
          await prisma.dineInOrder.update({
            where: { id: data.orderId },
            data: { status: 'billing' }
          })
        }

        return {
          payment,
          paidTotal,
          remaining: Math.max(0, order.total - paidTotal)
        }
      } catch (err) {
        log.error('processPayment error', err)
        throw err
      }
    }
  )

  ipcMain.handle(
    'restaurant:closeOrder',
    async (
      _e,
      data: {
        orderId: string
        status: 'paid' | 'voided'
        notes?: string
      }
    ) => {
      try {
        const order = await prisma.dineInOrder.update({
          where: { id: data.orderId },
          data: {
            status: data.status,
            closedAt: new Date(),
            ...(data.notes ? { notes: data.notes } : {})
          }
        })
        await prisma.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'available' }
        })

        // Deduct pantry stock if closing directly as paid
        if (data.status === 'paid') {
          await deductIngredientsForOrder(prisma, data.orderId)
        }

        return order
      } catch (err) {
        log.error('closeOrder error', err)
        throw err
      }
    }
  )
}