import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Reservations')

export function registerReservationHandlers(prisma: any) {
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
}
