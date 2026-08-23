import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Shifts')

export function registerShiftHandlers(prisma: any) {
  ipcMain.handle('restaurant:getActiveShift', async (_e, serverId?: string) => {
    try {
      const where: any = { status: 'active' }
      if (serverId) where.serverId = serverId
      return await prisma.restaurantShift.findFirst({
        where,
        orderBy: { openedAt: 'desc' }
      })
    } catch (err) {
      log.error('getActiveShift error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:openShift', async (_e, data: { serverId: string; serverName: string; startCash: number }) => {
    try {
      return await prisma.restaurantShift.create({
        data: {
          serverId: data.serverId,
          serverName: data.serverName,
          startCash: Number(data.startCash || 0),
          status: 'active'
        }
      })
    } catch (err) {
      log.error('openShift error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:closeShift', async (_e, data: { id: string; endCash: number; notes?: string }) => {
    try {
      const shift = await prisma.restaurantShift.findUnique({ where: { id: data.id } })
      if (!shift) throw new Error('Shift not found')

      const orders = await prisma.dineInOrder.findMany({
        where: {
          serverId: shift.serverId,
          status: 'paid',
          closedAt: { gte: shift.openedAt }
        }
      })

      const totalSales = orders.reduce((s: number, o: any) => s + (o.total || 0), 0)
      const totalTips = orders.reduce((s: number, o: any) => s + (o.tipAmount || 0), 0)

      return await prisma.restaurantShift.update({
        where: { id: data.id },
        data: {
          endCash: Number(data.endCash || 0),
          totalSales,
          totalTips,
          notes: data.notes || null,
          status: 'closed',
          closedAt: new Date()
        }
      })
    } catch (err) {
      log.error('closeShift error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:getZReportData', async (_e, shiftId: string) => {
    try {
      const shift = await prisma.restaurantShift.findUnique({ where: { id: shiftId } })
      if (!shift) throw new Error('Shift not found')

      const orders = await prisma.dineInOrder.findMany({
        where: {
          openedAt: { gte: shift.openedAt },
          ...(shift.closedAt ? { closedAt: { lte: shift.closedAt } } : {})
        },
        include: { payments: true, items: true }
      })

      const paymentMethodMap: Record<string, number> = {}
      let totalDiscounts = 0
      let totalVoids = 0

      orders.forEach((o: any) => {
        if (o.status === 'voided') totalVoids += o.total || 0
        totalDiscounts += o.discountAmount || 0
        o.payments.forEach((p: any) => {
          paymentMethodMap[p.paymentMethod] = (paymentMethodMap[p.paymentMethod] || 0) + p.amount
        })
      })

      return {
        shift,
        ordersCount: orders.length,
        totalSales: shift.totalSales,
        totalTips: shift.totalTips,
        startCash: shift.startCash,
        endCash: shift.endCash,
        totalDiscounts,
        totalVoids,
        paymentBreakdown: paymentMethodMap
      }
    } catch (err) {
      log.error('getZReportData error', err)
      throw err
    }
  })
}