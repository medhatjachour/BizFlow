/**
 * Dashboard IPC Handlers
 * Handles dashboard metrics and statistics
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'
import { cacheService, CacheKeys } from '../../services/CacheService'

const log = createLogger('Dashboard')

export function registerDashboardHandlers(prisma: any) {
  ipcMain.handle('dashboard:getMetrics', async () => {
    try {
      if (prisma) {
        // Lifetime metrics change only when a sale is created/refunded, so cache
        // them. The expensive part is the full-table profit scan below; serving it
        // from cache keeps the dashboard snappy (invalidated on sale mutations).
        return await cacheService.getOrCompute(CacheKeys.DASHBOARD_METRICS, async () => {
          const totalSales = await prisma.saleTransaction.aggregate({
            where: { status: 'completed' },
            _sum: { total: true },
            _count: true
          })

          // Gross profit = (unit final price − unit cost) × qty.
          // SaleItem has no cost column; cost lives on the variant (preferred) or
          // the product's baseCost. LEFT JOIN variant so simple products still work.
          const profitData: Array<{ profit: number | null }> = await prisma.$queryRaw`
            SELECT SUM((si.finalPrice - COALESCE(pv.cost, p.baseCost, 0)) * si.quantity) as profit
            FROM SaleItem si
            JOIN SaleTransaction st ON si.transactionId = st.id
            JOIN Product p ON si.productId = p.id
            LEFT JOIN ProductVariant pv ON si.variantId = pv.id
            WHERE st.status = 'completed'
          `
          const profit = profitData[0]?.profit || 0

          return {
            sales: totalSales._sum.total || 0,
            orders: totalSales._count || 0,
            profit: Math.round(profit * 100) / 100
          }
        })
      }

      return { sales: 0, orders: 0, profit: 0 }
    } catch (error) {
      log.error('Error fetching dashboard metrics:', error)
      throw error
    }
  })

  /**
   * Daily revenue/count aggregation for the SalesChart.
   * Returns { date: 'YYYY-MM-DD', total: number, count: number }[]
   * This replaces loading thousands of full transactions in the renderer.
   */
  ipcMain.handle('dashboard:getSalesChart', async (_, { startDate, endDate }: { startDate: string; endDate: string }) => {
    try {
      if (!prisma) return []
      const rows: Array<{ date: string; total: number | bigint; count: number | bigint }> =
        await prisma.$queryRaw`
          SELECT
            strftime('%Y-%m-%d', datetime(createdAt / 1000, 'unixepoch')) AS date,
            CAST(SUM(total) AS REAL)                                       AS total,
            COUNT(*)                                                       AS count
          FROM SaleTransaction
          WHERE createdAt >= ${new Date(startDate).getTime()}
            AND createdAt <= ${new Date(endDate).getTime()}
            AND status IN ('completed', 'partially_refunded')
          GROUP BY strftime('%Y-%m-%d', datetime(createdAt / 1000, 'unixepoch'))
          ORDER BY date ASC
        `
      return rows.map((r) => ({
        date: r.date,
        total: Number(r.total),
        count: Number(r.count),
      }))
    } catch (error) {
      log.error('Error fetching sales chart data:', error)
      return []
    }
  })

  /**
   * Top-N products by revenue for the TopProducts widget.
   * Returns { productId, name, revenue, quantity }[]
   * This replaces a full 30-day transaction + item fetch + client-side aggregation.
   */
  ipcMain.handle('dashboard:getTopProducts', async (_, { startDate, endDate, limit = 5 }: { startDate: string; endDate: string; limit?: number }) => {
    try {
      if (!prisma) return []
      const rows: Array<{ productId: string; name: string; revenue: number | bigint; quantity: number | bigint }> =
        await prisma.$queryRaw`
          SELECT
            si.productId,
            p.name,
            CAST(SUM(si.total) AS REAL) AS revenue,
            SUM(si.quantity)            AS quantity
          FROM SaleItem si
          JOIN SaleTransaction st ON si.transactionId = st.id
          JOIN Product p           ON si.productId   = p.id
          WHERE st.createdAt >= ${new Date(startDate).getTime()}
            AND st.createdAt <= ${new Date(endDate).getTime()}
            AND st.status = 'completed'
          GROUP BY si.productId, p.name
          ORDER BY revenue DESC
          LIMIT ${limit}
        `
      return rows.map((r) => ({
        productId: r.productId,
        name: r.name,
        revenue: Number(r.revenue),
        quantity: Number(r.quantity),
      }))
    } catch (error) {
      log.error('Error fetching top products:', error)
      return []
    }
  })

  /**
   * Latest N completed transactions for the RecentActivity widget.
   * Returns a lightweight summary — no items, no nested relations.
   */
  ipcMain.handle('dashboard:getRecentActivity', async (_, { limit = 10 }: { limit?: number } = {}) => {
    try {
      if (!prisma) return []
      const transactions = await prisma.saleTransaction.findMany({
        where: { status: 'completed' },
        select: {
          id: true,
          total: true,
          paymentMethod: true,
          createdAt: true,
          customer: { select: { name: true } },
          user: { select: { username: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return transactions.map((t: any) => ({ ...t, itemCount: t._count.items, _count: undefined }))
    } catch (error) {
      log.error('Error fetching recent activity:', error)
      return []
    }
  })

  /**
   * Day-range totals for the main dashboard stats (today / yesterday).
   * Returns { total: number, count: number } — no row-level data shipped over IPC.
   */
  ipcMain.handle('dashboard:getDayStats', async (_, { startDate, endDate }: { startDate: string; endDate: string }) => {
    try {
      if (!prisma) return { total: 0, count: 0 }
      const result = await prisma.saleTransaction.aggregate({
        where: {
          status: { in: ['completed', 'partially_refunded'] },
          createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        _sum: { total: true },
        _count: true,
      })
      return { total: result._sum.total ?? 0, count: result._count ?? 0 }
    } catch (error) {
      log.error('Error fetching day stats:', error)
      return { total: 0, count: 0 }
    }
  })
}

