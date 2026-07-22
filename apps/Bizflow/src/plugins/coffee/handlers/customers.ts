// ─── Coffee: Customers Handler ────────────────────────────────────────────────
// Manage coffee shop regulars — CRUD + order history + stats.
//
// IPC channels:
//   coffee:customers:getAll / getById / create / update / delete / search
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Coffee:Customers')

export function registerCustomerHandlers(prisma: any) {
  // List customers with optional search
  ipcMain.handle('coffee:customers:getAll', async (_e, opts?: {
    search?: string; page?: number; pageSize?: number
  }) => {
    try {
      const page     = opts?.page     ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = {}
      if (opts?.search) {
        where.OR = [
          { name:  { contains: opts.search } },
          { phone: { contains: opts.search } },
          { address: { contains: opts.search } }
        ]
      }
      const [total, items] = await Promise.all([
        prisma.coffeeCustomer.count({ where }),
        prisma.coffeeCustomer.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { _count: { select: { orders: true } } }
        })
      ])
      return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    } catch (err) { log.error('customers:getAll', err); throw err }
  })

  ipcMain.handle('coffee:customers:getById', async (_e, id: string) => {
    try {
      return await prisma.coffeeCustomer.findUnique({
        where: { id },
        include: {
          orders: {
            where:   { status: 'paid' },
            orderBy: { closedAt: 'desc' },
            take: 50,
            include: { items: { select: { productName: true, quantity: true, total: true } } }
          },
          _count: { select: { orders: true } }
        }
      })
    } catch (err) { log.error('customers:getById', err); throw err }
  })

  ipcMain.handle('coffee:customers:create', async (_e, data: {
    name: string; phone?: string; address?: string; notes?: string
  }) => {
    try {
      return await prisma.coffeeCustomer.create({ data })
    } catch (err) { log.error('customers:create', err); throw err }
  })

  ipcMain.handle('coffee:customers:update', async (_e, data: {
    id: string; name?: string; phone?: string; address?: string; notes?: string
  }) => {
    try {
      const { id, ...rest } = data
      return await prisma.coffeeCustomer.update({ where: { id }, data: rest })
    } catch (err) { log.error('customers:update', err); throw err }
  })

  ipcMain.handle('coffee:customers:delete', async (_e, id: string) => {
    try {
      // Unlink orders before deleting (set customerId to null)
      await prisma.coffeeOrder.updateMany({ where: { customerId: id }, data: { customerId: null } })
      return await prisma.coffeeCustomer.delete({ where: { id } })
    } catch (err) { log.error('customers:delete', err); throw err }
  })

  ipcMain.handle('coffee:customers:search', async (_e, query: string) => {
    try {
      return await prisma.coffeeCustomer.findMany({
        where: {
          OR: [
            { name:  { contains: query } },
            { phone: { contains: query } }
          ]
        },
        orderBy: { name: 'asc' },
        take: 10
      })
    } catch (err) { log.error('customers:search', err); throw err }
  })
}
