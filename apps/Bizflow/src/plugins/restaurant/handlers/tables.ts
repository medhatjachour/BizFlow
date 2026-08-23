import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Tables')

export function registerTableHandlers(prisma: any) {
  ipcMain.handle('restaurant:getTables', async () => {
    try {
      return await prisma.restaurantTable.findMany({
        where: { isActive: true },
        include: {
          orders: {
            where: { status: { in: ['open', 'billing'] } },
            include: {
              items: true,
              payments: true
            }
          },
          reservations: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999))
              },
              status: { in: ['confirmed', 'pending'] }
            },
            orderBy: { date: 'asc' }
          },
          _count: { select: { orders: true, reservations: true } }
        },
        orderBy: [{ section: 'asc' }, { number: 'asc' }]
      })
    } catch (err) {
      log.error('getTables error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:createTable', async (_e, data: {
    number: number
    capacity: number
    section?: string
    name?: string
    shape?: string
    posX?: number
    posY?: number
  }) => {
    try {
      return await prisma.restaurantTable.create({
        data: {
          number: Number(data.number),
          capacity: Number(data.capacity || 4),
          section: data.section || 'Main Hall',
          name: data.name || `Table ${data.number}`,
          shape: data.shape || 'square',
          posX: Number(data.posX || 0),
          posY: Number(data.posY || 0),
          status: 'available'
        }
      })
    } catch (err) {
      log.error('createTable error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:updateTable', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, ...rest } = data
      if (rest.number !== undefined) rest.number = Number(rest.number)
      if (rest.capacity !== undefined) rest.capacity = Number(rest.capacity)
      if (rest.posX !== undefined) rest.posX = Number(rest.posX)
      if (rest.posY !== undefined) rest.posY = Number(rest.posY)
      return await prisma.restaurantTable.update({ where: { id }, data: rest })
    } catch (err) {
      log.error('updateTable error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:updateTablePosition', async (_e, data: { id: string; posX: number; posY: number }) => {
    try {
      return await prisma.restaurantTable.update({
        where: { id: data.id },
        data: { posX: Number(data.posX), posY: Number(data.posY) }
      })
    } catch (err) {
      log.error('updateTablePosition error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:transferTable', async (_e, data: { fromTableId: string; toTableId: string }) => {
    try {
      const { fromTableId, toTableId } = data
      const openOrder = await prisma.dineInOrder.findFirst({
        where: { tableId: fromTableId, status: { in: ['open', 'billing'] } }
      })
      if (!openOrder) throw new Error('Source table has no active open order to transfer')

      const destinationOrder = await prisma.dineInOrder.findFirst({
        where: { tableId: toTableId, status: { in: ['open', 'billing'] } }
      })
      if (destinationOrder) throw new Error('Target table is currently occupied')

      // Move order to target table and swap table statuses
      const updatedOrder = await prisma.dineInOrder.update({
        where: { id: openOrder.id },
        data: { tableId: toTableId }
      })
      await prisma.restaurantTable.update({ where: { id: fromTableId }, data: { status: 'available' } })
      await prisma.restaurantTable.update({ where: { id: toTableId }, data: { status: 'occupied' } })

      return updatedOrder
    } catch (err) {
      log.error('transferTable error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:mergeTables', async (_e, data: { sourceTableId: string; targetTableId: string }) => {
    try {
      const { sourceTableId, targetTableId } = data
      const sourceOrder = await prisma.dineInOrder.findFirst({
        where: { tableId: sourceTableId, status: { in: ['open', 'billing'] } },
        include: { items: true }
      })
      const targetOrder = await prisma.dineInOrder.findFirst({
        where: { tableId: targetTableId, status: { in: ['open', 'billing'] } }
      })
      if (!sourceOrder || !targetOrder) throw new Error('Both tables must have active open orders to merge')

      // Transfer all items from source order to target order
      await prisma.dineInOrderItem.updateMany({
        where: { orderId: sourceOrder.id },
        data: { orderId: targetOrder.id }
      })

      // Void the source order and release source table
      await prisma.dineInOrder.update({
        where: { id: sourceOrder.id },
        data: { status: 'voided', notes: `Merged into Table order ${targetOrder.id}` }
      })
      await prisma.restaurantTable.update({ where: { id: sourceTableId }, data: { status: 'available' } })

      // Recalculate target order totals
      const items = await prisma.dineInOrderItem.findMany({ where: { orderId: targetOrder.id } })
      const subtotal = items.reduce((s: number, i: any) => s + (i.totalPrice || i.unitPrice * i.quantity), 0)
      const tax = subtotal * (targetOrder.taxRate || 0)
      const total = subtotal + tax + (targetOrder.serviceCharge || 0) - (targetOrder.discountAmount || 0)

      return await prisma.dineInOrder.update({
        where: { id: targetOrder.id },
        data: { subtotal, tax, total }
      })
    } catch (err) {
      log.error('mergeTables error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:deleteTable', async (_e, id: string) => {
    try {
      return await prisma.restaurantTable.update({ where: { id }, data: { isActive: false } })
    } catch (err) {
      log.error('deleteTable error', err)
      throw err
    }
  })
}