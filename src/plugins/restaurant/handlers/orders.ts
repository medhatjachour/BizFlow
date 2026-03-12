import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Orders')

async function recalcOrderTotals(prisma: any, orderId: string) {
  const items = await prisma.dineInOrderItem.findMany({ where: { orderId } })
  const subtotal = items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0)
  const tax = 0
  await prisma.dineInOrder.update({ where: { id: orderId }, data: { subtotal, tax, total: subtotal + tax } })
}

export function registerOrderHandlers(prisma: any) {
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
      await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'available' } })
      return order
    } catch (err) { log.error('closeOrder error', err); throw err }
  })
}
