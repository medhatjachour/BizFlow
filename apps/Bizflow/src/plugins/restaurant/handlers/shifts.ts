// src/restaurant/handlers/shifts.ts
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { roundMoney } from '../utils/mathEngine'
import { broadcastRestaurantEvent } from '../utils/events'

const log = createLogger('Restaurant:Shifts')

export function registerShiftHandlers(prisma: any) {
  // ─── Get Active Shift ─────────────────────────────────────────────────────
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

  // ─── Get Shift History & Cash Audits ──────────────────────────────────────
  ipcMain.handle('restaurant:getShiftHistory', async (_e, options?: {
    startDate?: string
    endDate?: string
    serverId?: string
    status?: string
    limit?: number
  }) => {
    try {
      const where: any = {}
      if (options?.status) where.status = options.status
      if (options?.serverId) where.serverId = options.serverId
      if (options?.startDate || options?.endDate) {
        where.openedAt = {}
        if (options.startDate) where.openedAt.gte = new Date(options.startDate)
        if (options.endDate) where.openedAt.lte = new Date(options.endDate)
      }

      return await prisma.restaurantShift.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        take: options?.limit || 50
      })
    } catch (err) {
      log.error('getShiftHistory error', err)
      throw err
    }
  })

  // ─── Open New Shift ───────────────────────────────────────────────────────
  ipcMain.handle('restaurant:openShift', async (_e, data: { serverId: string; serverName: string; startCash: number }) => {
    try {
      const existing = await prisma.restaurantShift.findFirst({
        where: { serverId: data.serverId, status: 'active' }
      })
      if (existing) {
        throw new Error(`Server ${data.serverName} already has an active open drawer session.`)
      }

      const shift = await prisma.restaurantShift.create({
        data: {
          serverId: data.serverId,
          serverName: data.serverName,
          startCash: roundMoney(Number(data.startCash || 0)),
          status: 'active'
        }
      })
      broadcastRestaurantEvent('shift:changed', shift)
      return shift
    } catch (err) {
      log.error('openShift error', err)
      throw err
    }
  })

  // ─── Close Shift & Lock Ledger ────────────────────────────────────────────
  ipcMain.handle('restaurant:closeShift', async (_e, data: { id: string; endCash: number; notes?: string }) => {
    return await prisma.$transaction(async (tx: any) => {
      const shift = await tx.restaurantShift.findUnique({ where: { id: data.id } })
      if (!shift) throw new Error('Shift not found')

      const orders = await tx.dineInOrder.findMany({
        where: {
          serverId: shift.serverId,
          status: 'paid',
          closedAt: { gte: shift.openedAt }
        },
        include: { payments: true }
      })

      const totalSales = roundMoney(orders.reduce((s: number, o: any) => s + (o.total || 0), 0))
      const totalTips = roundMoney(orders.reduce((s: number, o: any) => s + (o.tipAmount || 0), 0))

      const closed = await tx.restaurantShift.update({
        where: { id: data.id },
        data: {
          endCash: roundMoney(Number(data.endCash || 0)),
          totalSales,
          totalTips,
          notes: data.notes || null,
          status: 'closed',
          closedAt: new Date()
        }
      })

      broadcastRestaurantEvent('shift:changed', closed)
      return closed
    })
  })

  // ─── Generate Detailed Z-Report Audit ─────────────────────────────────────
  ipcMain.handle('restaurant:getZReportData', async (_e, shiftId: string) => {
    try {
      const shift = await prisma.restaurantShift.findUnique({ where: { id: shiftId } })
      if (!shift) throw new Error('Shift not found')

      const orders = await prisma.dineInOrder.findMany({
        where: {
          serverId: shift.serverId,
          openedAt: { gte: shift.openedAt },
          ...(shift.closedAt ? { closedAt: { lte: shift.closedAt } } : {})
        },
        include: { payments: true, items: { include: { menuItem: true } } }
      })

      const paymentBreakdown: Record<string, number> = {}
      const categoryRevenue: Record<string, number> = {}
      let totalDiscounts = 0
      let totalVoids = 0
      let grossSales = 0
      let cashSales = 0
      let cardSales = 0

      orders.forEach((o: any) => {
        if (o.status === 'voided') {
          totalVoids += o.total || 0
          return
        }

        grossSales += o.total || 0
        totalDiscounts += o.discountAmount || 0

        o.payments.forEach((p: any) => {
          paymentBreakdown[p.paymentMethod] = roundMoney(
            (paymentBreakdown[p.paymentMethod] || 0) + p.amount
          )
          if (p.paymentMethod === 'cash') cashSales += p.amount
          else cardSales += p.amount
        })

        o.items.forEach((item: any) => {
          const cat = item.menuItem?.category || 'General'
          categoryRevenue[cat] = roundMoney(
            (categoryRevenue[cat] || 0) + (item.totalPrice || item.unitPrice * item.quantity)
          )
        })
      })

      const expectedCash = roundMoney(shift.startCash + cashSales)
      const variance = shift.endCash !== null ? roundMoney(shift.endCash - expectedCash) : 0

      return {
        shift,
        ordersCount: orders.filter((o) => o.status !== 'voided').length,
        grossSales: roundMoney(grossSales),
        cashSales: roundMoney(cashSales),
        cardSales: roundMoney(cardSales),
        totalTips: roundMoney(shift.totalTips),
        startCash: roundMoney(shift.startCash),
        endCash: shift.endCash !== null ? roundMoney(shift.endCash) : null,
        expectedCash,
        variance,
        totalDiscounts: roundMoney(totalDiscounts),
        totalVoids: roundMoney(totalVoids),
        paymentBreakdown,
        categoryRevenue
      }
    } catch (err) {
      log.error('getZReportData error', err)
      throw err
    }
  })
}