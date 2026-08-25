import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { recalcOrderTotalsInTx } from './orders'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:Tables')

export function registerTableHandlers(prisma: any) {
  // ─── Get Tables ───────────────────────────────────────────────────────────
  ipcMain.handle('restaurant:getTables', async () => {
    try {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0))
      const todayEnd = new Date(new Date().setHours(23, 59, 59, 999))

      return await prisma.restaurantTable.findMany({
        where: { isActive: true },
        include: {
          orders: {
            where: { status: { in: ['open', 'billing'] } },
            include: {
              items: { orderBy: [{ seatNumber: 'asc' }, { createdAt: 'asc' }] },
              payments: true
            }
          },
          reservations: {
            where: {
              date: { gte: todayStart, lte: todayEnd },
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

  // ─── Create Table ─────────────────────────────────────────────────────────
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
      const table = await prisma.restaurantTable.create({
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
      broadcastRestaurantEvent('table:updated', table)
      return table
    } catch (err) {
      log.error('createTable error', err)
      throw err
    }
  })

  // ─── Update Table ─────────────────────────────────────────────────────────
  ipcMain.handle('restaurant:updateTable', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, ...rest } = data
      if (rest.number !== undefined) rest.number = Number(rest.number)
      if (rest.capacity !== undefined) rest.capacity = Number(rest.capacity)
      if (rest.posX !== undefined) rest.posX = Number(rest.posX)
      if (rest.posY !== undefined) rest.posY = Number(rest.posY)

      const table = await prisma.restaurantTable.update({ where: { id }, data: rest })
      broadcastRestaurantEvent('table:updated', table)
      return table
    } catch (err) {
      log.error('updateTable error', err)
      throw err
    }
  })

  // ─── Update Table Position ────────────────────────────────────────────────
  ipcMain.handle('restaurant:updateTablePosition', async (_e, data: { id: string; posX: number; posY: number }) => {
    try {
      const table = await prisma.restaurantTable.update({
        where: { id: data.id },
        data: { posX: Number(data.posX), posY: Number(data.posY) }
      })
      broadcastRestaurantEvent('table:updated', table)
      return table
    } catch (err) {
      log.error('updateTablePosition error', err)
      throw err
    }
  })

  // ─── Atomic Transfer Table ────────────────────────────────────────────────
  ipcMain.handle('restaurant:transferTable', async (_e, data: { fromTableId: string; toTableId: string }) => {
    return await prisma.$transaction(async (tx: any) => {
      const openOrder = await tx.dineInOrder.findFirst({
        where: { tableId: data.fromTableId, status: { in: ['open', 'billing'] } }
      })
      if (!openOrder) throw new Error('Source table has no active order to transfer')

      const destOrder = await tx.dineInOrder.findFirst({
        where: { tableId: data.toTableId, status: { in: ['open', 'billing'] } }
      })
      if (destOrder) throw new Error('Destination table is currently occupied')

      // Move order and swap statuses
      const updatedOrder = await tx.dineInOrder.update({
        where: { id: openOrder.id },
        data: { tableId: data.toTableId }
      })

      await tx.restaurantTable.update({ where: { id: data.fromTableId }, data: { status: 'available' } })
      await tx.restaurantTable.update({ where: { id: data.toTableId }, data: { status: 'occupied' } })

      broadcastRestaurantEvent('table:updated', { id: data.fromTableId, status: 'available' })
      broadcastRestaurantEvent('table:updated', { id: data.toTableId, status: 'occupied' })
      broadcastRestaurantEvent('order:updated', updatedOrder)

      return updatedOrder
    })
  })

  // ─── Atomic Merge Tables ──────────────────────────────────────────────────
  ipcMain.handle('restaurant:mergeTables', async (_e, data: { sourceTableId: string; targetTableId: string }) => {
    return await prisma.$transaction(async (tx: any) => {
      const sourceOrder = await tx.dineInOrder.findFirst({
        where: { tableId: data.sourceTableId, status: { in: ['open', 'billing'] } },
        include: { items: true, payments: true }
      })
      const targetOrder = await tx.dineInOrder.findFirst({
        where: { tableId: data.targetTableId, status: { in: ['open', 'billing'] } }
      })

      if (!sourceOrder || !targetOrder) {
        throw new Error('Both tables must have active open checks to merge')
      }

      // Reassign all order items and payments to target order
      await tx.dineInOrderItem.updateMany({
        where: { orderId: sourceOrder.id },
        data: { orderId: targetOrder.id }
      })

      await tx.orderPayment.updateMany({
        where: { orderId: sourceOrder.id },
        data: { orderId: targetOrder.id }
      })

      // Void the source order and release table
      await tx.dineInOrder.update({
        where: { id: sourceOrder.id },
        data: { status: 'voided', notes: `Merged into Table order #${targetOrder.id}` }
      })

      await tx.restaurantTable.update({
        where: { id: data.sourceTableId },
        data: { status: 'available' }
      })

      broadcastRestaurantEvent('table:updated', { id: data.sourceTableId, status: 'available' })

      // Recalculate target check
      return await recalcOrderTotalsInTx(tx, targetOrder.id)
    })
  })

  // ─── Delete Table ─────────────────────────────────────────────────────────
  ipcMain.handle('restaurant:deleteTable', async (_e, id: string) => {
    try {
      const table = await prisma.restaurantTable.update({
        where: { id },
        data: { isActive: false }
      })
      broadcastRestaurantEvent('table:updated', table)
      return table
    } catch (err) {
      log.error('deleteTable error', err)
      throw err
    }
  })
}