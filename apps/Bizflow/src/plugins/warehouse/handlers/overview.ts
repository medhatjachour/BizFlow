import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Warehouse:Overview')

export function registerWarehouseOverviewHandlers(prisma: any) {
  ipcMain.handle('warehouse:getOverview', async () => {
    try {
      const [totalLocations, totalSKUs, pendingTransfers, recentTransfers, activeOrders, inboundPending, outboundPending, recentMovements] = await Promise.all([
        prisma.warehouseLocation.count({ where: { isActive: true } }),
        prisma.warehouseStock.count(),
        prisma.stockTransfer.count({ where: { status: { in: ['draft', 'in_transit'] } } }),
        prisma.stockTransfer.findMany({
          take: 5,
          orderBy: { transferDate: 'desc' },
          include: {
            fromLocation: { select: { name: true, code: true } },
            toLocation:   { select: { name: true, code: true } },
            _count: { select: { items: true } }
          }
        }),
        prisma.warehouseOrder.count({ where: { status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { status: { in: ['pending', 'processing'] }, orderType: 'inbound' } }),
        prisma.warehouseOrder.count({ where: { status: { in: ['pending', 'processing'] }, orderType: 'outbound' } }),
        prisma.warehouseStockMovement.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { location: { select: { id: true, name: true, code: true } } }
        })
      ])

      const lowStockItems = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM WarehouseStock WHERE quantity <= minQuantity AND minQuantity > 0
      `.catch(() => [{ count: 0 }])
      const lowStockCount = Number(lowStockItems[0]?.count ?? 0)

      return {
        totalLocations,
        totalSKUs,
        pendingTransfers,
        lowStockCount,
        activeOrders,
        inboundPending,
        outboundPending,
        recentTransfers,
        recentMovements
      }
    } catch (err) { log.error('getOverview error', err); throw err }
  })
}
