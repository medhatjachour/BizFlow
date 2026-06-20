/**
 * Warehouse order query handlers.
 *   warehouse:getOrders / getJourneyBoard
 * Split out of operations.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Warehouse:Operations')

export function registerWarehouseOrderQueryHandlers(prisma: any) {
  ipcMain.handle('warehouse:getOrders', async (_e, params?: {
    orderType?: string
    status?: string
    workflowStage?: string
    locationId?: string
    search?: string
    skip?: number
    take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.orderType) where.orderType = params.orderType
      if (params?.status) where.status = params.status
      if (params?.workflowStage) where.workflowStage = params.workflowStage
      if (params?.locationId) where.locationId = params.locationId
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [
          { orderNumber: { contains: q } },
          { sourceRef: { contains: q } },
          { partnerName: { contains: q } },
          { notes: { contains: q } }
        ]
      }

      const skip = Number(params?.skip ?? 0)
      const take = Number(params?.take ?? 100)

      const [data, total] = await Promise.all([
        prisma.warehouseOrder.findMany({
          where,
          include: {
            location: { select: { id: true, name: true, code: true } },
            lines: true,
            _count: { select: { lines: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.warehouseOrder.count({ where })
      ])

      return { data, total, hasMore: skip + data.length < total }
    } catch (err) {
      log.error('getOrders error', err)
      throw err
    }
  })

  ipcMain.handle('warehouse:getJourneyBoard', async (_e) => {
    try {
      const [activeOrders, receiving, qc, putaway, picking, packing, shipping] = await Promise.all([
        prisma.warehouseOrder.count({ where: { status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'receiving', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'qc', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'putaway', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'picking', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'packing', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'shipping', status: { in: ['pending', 'processing'] } } })
      ])

      return { activeOrders, receiving, qc, putaway, picking, packing, shipping }
    } catch (err) {
      log.error('getJourneyBoard error', err)
      throw err
    }
  })
}
