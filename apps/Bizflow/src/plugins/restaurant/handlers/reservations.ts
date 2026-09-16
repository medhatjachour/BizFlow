import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:Reservations')

export function registerReservationHandlers(prisma: any) {
  ipcMain.handle(
    'restaurant:getReservations',
    async (_e, options?: { date?: string; tableId?: string; status?: string }) => {
      try {
        const where: any = {}
        if (options?.tableId) where.tableId = options.tableId
        if (options?.status) where.status = options.status
        if (options?.date) {
          const d = new Date(options.date)
          const from = new Date(d)
          from.setHours(0, 0, 0, 0)
          const to = new Date(d)
          to.setHours(23, 59, 59, 999)
          where.date = { gte: from, lte: to }
        }
        return await prisma.tableReservation.findMany({
          where,
          include: { table: true },
          orderBy: { date: 'asc' }
        })
      } catch (err) {
        log.error('getReservations error', err)
        throw err
      }
    }
  )

  ipcMain.handle(
    'restaurant:createReservation',
    async (
      _e,
      data: {
        tableId?: string
        customerName: string
        customerPhone?: string
        partySize: number
        date: string
        durationMins?: number
        notes?: string
        guestTags?: string
      }
    ) => {
      try {
        return await prisma.tableReservation.create({
          data: {
            tableId: data.tableId || null,
            customerName: data.customerName,
            customerPhone: data.customerPhone || null,
            partySize: Number(data.partySize || 1),
            date: new Date(data.date),
            durationMins: Number(data.durationMins || 90),
            notes: data.notes || null,
            guestTags: data.guestTags || null,
            status: 'confirmed'
          },
          include: { table: true }
        })
      } catch (err) {
        log.error('createReservation error', err)
        throw err
      }
    }
  )

  ipcMain.handle(
    'restaurant:updateReservation',
    async (_e, data: { id: string; [key: string]: any }) => {
      try {
        const { id, date, partySize, durationMins, ...rest } = data
        const updateData: any = { ...rest }
        if (date) updateData.date = new Date(date)
        if (partySize !== undefined) updateData.partySize = Number(partySize)
        if (durationMins !== undefined) updateData.durationMins = Number(durationMins)

        return await prisma.tableReservation.update({
          where: { id },
          data: updateData,
          include: { table: true }
        })
      } catch (err) {
        log.error('updateReservation error', err)
        throw err
      }
    }
  )

  // Accepts `id` (canonical) or `reservationId` (what the host stand sends).
  ipcMain.handle(
    'restaurant:seatReservation',
    async (
      _e,
      payload: {
        id?: string
        reservationId?: string
        tableId?: string
        serverName?: string
      }
    ) => {
      try {
        const reservationId = payload?.id || payload?.reservationId
        if (!reservationId) throw new Error('Reservation id is required')

        const res = await prisma.tableReservation.findUnique({ where: { id: reservationId } })
        if (!res) throw new Error('Reservation not found')

        const targetTableId = payload.tableId || res.tableId
        if (!targetTableId) throw new Error('No table selected to seat guest')

        // A table can only hold one open check, otherwise two servers end up
        // writing items onto the same bill.
        const existingCheck = await prisma.dineInOrder.findFirst({
          where: { tableId: targetTableId, status: { in: ['open', 'billing'] } }
        })
        if (existingCheck) {
          throw new Error('That table already has an open check — close or move it first')
        }

        const todayStart = new Date(new Date().setHours(0, 0, 0, 0))
        const countToday = await prisma.dineInOrder.count({
          where: { createdAt: { gte: todayStart } }
        })

        // Mark table occupied & reservation seated
        await prisma.restaurantTable.update({
          where: { id: targetTableId },
          data: { status: 'occupied' }
        })
        await prisma.tableReservation.update({
          where: { id: reservationId },
          data: { status: 'seated', tableId: targetTableId }
        })

        // Auto-open an active dine-in order
        const order = await prisma.dineInOrder.create({
          data: {
            tableId: targetTableId,
            orderNumber: countToday + 1,
            orderType: 'dine_in',
            serverName: payload.serverName || 'Host',
            guestCount: res.partySize,
            notes: res.notes ? `Reservation: ${res.notes}` : undefined,
            status: 'open'
          },
          include: { table: true, items: true }
        })

        broadcastRestaurantEvent('table:updated', { id: targetTableId, status: 'occupied' })
        broadcastRestaurantEvent('order:created', { orderId: order.id, tableId: targetTableId })
        return order
      } catch (err) {
        log.error('seatReservation error', err)
        throw err
      }
    }
  )

  ipcMain.handle('restaurant:deleteReservation', async (_e, id: string) => {
    try {
      return await prisma.tableReservation.delete({ where: { id } })
    } catch (err) {
      log.error('deleteReservation error', err)
      throw err
    }
  })
}
