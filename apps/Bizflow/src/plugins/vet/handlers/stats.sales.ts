import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { SQL_SOLD_QTY, SQL_NET_REVENUE } from './saleMath'

const log = createLogger('Vet:Stats:Sales')

export function registerVetStatsSalesHandlers(prisma: any) {
  // ─── Profit Analysis (expected vs actual, inventory potential) ────────────
  // Correctly handles sub-unit sales (qty stored in sub-units) and refunds.
  //   container-equivalent qty = saleUnit='sub' ? (qty-refundedQty)/subUnitsPerContainer
  //                                              : (qty-refundedQty)
  //   expected revenue = container-equiv qty × listed price (batch.sellingPrice)
  //   actual revenue   = totalPrice (after discount) − refundedAmount
  //   cogs             = container-equiv qty × batch.costPerUnit
  ipcMain.handle('vet:stats:profitAnalysis', async (_e, params?: { from?: string; to?: string }) => {
    try {
      const now  = new Date()
      const from = params?.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1)
      const to   = params?.to   ? new Date(params.to)   : now

      // Reusable per-line expressions (shared with finance/reports via saleMath)
      const EQTY = SQL_SOLD_QTY
      const LISTED = `COALESCE(b.sellingPrice,
                       CASE WHEN s.saleUnit='sub' AND m.subUnitsPerContainer>0
                            THEN s.unitPrice*m.subUnitsPerContainer ELSE s.unitPrice END)`
      const ACTUAL = SQL_NET_REVENUE

      const soldRows = await prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*)                                              as saleCount,
          CAST(COALESCE(SUM(${EQTY}), 0)            AS REAL)    as unitsSold,
          CAST(COALESCE(SUM(${ACTUAL}), 0)         AS REAL)    as actualRevenue,
          CAST(COALESCE(SUM(${EQTY} * ${LISTED}), 0) AS REAL)  as expectedRevenue,
          CAST(COALESCE(SUM(${EQTY} * b.costPerUnit), 0) AS REAL) as cogs
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        JOIN VetMedicine m      ON s.medicineId = m.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
          AND (s.status IS NULL OR s.status != 'refunded')
      `, from, to) as any[]

      const invRows = await prisma.$queryRawUnsafe(`
        SELECT
          CAST(COALESCE(SUM(b.quantity * b.costPerUnit), 0)                       AS REAL) as invCost,
          CAST(COALESCE(SUM(b.quantity * COALESCE(b.sellingPrice, b.costPerUnit)),0) AS REAL) as invRetail,
          CAST(COALESCE(SUM(b.quantity), 0)                                       AS REAL) as inStockUnits,
          COUNT(*)                                                                         as batchCount
        FROM VetMedicineBatch b
        WHERE b.status = 'active' AND b.quantity > 0 AND b.expiryDate >= ?
      `, now) as any[]

      const expiredRows = await prisma.$queryRawUnsafe(`
        SELECT CAST(COALESCE(SUM(b.quantity * b.costPerUnit), 0) AS REAL) as expiredCost
        FROM VetMedicineBatch b
        WHERE b.status = 'active' AND b.quantity > 0 AND b.expiryDate < ?
      `, now) as any[]

      const perMed = await prisma.$queryRawUnsafe(`
        SELECT m.id, m.name, m.unit,
          CAST(COALESCE(SUM(${ACTUAL}), 0)         AS REAL)    as actualRevenue,
          CAST(COALESCE(SUM(${EQTY} * ${LISTED}), 0) AS REAL)  as expectedRevenue,
          CAST(COALESCE(SUM(${EQTY} * b.costPerUnit), 0) AS REAL) as cogs,
          CAST(COALESCE(SUM(${EQTY}), 0)            AS REAL)    as unitsSold
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        JOIN VetMedicine m      ON s.medicineId = m.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
          AND (s.status IS NULL OR s.status != 'refunded')
        GROUP BY m.id, m.name, m.unit
        ORDER BY actualRevenue DESC
        LIMIT 8
      `, from, to) as any[]

      const s = soldRows[0] ?? {}
      const actualRevenue   = Number(s.actualRevenue)   || 0
      const expectedRevenue = Number(s.expectedRevenue) || 0
      const cogs            = Number(s.cogs)            || 0
      const actualProfit    = actualRevenue   - cogs
      const expectedProfit  = expectedRevenue - cogs

      const inv          = invRows[0] ?? {}
      const invCost      = Number(inv.invCost)   || 0
      const invRetail    = Number(inv.invRetail) || 0
      const potentialProfit = invRetail - invCost

      return {
        sales: {
          saleCount:       Number(s.saleCount) || 0,
          unitsSold:       Number(s.unitsSold) || 0,
          actualRevenue,
          expectedRevenue,
          cogs,
          actualProfit,
          expectedProfit,
          discountsGiven:  Math.max(0, expectedRevenue - actualRevenue),
          actualMargin:    actualRevenue   > 0 ? (actualProfit   / actualRevenue)   * 100 : 0,
          expectedMargin:  expectedRevenue > 0 ? (expectedProfit / expectedRevenue) * 100 : 0,
          realizationRate: expectedRevenue > 0 ? (actualRevenue  / expectedRevenue) * 100 : 100,
        },
        inventory: {
          cost:            invCost,
          retail:          invRetail,
          potentialProfit,
          potentialMargin: invRetail > 0 ? (potentialProfit / invRetail) * 100 : 0,
          inStockUnits:    Number(inv.inStockUnits) || 0,
          batchCount:      Number(inv.batchCount)   || 0,
          expiredCost:     Number(expiredRows[0]?.expiredCost) || 0,
        },
        topMedicines: perMed.map((m: any) => {
          const aRev = Number(m.actualRevenue)   || 0
          const eRev = Number(m.expectedRevenue) || 0
          const c    = Number(m.cogs)            || 0
          return {
            id: m.id, name: m.name, unit: m.unit,
            unitsSold:       Number(m.unitsSold) || 0,
            actualRevenue:   aRev,
            expectedRevenue: eRev,
            actualProfit:    aRev - c,
            expectedProfit:  eRev - c,
            discountsGiven:  Math.max(0, eRev - aRev),
          }
        }),
      }
    } catch (err) { log.error('profitAnalysis', err); throw err }
  })

  // ─── Sales Breakdown (by category, payment method, refunds) ───────────────
  ipcMain.handle('vet:stats:salesBreakdown', async (_e, params?: { from?: string; to?: string }) => {
    try {
      const now  = new Date()
      const from = params?.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1)
      const to   = params?.to   ? new Date(params.to)   : now

      const EQTY = SQL_SOLD_QTY
      const ACTUAL = SQL_NET_REVENUE
      const ACTIVE = `(s.status IS NULL OR s.status != 'refunded')`

      const byCategory = await prisma.$queryRawUnsafe(`
        SELECT m.category                                            as category,
          COUNT(*)                                                   as saleCount,
          CAST(COALESCE(SUM(${EQTY}), 0)              AS REAL)       as units,
          CAST(COALESCE(SUM(${ACTUAL}), 0)            AS REAL)       as revenue,
          CAST(COALESCE(SUM(${EQTY} * b.costPerUnit), 0) AS REAL)    as cogs
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        JOIN VetMedicine m      ON s.medicineId = m.id
        WHERE s.saleDate >= ? AND s.saleDate <= ? AND ${ACTIVE}
        GROUP BY m.category
        ORDER BY revenue DESC
      `, from, to) as any[]

      const byPayment = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(NULLIF(s.paymentMethod, ''), 'unknown')      as method,
          COUNT(*)                                                   as saleCount,
          CAST(COALESCE(SUM(s.totalPrice - COALESCE(s.refundedAmount,0)), 0) AS REAL) as revenue
        FROM VetMedicineSale s
        WHERE s.saleDate >= ? AND s.saleDate <= ? AND (s.status IS NULL OR s.status != 'refunded')
        GROUP BY method
        ORDER BY revenue DESC
      `, from, to) as any[]

      const refundRows = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)                                              as refundCount,
          CAST(COALESCE(SUM(COALESCE(s.refundedAmount,0)), 0) AS REAL) as refundAmount
        FROM VetMedicineSale s
        WHERE s.saleDate >= ? AND s.saleDate <= ?
          AND (s.status IN ('refunded','partially_refunded') OR COALESCE(s.refundedAmount,0) > 0)
      `, from, to) as any[]

      return {
        byCategory: byCategory.map((c: any) => {
          const revenue = Number(c.revenue) || 0
          const cogs    = Number(c.cogs)    || 0
          return {
            category:  c.category || 'general',
            saleCount: Number(c.saleCount) || 0,
            units:     Number(c.units)     || 0,
            revenue,
            profit:    revenue - cogs,
          }
        }),
        byPayment: byPayment.map((p: any) => ({
          method:    p.method || 'unknown',
          saleCount: Number(p.saleCount) || 0,
          revenue:   Number(p.revenue)   || 0,
        })),
        refunds: {
          count:  Number(refundRows[0]?.refundCount)  || 0,
          amount: Number(refundRows[0]?.refundAmount) || 0,
        },
      }
    } catch (err) { log.error('salesBreakdown', err); throw err }
  })
}
