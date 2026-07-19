// ─── Coffee: Shifts Handler ────────────────────────────────────────────────────
// Manages cashier work shifts — open at start of day, close at end.
// Each shift accumulates sales totals per payment method.
//
// IPC channels:
//   coffee:shifts:getActive / getHistory / open / close
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Shifts')

export function registerShiftHandlers(prisma: any) {
  // Return the currently open shift (if any)
  ipcMain.handle('coffee:shifts:getActive', async () => {
    try {
      return await prisma.coffeeShift.findFirst({
        where: { status: 'open' },
        include: {
          cashier: { select: { id: true, username: true, fullName: true } },
          _count:  { select: { orders: true } },
          orders: {
            select: {
              id: true,
              orderNumber: true,
              type: true,
              status: true,
              total: true,
              subtotal: true,
              paymentMethod: true,
              customerName: true,
              openedAt: true,
              closedAt: true,
              table: { select: { number: true, name: true } }
            },
            orderBy: { openedAt: 'desc' },
            take: 10
          }
        },
        orderBy: { openedAt: 'desc' }
      })
    } catch (err) { log.error('shifts:getActive', err); throw err }
  })

  // Paginated shift history (closed + open)
  ipcMain.handle('coffee:shifts:getHistory', async (_e, opts?: {
    startDate?: string; endDate?: string; status?: string; page?: number; pageSize?: number
  }) => {
    try {
      const page     = opts?.page     ?? 1
      const pageSize = opts?.pageSize ?? 30
      const where: any = {}
      if (opts?.status && opts.status !== 'all') where.status = opts.status
      if (opts?.startDate || opts?.endDate) {
        where.openedAt = {}
        if (opts?.startDate) where.openedAt.gte = new Date(opts.startDate)
        if (opts?.endDate)   where.openedAt.lte = new Date(opts.endDate)
      }

      const [total, items] = await Promise.all([
        prisma.coffeeShift.count({ where }),
        prisma.coffeeShift.findMany({
          where,
          include: {
            cashier: { select: { id: true, username: true, fullName: true } },
            _count:  { select: { orders: true } },
            orders: {
              select: {
                id: true,
                orderNumber: true,
                type: true,
                status: true,
                total: true,
                paymentMethod: true,
                customerName: true,
                openedAt: true,
                closedAt: true
              },
              orderBy: { openedAt: 'desc' },
              take: 5
            }
          },
          orderBy: { openedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) { log.error('shifts:getHistory', err); throw err }
  })

  ipcMain.handle('coffee:shifts:getSummary', async (_e, opts?: {
    startDate?: string; endDate?: string
  }) => {
    try {
      const where: any = {}
      if (opts?.startDate || opts?.endDate) {
        where.openedAt = {}
        if (opts.startDate) where.openedAt.gte = new Date(opts.startDate)
        if (opts.endDate) where.openedAt.lte = new Date(opts.endDate)
      }

      const shifts = await prisma.coffeeShift.findMany({
        where,
        include: {
          cashier: { select: { id: true, username: true, fullName: true } }
        }
      })

      const cashierMap = new Map<string, { id: string; name: string; shifts: number; revenue: number; orders: number }>()
      let totalSales = 0
      let totalOrders = 0
      let totalOpeningCash = 0
      let totalCashDifference = 0
      let longestMinutes = 0
      let closedShifts = 0

      for (const shift of shifts) {
        totalSales += Number(shift.totalSales || 0)
        totalOrders += Number(shift.totalOrders || 0)
        totalOpeningCash += Number(shift.openingCash || 0)
        totalCashDifference += Number(shift.cashDifference || 0)
        if (shift.status === 'closed') closedShifts += 1

        const end = shift.closedAt ? new Date(shift.closedAt) : new Date()
        const mins = Math.floor((end.getTime() - new Date(shift.openedAt).getTime()) / 60000)
        if (mins > longestMinutes) longestMinutes = mins

        const key = shift.cashier.id
        const row = cashierMap.get(key) || {
          id: shift.cashier.id,
          name: shift.cashier.fullName || shift.cashier.username,
          shifts: 0,
          revenue: 0,
          orders: 0
        }
        row.shifts += 1
        row.revenue += Number(shift.totalSales || 0)
        row.orders += Number(shift.totalOrders || 0)
        cashierMap.set(key, row)
      }

      return {
        totalShifts: shifts.length,
        closedShifts,
        totalSales,
        totalOrders,
        averageShiftSales: shifts.length > 0 ? totalSales / shifts.length : 0,
        averageOrdersPerShift: shifts.length > 0 ? totalOrders / shifts.length : 0,
        averageOpeningCash: shifts.length > 0 ? totalOpeningCash / shifts.length : 0,
        averageCashDifference: closedShifts > 0 ? totalCashDifference / closedShifts : 0,
        longestShiftMinutes: longestMinutes,
        topCashiers: Array.from(cashierMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      }
    } catch (err) { log.error('shifts:getSummary', err); throw err }
  })

  ipcMain.handle('coffee:shifts:getDetails', async (_e, shiftId: string) => {
    try {
      return await prisma.coffeeShift.findUnique({
        where: { id: shiftId },
        include: {
          cashier: { select: { id: true, username: true, fullName: true } },
          orders: {
            include: {
              table: { select: { number: true, name: true } },
              items: { select: { productName: true, quantity: true, total: true } }
            },
            orderBy: { openedAt: 'desc' }
          },
          _count: { select: { orders: true } }
        }
      })
    } catch (err) { log.error('shifts:getDetails', err); throw err }
  })

  // Open a new shift (only one shift may be open at a time)
  ipcMain.handle('coffee:shifts:open', async (_e, data: {
    cashierId: string; openingCash?: number; notes?: string
  }) => {
    try {
      const existing = await prisma.coffeeShift.findFirst({ where: { status: 'open' } })
      if (existing) throw new Error('A shift is already open — close it before opening a new one.')

      return await prisma.coffeeShift.create({
        data: {
          cashierId:    data.cashierId,
          openingCash:  data.openingCash ?? 0,
          notes:        data.notes ?? null,
          status:       'open'
        },
        include: { cashier: { select: { id: true, username: true, fullName: true } } }
      })
    } catch (err) { log.error('shifts:open', err); throw err }
  })

  // Close the active shift — record closing cash and compute difference
  ipcMain.handle('coffee:shifts:close', async (_e, data: {
    shiftId: string; closingCash: number; notes?: string
  }) => {
    try {
      const shift = await prisma.coffeeShift.findUniqueOrThrow({ where: { id: data.shiftId } })
      // Cash difference = actual counted cash − expected (opening + cash sales)
      const cashDifference = Number(data.closingCash) - (shift.openingCash + shift.cashTotal)

      return await prisma.coffeeShift.update({
        where: { id: data.shiftId },
        data: {
          status:         'closed',
          closingCash:    Number(data.closingCash),
          cashDifference,
          closedAt:       new Date(),
          notes:          data.notes ?? shift.notes
        },
        include: { cashier: { select: { id: true, username: true, fullName: true } } }
      })
    } catch (err) { log.error('shifts:close', err); throw err }
  })
}
