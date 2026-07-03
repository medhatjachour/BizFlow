/**
 * Vet inventory turnover / stock-health stats.
 *   vet:stats:inventoryTurnover({ from?, to? })
 *
 * Turnover = COGS over the period ÷ inventory value, annualised. Days-on-hand is
 * how long current stock lasts at the period's consumption rate. Sub-unit aware
 * (uses the canonical saleMath SQL fragments).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { SQL_COGS, SQL_SOLD_QTY, SQL_NET_REVENUE } from './saleMath'

const log = createLogger('Vet:Stats:Inventory')

export function registerVetStatsInventoryHandlers(prisma: any) {
  ipcMain.handle('vet:stats:inventoryTurnover', async (_e, params?: { from?: string; to?: string }) => {
    try {
      const to   = params?.to   ? new Date(params.to)   : new Date()
      const from = params?.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000))
      const now = new Date()
      const in30 = new Date(now.getTime() + 30 * 86_400_000)

      // Current stock value per medicine (active batches only).
      const stockRows = await prisma.$queryRawUnsafe(`
        SELECT m.id, m.name, m.unit, m.category,
          CAST(COALESCE(SUM(b.quantity * b.costPerUnit), 0) AS REAL) as stockValue,
          CAST(COALESCE(SUM(b.quantity), 0) AS REAL)                 as stockUnits
        FROM VetMedicine m
        LEFT JOIN VetMedicineBatch b ON b.medicineId = m.id AND b.status = 'active'
        GROUP BY m.id, m.name, m.unit, m.category
      `) as any[]

      // Sales (COGS / units / revenue) per medicine within the period.
      const saleRows = await prisma.$queryRawUnsafe(`
        SELECT m.id,
          CAST(COALESCE(SUM(${SQL_COGS}), 0) AS REAL)         as cogs,
          CAST(COALESCE(SUM(${SQL_SOLD_QTY}), 0) AS REAL)     as unitsSold,
          CAST(COALESCE(SUM(${SQL_NET_REVENUE}), 0) AS REAL)  as revenue,
          COUNT(*)                                            as saleCount,
          MAX(s.saleDate)                                     as lastSold
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        JOIN VetMedicine m      ON s.medicineId = m.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
          AND (s.status IS NULL OR s.status != 'refunded')
        GROUP BY m.id
      `, from, to) as any[]

      const saleById = new Map<string, any>(saleRows.map((r: any) => [r.id, r]))

      const annualise = 365 / periodDays
      const items = stockRows.map((s: any) => {
        const sale = saleById.get(s.id) ?? {}
        const stockValue = Number(s.stockValue) || 0
        const cogs       = Number(sale.cogs)    || 0
        const unitsSold  = Number(sale.unitsSold) || 0
        const revenue    = Number(sale.revenue) || 0
        const dailyCogs  = cogs / periodDays
        // Turnover annualised; days-on-hand at the current burn rate.
        const turnover   = stockValue > 0 ? (cogs * annualise) / stockValue : 0
        const daysOnHand = dailyCogs > 0 ? stockValue / dailyCogs : null
        const dead       = stockValue > 0 && cogs <= 0
        return {
          id: s.id, name: s.name, unit: s.unit, category: s.category,
          stockValue, stockUnits: Number(s.stockUnits) || 0,
          cogs, unitsSold, revenue, saleCount: Number(sale.saleCount) || 0,
          lastSold: sale.lastSold ?? null,
          turnover, daysOnHand, dead,
        }
      })

      // Stock health (expiring ≤30d / already expired) from active batches.
      const healthRows = await prisma.$queryRawUnsafe(`
        SELECT
          CAST(COALESCE(SUM(CASE WHEN b.expiryDate < ? THEN b.quantity * b.costPerUnit ELSE 0 END), 0) AS REAL) as expiredValue,
          CAST(COALESCE(SUM(CASE WHEN b.expiryDate >= ? AND b.expiryDate <= ? THEN b.quantity * b.costPerUnit ELSE 0 END), 0) AS REAL) as expiringValue
        FROM VetMedicineBatch b WHERE b.status = 'active'
      `, now, now, in30) as any[]

      const totalStockValue = items.reduce((a, x) => a + x.stockValue, 0)
      const totalCogs       = items.reduce((a, x) => a + x.cogs, 0)
      const totalRevenue    = items.reduce((a, x) => a + x.revenue, 0)
      const totalUnitsSold  = items.reduce((a, x) => a + x.unitsSold, 0)
      const deadItems       = items.filter(x => x.dead && x.stockValue > 0)
      const dailyCogs       = totalCogs / periodDays

      return {
        periodDays,
        overall: {
          stockValue:   totalStockValue,
          cogs:         totalCogs,
          revenue:      totalRevenue,
          unitsSold:    totalUnitsSold,
          turnover:     totalStockValue > 0 ? (totalCogs * annualise) / totalStockValue : 0,
          daysOnHand:   dailyCogs > 0 ? totalStockValue / dailyCogs : null,
          deadStockValue: deadItems.reduce((a, x) => a + x.stockValue, 0),
          deadStockCount: deadItems.length,
          expiringValue: Number(healthRows[0]?.expiringValue) || 0,
          expiredValue:  Number(healthRows[0]?.expiredValue)  || 0,
          medicineCount: items.length,
          stockedCount:  items.filter(x => x.stockValue > 0).length,
        },
        // Fastest movers first; medicines with stock but no sales (dead) sink.
        items: items.sort((a, b) => b.turnover - a.turnover),
      }
    } catch (err) { log.error('inventoryTurnover', err); throw err }
  })
}
