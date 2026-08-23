import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:KDS')

export function registerKdsHandlers(prisma: any) {
  ipcMain.handle('restaurant:getKdsActiveTickets', async (_e, station?: string) => {
    try {
      const itemWhere: any = {
        status: { in: ['pending', 'preparing', 'ready'] }
      }
      if (station && station !== 'All') {
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
            orderBy: [{ course: 'asc' }, { createdAt: 'asc' }]
          }
        },
        orderBy: { openedAt: 'asc' }
      })
    } catch (err) {
      log.error('getKdsActiveTickets error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:bumpKdsItem', async (_e, itemId: string) => {
    try {
      const item = await prisma.dineInOrderItem.findUnique({ where: { id: itemId } })
      if (!item) throw new Error('Item not found')

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
      return await prisma.dineInOrderItem.update({
        where: { id: itemId },
        data: updateData
      })
    } catch (err) {
      log.error('bumpKdsItem error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:bumpKdsTicket', async (_e, orderId: string) => {
    try {
      const pendingOrPrep = await prisma.dineInOrderItem.findFirst({
        where: { orderId, status: { in: ['pending', 'preparing'] } }
      })

      const targetStatus = pendingOrPrep ? 'ready' : 'served'
      const timestampField = targetStatus === 'ready' ? { readyAt: new Date() } : { servedAt: new Date() }

      return await prisma.dineInOrderItem.updateMany({
        where: { orderId, status: { notIn: ['served', 'voided'] } },
        data: { status: targetStatus, ...timestampField }
      })
    } catch (err) {
      log.error('bumpKdsTicket error', err)
      throw err
    }
  })
}