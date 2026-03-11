/**
 * Restaurant Plugin – IPC Handlers
 * Covers: Tables, Reservations, Menu Items, Dine-In Orders, Overview stats
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../main/utils/logger'

const log = createLogger('Restaurant')

export function registerRestaurantHandlers(prisma: any) {

  // ─── Tables ──────────────────────────────────────────────────────────────

  ipcMain.handle('restaurant:getTables', async () => {
    try {
      return await prisma.restaurantTable.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { orders: true, reservations: true } }
        },
        orderBy: { number: 'asc' }
      })
    } catch (err) { log.error('getTables error', err); throw err }
  })

  ipcMain.handle('restaurant:createTable', async (_e, data: { number: number; capacity: number; section?: string }) => {
    try {
      return await prisma.restaurantTable.create({ data })
    } catch (err) { log.error('createTable error', err); throw err }
  })

  ipcMain.handle('restaurant:updateTable', async (_e, data: { id: string; number?: number; capacity?: number; section?: string; status?: string }) => {
    try {
      const { id, ...rest } = data
      return await prisma.restaurantTable.update({ where: { id }, data: rest })
    } catch (err) { log.error('updateTable error', err); throw err }
  })

  ipcMain.handle('restaurant:deleteTable', async (_e, id: string) => {
    try {
      return await prisma.restaurantTable.update({ where: { id }, data: { isActive: false } })
    } catch (err) { log.error('deleteTable error', err); throw err }
  })

  // ─── Reservations ────────────────────────────────────────────────────────

  ipcMain.handle('restaurant:getReservations', async (_e, options?: { date?: string; tableId?: string }) => {
    try {
      const where: any = {}
      if (options?.tableId) where.tableId = options.tableId
      if (options?.date) {
        const d = new Date(options.date)
        const from = new Date(d); from.setHours(0, 0, 0, 0)
        const to   = new Date(d); to.setHours(23, 59, 59, 999)
        where.date = { gte: from, lte: to }
      }
      return await prisma.tableReservation.findMany({
        where,
        include: { table: { select: { id: true, number: true, capacity: true, section: true } } },
        orderBy: { date: 'asc' }
      })
    } catch (err) { log.error('getReservations error', err); throw err }
  })

  ipcMain.handle('restaurant:createReservation', async (_e, data: {
    tableId: string; customerName: string; customerPhone?: string;
    partySize: number; date: string; notes?: string
  }) => {
    try {
      return await prisma.tableReservation.create({
        data: { ...data, date: new Date(data.date), status: 'confirmed' },
        include: { table: { select: { id: true, number: true } } }
      })
    } catch (err) { log.error('createReservation error', err); throw err }
  })

  ipcMain.handle('restaurant:updateReservation', async (_e, data: { id: string; status?: string; notes?: string; date?: string }) => {
    try {
      const { id, date, ...rest } = data
      return await prisma.tableReservation.update({
        where: { id },
        data: { ...rest, ...(date ? { date: new Date(date) } : {}) }
      })
    } catch (err) { log.error('updateReservation error', err); throw err }
  })

  ipcMain.handle('restaurant:deleteReservation', async (_e, id: string) => {
    try {
      return await prisma.tableReservation.delete({ where: { id } })
    } catch (err) { log.error('deleteReservation error', err); throw err }
  })

  // ─── Menu Items ──────────────────────────────────────────────────────────

  ipcMain.handle('restaurant:getMenuItems', async () => {
    try {
      return await prisma.menuItem.findMany({ orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }] })
    } catch (err) { log.error('getMenuItems error', err); throw err }
  })

  ipcMain.handle('restaurant:createMenuItem', async (_e, data: {
    name: string; category: string; description?: string;
    price: number; cost?: number; preparationTime?: number; notes?: string
  }) => {
    try {
      return await prisma.menuItem.create({ data: { ...data, price: Number(data.price), cost: Number(data.cost ?? 0) } })
    } catch (err) { log.error('createMenuItem error', err); throw err }
  })

  ipcMain.handle('restaurant:updateMenuItem', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, ...rest } = data
      if (rest.price !== undefined) rest.price = Number(rest.price)
      if (rest.cost  !== undefined) rest.cost  = Number(rest.cost)
      return await prisma.menuItem.update({ where: { id }, data: rest })
    } catch (err) { log.error('updateMenuItem error', err); throw err }
  })

  ipcMain.handle('restaurant:deleteMenuItem', async (_e, id: string) => {
    try {
      return await prisma.menuItem.delete({ where: { id } })
    } catch (err) { log.error('deleteMenuItem error', err); throw err }
  })

  // ─── Orders ──────────────────────────────────────────────────────────────

  ipcMain.handle('restaurant:getOrders', async (_e, options?: { status?: string }) => {
    try {
      const where = options?.status ? { status: options.status } : {}
      return await prisma.dineInOrder.findMany({
        where,
        include: {
          table: { select: { id: true, number: true, section: true } },
          items: { include: { menuItem: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }
        },
        orderBy: { openedAt: 'desc' }
      })
    } catch (err) { log.error('getOrders error', err); throw err }
  })

  ipcMain.handle('restaurant:getOrder', async (_e, id: string) => {
    try {
      return await prisma.dineInOrder.findUnique({
        where: { id },
        include: {
          table: { select: { id: true, number: true, section: true } },
          items: { include: { menuItem: true }, orderBy: { createdAt: 'asc' } }
        }
      })
    } catch (err) { log.error('getOrder error', err); throw err }
  })

  ipcMain.handle('restaurant:openOrder', async (_e, data: { tableId: string; serverName?: string; notes?: string }) => {
    try {
      // Mark table as occupied
      await prisma.restaurantTable.update({ where: { id: data.tableId }, data: { status: 'occupied' } })
      return await prisma.dineInOrder.create({
        data: { tableId: data.tableId, serverName: data.serverName, notes: data.notes, status: 'open' },
        include: { table: { select: { id: true, number: true } }, items: true }
      })
    } catch (err) { log.error('openOrder error', err); throw err }
  })

  ipcMain.handle('restaurant:addOrderItem', async (_e, data: {
    orderId: string; menuItemId?: string; itemName: string; quantity: number; unitPrice: number; notes?: string
  }) => {
    try {
      const item = await prisma.dineInOrderItem.create({
        data: { orderId: data.orderId, menuItemId: data.menuItemId || null, itemName: data.itemName, quantity: Number(data.quantity), unitPrice: Number(data.unitPrice), notes: data.notes }
      })
      // Recalculate order totals
      await recalcOrderTotals(prisma, data.orderId)
      return item
    } catch (err) { log.error('addOrderItem error', err); throw err }
  })

  ipcMain.handle('restaurant:removeOrderItem', async (_e, itemId: string) => {
    try {
      const item = await prisma.dineInOrderItem.delete({ where: { id: itemId } })
      await recalcOrderTotals(prisma, item.orderId)
      return item
    } catch (err) { log.error('removeOrderItem error', err); throw err }
  })

  ipcMain.handle('restaurant:updateOrderItemStatus', async (_e, data: { id: string; status: string }) => {
    try {
      return await prisma.dineInOrderItem.update({ where: { id: data.id }, data: { status: data.status } })
    } catch (err) { log.error('updateOrderItemStatus error', err); throw err }
  })

  ipcMain.handle('restaurant:closeOrder', async (_e, data: { orderId: string; status: 'paid' | 'voided' }) => {
    try {
      const order = await prisma.dineInOrder.update({
        where: { id: data.orderId },
        data: { status: data.status, closedAt: new Date() }
      })
      // Free the table
      await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'available' } })
      return order
    } catch (err) { log.error('closeOrder error', err); throw err }
  })

  // ─── Overview ────────────────────────────────────────────────────────────

  ipcMain.handle('restaurant:getOverview', async () => {
    try {
      const [tables, openOrders, todayReservations, menuItems] = await Promise.all([
        prisma.restaurantTable.findMany({ where: { isActive: true }, select: { status: true } }),
        prisma.dineInOrder.count({ where: { status: 'open' } }),
        prisma.tableReservation.count({
          where: {
            date: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) },
            status: { in: ['confirmed', 'pending'] }
          }
        }),
        prisma.menuItem.count({ where: { isAvailable: true } })
      ])

      const statusCounts = tables.reduce<Record<string, number>>((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1; return acc
      }, {})

      return {
        totalTables:      tables.length,
        available:        statusCounts['available'] || 0,
        occupied:         statusCounts['occupied']  || 0,
        reserved:         statusCounts['reserved']  || 0,
        cleaning:         statusCounts['cleaning']  || 0,
        openOrders,
        todayReservations,
        availableMenuItems: menuItems
      }
    } catch (err) { log.error('getOverview error', err); throw err }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function recalcOrderTotals(prisma: any, orderId: string) {
  const items = await prisma.dineInOrderItem.findMany({ where: { orderId } })
  const subtotal = items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0)
  const tax = 0 // tax logic can be extended here
  await prisma.dineInOrder.update({ where: { id: orderId }, data: { subtotal, tax, total: subtotal + tax } })
}
