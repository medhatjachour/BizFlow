// ─── Coffee: Tables Handler ───────────────────────────────────────────────────
// IPC channels: coffee:tables:getAll / create / update / delete
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Tables')

export function registerTableHandlers(prisma: any) {
  // Return all active tables with their open order count
  ipcMain.handle('coffee:tables:getAll', async () => {
    try {
      return await prisma.coffeeTable.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { orders: true } },
          // Eager-load the single open order (if any) for the floor-map view
          orders: {
            where: { status: 'open' },
            include: {
              items: {
                select: {
                  id: true,
                  productName: true,
                  quantity: true,
                  unitPrice: true,
                  total: true,
                  notes: true,
                  status: true
                }
              }
            },
            take: 1
          }
        },
        orderBy: { number: 'asc' }
      })
    } catch (err) { log.error('tables:getAll', err); throw err }
  })

  ipcMain.handle('coffee:tables:create', async (_e, data: {
    number: number; name?: string; capacity?: number; section?: string
  }) => {
    try {
      return await prisma.coffeeTable.create({ data })
    } catch (err) { log.error('tables:create', err); throw err }
  })

  ipcMain.handle('coffee:tables:update', async (_e, data: {
    id: string; number?: number; name?: string; capacity?: number; section?: string; status?: string
  }) => {
    try {
      const { id, ...rest } = data
      return await prisma.coffeeTable.update({ where: { id }, data: rest })
    } catch (err) { log.error('tables:update', err); throw err }
  })

  // Soft-delete: just flag as inactive so history is preserved
  ipcMain.handle('coffee:tables:delete', async (_e, id: string) => {
    try {
      return await prisma.coffeeTable.update({ where: { id }, data: { isActive: false } })
    } catch (err) { log.error('tables:delete', err); throw err }
  })

  // Return all orders (all statuses) for a specific table — for history view
  ipcMain.handle('coffee:tables:getHistory', async (_e, data: { tableId: string; page?: number; pageSize?: number }) => {
    try {
      const page = data?.page ?? 1
      const pageSize = data?.pageSize ?? 12
      const where = { tableId: data.tableId }
      const [total, items] = await Promise.all([
        prisma.coffeeOrder.count({ where }),
        prisma.coffeeOrder.findMany({
          where,
          include: {
            items: { select: { productName: true, quantity: true, unitPrice: true, total: true, notes: true } },
            cashier: { select: { id: true, username: true, fullName: true } }
          },
          orderBy: { openedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) { log.error('tables:getHistory', err); throw err }
  })
}
