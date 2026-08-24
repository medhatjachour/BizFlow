import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:KDS')

export function registerKdsHandlers(prisma: any) {
  // ─── Get Active KDS Tickets ───────────────────────────────────────────────
  ipcMain.handle('restaurant:getKdsActiveTickets', async (_e, station?: string) => {
    try {
      const itemWhere: any = {
        status: { in: ['pending', 'preparing', 'ready'] }
      }

      if (station && station !== 'All' && station !== 'Expo') {
        itemWhere.station = station
      }

      return await prisma.dineInOrder.findMany({
        where: {
          status: { in: ['open', 'billing'] },
          items: { some: itemWhere }
        },
        include: {
          table: true,
          items: {
            where: itemWhere,
            orderBy: [{ course: 'asc' }, { seatNumber: 'asc' }, { createdAt: 'asc' }]
          }
        },
        orderBy: { openedAt: 'asc' }
      })
    } catch (err) {
      log.error('getKdsActiveTickets error', err)
      throw err
    }
  })

  // ─── Bump Single Item ─────────────────────────────────────────────────────
  ipcMain.handle('restaurant:bumpKdsItem', async (_e, itemId: string) => {
    try {
      const item = await prisma.dineInOrderItem.findUnique({ where: { id: itemId } })
      if (!item) throw new Error('Order item not found')

      let nextStatus = 'preparing'
      const updateData: any = {}

      if (item.status === 'pending') {
        nextStatus = 'preparing'
        updateData.firedAt = new Date()
      } else if (item.status === 'preparing') {
        nextStatus = 'ready'
        updateData.readyAt = new Date()
      } else if (item.status === 'ready') {
        nextStatus = 'served'
        updateData.servedAt = new Date()
      }

      updateData.status = nextStatus
      const updated = await prisma.dineInOrderItem.update({
        where: { id: itemId },
        data: updateData
      })

      broadcastRestaurantEvent('kds:item_bumped', updated)
      return updated
    } catch (err) {
      log.error('bumpKdsItem error', err)
      throw err
    }
  })

  // ─── Bump Full Ticket ─────────────────────────────────────────────────────
  ipcMain.handle('restaurant:bumpKdsTicket', async (_e, orderId: string) => {
    try {
      const pendingOrPrep = await prisma.dineInOrderItem.findFirst({
        where: { orderId, status: { in: ['pending', 'preparing'] } }
      })

      const targetStatus = pendingOrPrep ? 'ready' : 'served'
      const timestampField = targetStatus === 'ready' ? { readyAt: new Date() } : { servedAt: new Date() }

      await prisma.dineInOrderItem.updateMany({
        where: { orderId, status: { notIn: ['served', 'voided'] } },
        data: { status: targetStatus, ...timestampField }
      })

      broadcastRestaurantEvent('kds:ticket_bumped', { orderId, status: targetStatus })
      return { success: true, orderId, status: targetStatus }
    } catch (err) {
      log.error('bumpKdsTicket error', err)
      throw err
    }
  })
}