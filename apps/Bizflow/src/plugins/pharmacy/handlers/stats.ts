import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Pharmacy:Stats')

function startOfPeriod(period?: string): Date {
  const now = new Date()
  const d = new Date(now)
  switch (period ?? 'month') {
    case 'today': d.setHours(0, 0, 0, 0); break
    case 'week': d.setDate(now.getDate() - 6); d.setHours(0, 0, 0, 0); break
    case 'year': d.setFullYear(now.getFullYear() - 1); d.setDate(now.getDate() + 1); break
    default: d.setDate(now.getDate() - 29); d.setHours(0, 0, 0, 0) // month = trailing 30d
  }
  return d
}

async function saleAggregates(prisma: any, from: Date, to: Date) {
  const [saleRows, itemRows, topRows] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as saleCount,
        CAST(COALESCE(SUM(total),0) AS REAL)      as revenue,
        CAST(COALESCE(SUM(amountPaid),0) AS REAL) as collected,
        CAST(COALESCE(SUM(discount),0) AS REAL)   as discount
      FROM PharmacySale
      WHERE status != 'refunded' AND saleDate >= ? AND saleDate <= ?
    `, from, to) as Promise<any[]>,
    prisma.$queryRawUnsafe(`
      SELECT
        CAST(COALESCE(SUM((i.quantity - COALESCE(i.refundedQty,0)) * i.costPerUnit),0) AS REAL) as cogs,
        CAST(COALESCE(SUM(i.quantity - COALESCE(i.refundedQty,0)),0) AS REAL) as unitsSold
      FROM PharmacySaleItem i JOIN PharmacySale s ON i.saleId = s.id
      WHERE s.status != 'refunded' AND s.saleDate >= ? AND s.saleDate <= ?
    `, from, to) as Promise<any[]>,
    prisma.$queryRawUnsafe(`
      SELECT p.id, p.name, p.unit,
        CAST(COALESCE(SUM(i.lineTotal),0) AS REAL) as revenue,
        CAST(COALESCE(SUM(i.quantity),0) AS REAL)  as units,
        COUNT(DISTINCT i.saleId) as saleCount
      FROM PharmacySaleItem i
      JOIN PharmacyProduct p ON i.productId = p.id
      JOIN PharmacySale s ON i.saleId = s.id
      WHERE s.status != 'refunded' AND s.saleDate >= ? AND s.saleDate <= ?
      GROUP BY p.id, p.name, p.unit
      ORDER BY revenue DESC
      LIMIT 10
    `, from, to) as Promise<any[]>,
  ])

  const revenue = Number(saleRows[0]?.revenue) || 0
  const cogs = Number(itemRows[0]?.cogs) || 0
  const grossProfit = revenue - cogs
  return {
    saleCount: Number(saleRows[0]?.saleCount) || 0,
    revenue,
    collected: Number(saleRows[0]?.collected) || 0,
    discount: Number(saleRows[0]?.discount) || 0,
    cogs,
    grossProfit,
    margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    unitsSold: Number(itemRows[0]?.unitsSold) || 0,
    topProducts: topRows.map((t: any) => ({
      id: t.id, name: t.name, unit: t.unit,
      revenue: Number(t.revenue) || 0, units: Number(t.units) || 0, saleCount: Number(t.saleCount) || 0,
    })),
  }
}

async function outstandingTotal(prisma: any): Promise<number> {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT CAST(COALESCE(SUM(MAX(0, (total - COALESCE(refundedAmount,0)) - amountPaid)),0) AS REAL) as outstanding
    FROM PharmacySale WHERE status != 'refunded'
  `) as any[]
  return Number(rows[0]?.outstanding) || 0
}

function inventoryRollup(products: any[]) {
  const now = Date.now()
  let stockValue = 0, retailValue = 0, lowStock = 0, outOfStock = 0
  let expiredBatches = 0, expiredValue = 0, expiringSoon = 0, expiringValue = 0
  for (const p of products) {
    const active = (p.batches ?? []).filter((b: any) => b.quantity > 0 && b.status === 'active')
    const stock = active.reduce((s: number, b: any) => s + b.quantity, 0)
    stockValue += active.reduce((s: number, b: any) => s + b.quantity * (b.costPerUnit ?? 0), 0)
    retailValue += active.reduce((s: number, b: any) => s + b.quantity * ((b.sellingPrice ?? p.sellingPrice) ?? 0), 0)
    if (stock <= 0) outOfStock++
    else if (p.minimumStock > 0 && stock <= p.minimumStock) lowStock++
    for (const b of (p.batches ?? [])) {
      if (b.quantity <= 0) continue
      const days = (new Date(b.expiryDate).getTime() - now) / 86_400_000
      const val = b.quantity * (b.costPerUnit ?? 0)
      if (days < 0) { expiredBatches++; expiredValue += val }
      else if (days <= 30) { expiringSoon++; expiringValue += val }
    }
  }
  return {
    stockValue: Math.round(stockValue * 100) / 100,
    retailValue: Math.round(retailValue * 100) / 100,
    lowStock, outOfStock,
    expiredBatches, expiredValue: Math.round(expiredValue * 100) / 100,
    expiringSoon, expiringValue: Math.round(expiringValue * 100) / 100,
  }
}

export function registerPharmacyStatsHandlers(prisma: any): void {
  // ─── Dashboard overview ───────────────────────────────────────────────────
  ipcMain.handle('pharmacy:stats:overview', async (_e, period?: string) => {
    try {
      const now = new Date()
      const from = startOfPeriod(period)
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

      const products = await prisma.pharmacyProduct.findMany({
        where: { isActive: true },
        select: { id: true, name: true, minimumStock: true, sellingPrice: true,
          batches: { select: { quantity: true, expiryDate: true, costPerUnit: true, sellingPrice: true, status: true } } },
      })

      const totalProducts = await prisma.pharmacyProduct.count()
      const inv = inventoryRollup(products)
      const [periodSales, todaySales, outstanding] = await Promise.all([
        saleAggregates(prisma, from, now),
        saleAggregates(prisma, todayStart, now),
        outstandingTotal(prisma),
      ])

      return {
        period: period ?? 'month',
        totalProducts,
        activeProducts: products.length,
        ...inv,
        outstanding,
        today: { saleCount: todaySales.saleCount, revenue: todaySales.revenue, profit: todaySales.grossProfit },
        sales: periodSales,
      }
    } catch (err) { log.error('stats:overview', err); throw err }
  })

  // ─── Sales report summary (custom range) ──────────────────────────────────
  ipcMain.handle('pharmacy:stats:salesSummary', async (_e, params?: { from?: string; to?: string }) => {
    try {
      const from = params?.from ? new Date(params.from) : startOfPeriod('month')
      const to = params?.to ? new Date(new Date(params.to).getTime() + 86_399_999) : new Date()
      const agg = await saleAggregates(prisma, from, to)
      const outstanding = await outstandingTotal(prisma)
      return { ...agg, outstanding }
    } catch (err) { log.error('stats:salesSummary', err); throw err }
  })

  // ─── Inventory valuation (by category + totals) ───────────────────────────
  ipcMain.handle('pharmacy:stats:inventory', async () => {
    try {
      const products = await prisma.pharmacyProduct.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true, minimumStock: true, sellingPrice: true,
          batches: { select: { quantity: true, expiryDate: true, costPerUnit: true, sellingPrice: true, status: true } } },
      })
      const inv = inventoryRollup(products)
      const byCategory: Record<string, { value: number; count: number }> = {}
      for (const p of products) {
        const active = (p.batches ?? []).filter((b: any) => b.quantity > 0 && b.status === 'active')
        const value = active.reduce((s: number, b: any) => s + b.quantity * (b.costPerUnit ?? 0), 0)
        const cat = p.category || 'general'
        if (!byCategory[cat]) byCategory[cat] = { value: 0, count: 0 }
        byCategory[cat].value += value
        byCategory[cat].count++
      }
      return {
        ...inv,
        totalProducts: products.length,
        byCategory: Object.entries(byCategory)
          .map(([category, v]) => ({ category, value: Math.round(v.value * 100) / 100, count: v.count }))
          .sort((a, b) => b.value - a.value),
      }
    } catch (err) { log.error('stats:inventory', err); throw err }
  })

  // ─── Owner cashflow snapshot ──────────────────────────────────────────────
  // Cash collected today, receivables (customer credit), payables (open POs),
  // and stock alerts (low / out / expiring / expired) — the at-a-glance numbers
  // an owner checks daily.
  ipcMain.handle('pharmacy:stats:cashflow', async () => {
    try {
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
      const now = new Date()
      const in30 = new Date(now.getTime() + 30 * 86_400_000)

      const cashRows = await prisma.$queryRawUnsafe(`
        SELECT
          CAST(COALESCE(SUM(amountPaid), 0) AS REAL)                                   as cashToday,
          CAST(COALESCE(SUM(total - COALESCE(refundedAmount,0)), 0) AS REAL)           as salesToday,
          COUNT(*)                                                                      as txToday
        FROM PharmacySale
        WHERE saleDate >= ? AND (status IS NULL OR status != 'refunded')
      `, startToday) as any[]

      const recvRows = await prisma.$queryRawUnsafe(`
        SELECT CAST(COALESCE(SUM(MAX(0, (total - COALESCE(refundedAmount,0)) - COALESCE(amountPaid,0))), 0) AS REAL) as receivables
        FROM PharmacySale
        WHERE status IS NULL OR status != 'refunded'
      `) as any[]

      const payRows = await prisma.$queryRawUnsafe(`
        SELECT CAST(COALESCE(SUM(total), 0) AS REAL) as payables, COUNT(*) as openOrders
        FROM PharmacyPurchaseOrder
        WHERE status IN ('draft', 'ordered')
      `) as any[]

      const batchRows = await prisma.$queryRawUnsafe(`
        SELECT
          SUM(CASE WHEN expiryDate < ?  AND quantity > 0 THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN expiryDate >= ? AND expiryDate <= ? AND quantity > 0 THEN 1 ELSE 0 END) as expiring
        FROM PharmacyBatch WHERE status = 'active'
      `, now, now, in30) as any[]

      // low / out of stock per product (active products only)
      const stockRows = await prisma.$queryRawUnsafe(`
        SELECT p.minimumStock as minimumStock,
          COALESCE((SELECT SUM(b.quantity) FROM PharmacyBatch b WHERE b.productId = p.id AND b.status = 'active'), 0) as stock
        FROM PharmacyProduct p WHERE p.isActive = 1
      `) as any[]
      let lowStock = 0, outOfStock = 0
      for (const r of stockRows) {
        const stock = Number(r.stock) || 0
        const min = Number(r.minimumStock) || 0
        if (stock <= 0) outOfStock++
        else if (stock <= min) lowStock++
      }

      const c = cashRows[0] ?? {}
      return {
        cashToday:    Number(c.cashToday)   || 0,
        salesToday:   Number(c.salesToday)  || 0,
        txToday:      Number(c.txToday)     || 0,
        receivables:  Number(recvRows[0]?.receivables) || 0,
        payables:     Number(payRows[0]?.payables)     || 0,
        openOrders:   Number(payRows[0]?.openOrders)   || 0,
        lowStock,
        outOfStock,
        expiring:     Number(batchRows[0]?.expiring) || 0,
        expired:      Number(batchRows[0]?.expired)  || 0,
      }
    } catch (err) { log.error('stats:cashflow', err); throw err }
  })
}
