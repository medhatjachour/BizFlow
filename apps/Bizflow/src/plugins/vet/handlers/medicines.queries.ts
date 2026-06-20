/**
 * Vet medicine read/reporting handlers.
 *   vet:medicines:getSales / getSaleGroups / getHistory / getSummary
 * Split out of medicines.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { SQL_SOLD_QTY, SQL_COGS, SQL_NET_REVENUE, saleCostTotal, saleNetRevenue } from './saleMath'

const log = createLogger('Vet:Medicines')

export function registerVetMedicineQueryHandlers(prisma: any) {
  // ─── Get Sales ────────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:getSales', async (_e, params?: {
    medicineId?: string; patientId?: string; search?: string; category?: string;
    from?: string; to?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.medicineId) where.medicineId = params.medicineId
      if (params?.patientId)  where.patientId  = params.patientId
      if (params?.category && params.category !== 'all') {
        where.medicine = { is: { category: params.category } }
      }
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [
          { ownerName:   { contains: q } },
          { patientName: { contains: q } },
          { notes:       { contains: q } },
          { medicine: { is: { name: { contains: q } } } },
          { batch:    { is: { batchNumber: { contains: q } } } },
        ]
      }
      if (params?.from || params?.to) {
        where.saleDate = {}
        if (params.from) where.saleDate.gte = new Date(params.from)
        // Inclusive end-of-day so same-day sales are not dropped.
        if (params.to)   where.saleDate.lte = new Date(new Date(params.to).getTime() + 86_399_999)
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetMedicineSale.count({ where })
      const data  = await prisma.vetMedicineSale.findMany({
        where,
        include: {
          medicine: { select: { id: true, name: true, unit: true, subUnit: true, subUnitsPerContainer: true, category: true } },
          batch:    { select: { id: true, batchNumber: true, expiryDate: true, costPerUnit: true } }
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take
      })

      // Enrich each sale with sub-unit-aware COGS and profit (net of refunds).
      const enriched = data.map((s: any) => {
        const costTotal  = saleCostTotal(s)
        const netRevenue = saleNetRevenue(s)
        return {
          ...s,
          costPerUnit: s.batch?.costPerUnit ?? 0,
          costTotal,
          netRevenue,
          grossProfit: netRevenue - costTotal,
        }
      })

      return { data: enriched, total, hasMore: skip + take < total }
    } catch (err) { log.error('getSales', err); throw err }
  })

  // ─── Get Sales Grouped by Transaction (combined receipts) ─────────────────
  // Returns paginated "transactions": every line item sharing a saleGroupId is
  // one transaction; legacy single sales (saleGroupId = NULL) form their own
  // one-item transaction keyed by their row id.
  ipcMain.handle('vet:medicines:getSaleGroups', async (_e, params?: {
    from?: string; to?: string; search?: string; category?: string; skip?: number; take?: number
  }) => {
    try {
      const conditions: string[] = []
      const filterArgs: any[] = []
      if (params?.from) { conditions.push('s.saleDate >= ?'); filterArgs.push(new Date(params.from)) }
      if (params?.to)   { conditions.push('s.saleDate <= ?'); filterArgs.push(new Date(new Date(params.to).getTime() + 86_399_999)) }
      if (params?.category && params.category !== 'all') { conditions.push('m.category = ?'); filterArgs.push(params.category) }
      if (params?.search?.trim()) {
        const like = `%${params.search.trim()}%`
        conditions.push('(s.ownerName LIKE ? OR s.patientName LIKE ? OR s.notes LIKE ? OR m.name LIKE ? OR b.batchNumber LIKE ?)')
        filterArgs.push(like, like, like, like, like)
      }
      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      // A transaction matches if ANY of its line items matches the filters; the
      // aggregation then sums EVERY item of those matched transactions.
      const matchedCte = `
        WITH matched AS (
          SELECT DISTINCT COALESCE(s.saleGroupId, s.id) as gk
          FROM VetMedicineSale s
          JOIN VetMedicineBatch b ON s.batchId = b.id
          LEFT JOIN VetMedicine m ON s.medicineId = m.id
          ${whereSql}
        )`

      const skip = params?.skip ?? 0
      const take = params?.take ?? 15

      // Distinct transaction count for pagination
      const countRows = await prisma.$queryRawUnsafe(
        `${matchedCte} SELECT COUNT(*) as cnt FROM matched`,
        ...filterArgs
      ) as any[]
      const total = Number(countRows[0]?.cnt) || 0

      // One row per transaction with aggregates, newest first
      const groupRows = await prisma.$queryRawUnsafe(`
        ${matchedCte}
        SELECT
          COALESCE(s.saleGroupId, s.id)              as groupKey,
          MAX(s.saleDate)                            as saleDate,
          COUNT(*)                                   as itemCount,
          CAST(COALESCE(SUM(s.totalPrice), 0) AS REAL)             as total,
          CAST(COALESCE(SUM(s.discount), 0) AS REAL)               as discount,
          CAST(COALESCE(SUM(COALESCE(s.amountPaid, s.totalPrice)), 0) AS REAL) as paid,
          CAST(COALESCE(SUM(${SQL_COGS}), 0) AS REAL) as cost,
          CAST(COALESCE(SUM(COALESCE(s.refundedAmount, 0)), 0) AS REAL) as refunded,
          CAST(SUM(CASE WHEN s.status = 'refunded' THEN 1 ELSE 0 END) AS INTEGER) as refundedCount
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        LEFT JOIN VetMedicine m ON s.medicineId = m.id
        WHERE COALESCE(s.saleGroupId, s.id) IN (SELECT gk FROM matched)
        GROUP BY groupKey
        ORDER BY saleDate DESC
        LIMIT ? OFFSET ?
      `, ...filterArgs, take, skip) as any[]

      const keys: string[] = groupRows.map((g: any) => g.groupKey)

      // Fetch every line item belonging to the transactions on this page
      const items = keys.length === 0 ? [] : await prisma.vetMedicineSale.findMany({
        where: { OR: [{ saleGroupId: { in: keys } }, { id: { in: keys } }] },
        include: {
          medicine: { select: { id: true, name: true, unit: true, subUnit: true, subUnitsPerContainer: true, category: true } },
          batch:    { select: { id: true, batchNumber: true, expiryDate: true, costPerUnit: true } }
        },
        orderBy: { createdAt: 'asc' }
      })

      const itemsByKey = new Map<string, any[]>()
      for (const it of items as any[]) {
        const key = it.saleGroupId ?? it.id
        const costTotal = saleCostTotal(it)
        const enriched = {
          ...it,
          costPerUnit: it.batch?.costPerUnit ?? 0,
          costTotal,
          grossProfit: saleNetRevenue(it) - costTotal,
        }
        if (!itemsByKey.has(key)) itemsByKey.set(key, [])
        itemsByKey.get(key)!.push(enriched)
      }

      const groups = groupRows.map((g: any) => {
        const groupItems = itemsByKey.get(g.groupKey) ?? []
        const first = groupItems[0] ?? {}
        const totalVal = Number(g.total) || 0
        const refundedVal = Number(g.refunded) || 0
        const refundedCount = Number(g.refundedCount) || 0
        const paidVal  = Number(g.paid)  || 0
        const remaining = Math.max(0, totalVal - refundedVal - paidVal)
        const itemCount = Number(g.itemCount) || groupItems.length
        const txStatus = refundedCount >= itemCount ? 'refunded'
          : refundedCount > 0 ? 'partially_refunded' : 'completed'
        const status = remaining <= 0.005 ? 'paid' : paidVal > 0 ? 'partial' : 'unpaid'
        return {
          groupKey:      g.groupKey,
          saleGroupId:   first.saleGroupId ?? null,
          // Use the line item's real Date — the raw MAX(saleDate) comes back as a
          // BigInt (epoch ms) and would crash `new Date(...)` in the renderer.
          saleDate:      first.saleDate ?? (g.saleDate != null ? new Date(Number(g.saleDate)) : null),
          itemCount,
          total:         totalVal,
          discount:      Number(g.discount) || 0,
          cost:          Number(g.cost) || 0,
          grossProfit:   (totalVal - refundedVal) - (Number(g.cost) || 0),
          paid:          paidVal,
          remaining,
          refunded:      refundedVal,
          refundedCount,
          txStatus,
          paymentStatus: status,
          ownerId:       first.ownerId ?? null,
          ownerName:     first.ownerName ?? first.patientName ?? null,
          paymentMethod: first.paymentMethod ?? null,
          notes:         first.notes ?? null,
          items:         groupItems
        }
      })

      return { data: groups, total, hasMore: skip + take < total }
    } catch (err) { log.error('getSaleGroups', err); throw err }
  })

  // ─── Medicine History (timeline: batches received, sales, write-offs) ─────
  // Builds a unified, date-stamped activity log for a single medicine so the
  // user can audit every stock movement that ever happened to it.
  ipcMain.handle('vet:medicines:getHistory', async (_e, medicineId: string, params?: {
    from?: string; to?: string
  }) => {
    try {
      if (!medicineId) throw new Error('medicineId is required')
      const fromDate = params?.from ? new Date(params.from) : null
      // Treat `to` as inclusive end-of-day so same-day events aren't dropped.
      const toDate   = params?.to   ? new Date(new Date(params.to).getTime() + 86_399_999) : null
      const inRange  = (d: Date) =>
        (!fromDate || d >= fromDate) && (!toDate || d <= toDate)

      const medicine = await prisma.vetMedicine.findUnique({
        where: { id: medicineId },
        select: { id: true, name: true, unit: true, subUnit: true, category: true, minimumStock: true }
      })
      if (!medicine) throw new Error('Medicine not found')

      const batches = await prisma.vetMedicineBatch.findMany({
        where: { medicineId },
        orderBy: { receivedDate: 'desc' }
      })
      const sales = await prisma.vetMedicineSale.findMany({
        where: { medicineId },
        include: { batch: { select: { batchNumber: true, costPerUnit: true } } },
        orderBy: { saleDate: 'desc' }
      })

      const events: any[] = []

      for (const b of batches as any[]) {
        // Stock received
        events.push({
          id:        `recv_${b.id}`,
          type:      'received',
          date:      b.receivedDate,
          batchId:   b.id,
          batchNumber: b.batchNumber ?? null,
          quantity:  b.initialQty,
          unit:      medicine.unit,
          costPerUnit: b.costPerUnit ?? 0,
          totalCost: (b.initialQty ?? 0) * (b.costPerUnit ?? 0),
          supplier:  b.supplier ?? null,
          expiryDate: b.expiryDate,
          notes:     b.notes ?? null
        })
        // Write-off / disposal
        if (b.status === 'disposed' && b.disposedAt) {
          events.push({
            id:        `disp_${b.id}`,
            type:      'disposed',
            date:      b.disposedAt,
            batchId:   b.id,
            batchNumber: b.batchNumber ?? null,
            quantity:  b.disposedQty ?? 0,
            unit:      medicine.unit,
            costPerUnit: b.costPerUnit ?? 0,
            lossAmount: (b.disposedQty ?? 0) * (b.costPerUnit ?? 0),
            reason:    b.disposalReason ?? null
          })
        }
      }

      for (const s of sales as any[]) {
        events.push({
          id:        `sale_${s.id}`,
          type:      'sold',
          date:      s.saleDate,
          saleId:    s.id,
          saleGroupId: s.saleGroupId ?? null,
          batchId:   s.batchId,
          batchNumber: s.batch?.batchNumber ?? null,
          quantity:  s.quantity,
          saleUnit:  s.saleUnit ?? 'container',
          unit:      medicine.unit,
          subUnit:   medicine.subUnit ?? null,
          unitPrice: s.unitPrice,
          discount:  s.discount ?? 0,
          totalPrice: s.totalPrice,
          costPerUnit: s.batch?.costPerUnit ?? 0,
          grossProfit: s.totalPrice - s.quantity * (s.batch?.costPerUnit ?? 0),
          ownerName: s.ownerName ?? s.patientName ?? null,
          paymentStatus: s.paymentStatus ?? 'paid'
        })
      }

      const filtered = events
        .filter(e => e.date && inRange(new Date(e.date)))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Summary across the (date-filtered) timeline
      const summary = {
        totalReceived: filtered.filter(e => e.type === 'received').reduce((s, e) => s + (e.quantity || 0), 0),
        totalSold:     filtered.filter(e => e.type === 'sold').reduce((s, e) => {
          // Normalise sub-unit sales back to container units for an apples-to-apples figure
          const q = e.saleUnit === 'sub' && medicine.subUnit ? 0 : (e.quantity || 0)
          return s + q
        }, 0),
        totalDisposed: filtered.filter(e => e.type === 'disposed').reduce((s, e) => s + (e.quantity || 0), 0),
        salesRevenue:  filtered.filter(e => e.type === 'sold').reduce((s, e) => s + (e.totalPrice || 0), 0),
        salesProfit:   filtered.filter(e => e.type === 'sold').reduce((s, e) => s + (e.grossProfit || 0), 0),
        disposalLoss:  filtered.filter(e => e.type === 'disposed').reduce((s, e) => s + (e.lossAmount || 0), 0),
        eventCount:    filtered.length
      }

      return { medicine, events: filtered, summary }
    } catch (err) { log.error('getHistory', err); throw err }
  })

  // ─── Medicine Sales Summary (cost / revenue / profit) ────────────────────
  ipcMain.handle('vet:medicines:getSummary', async (_e, params?: {
    from?: string; to?: string
  }) => {
    try {
      const from = params?.from ? new Date(params.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const to   = params?.to   ? new Date(params.to)   : new Date()

      const rows = await prisma.$queryRawUnsafe(`
        SELECT
          COUNT(*)                                                  as saleCount,
          CAST(COALESCE(SUM(${SQL_SOLD_QTY}), 0) AS REAL)           as unitsSold,
          CAST(COALESCE(SUM(${SQL_NET_REVENUE}), 0) AS REAL)        as revenue,
          CAST(COALESCE(SUM(${SQL_COGS}), 0) AS REAL)               as costOfGoods,
          CAST(COALESCE(SUM(${SQL_NET_REVENUE} - ${SQL_COGS}), 0) AS REAL) as grossProfit
        FROM VetMedicineSale s
        JOIN VetMedicineBatch b ON s.batchId = b.id
        JOIN VetMedicine m      ON s.medicineId = m.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
      `, from, to) as any[]

      const topRows = await prisma.$queryRawUnsafe(`
        SELECT
          m.id, m.name, m.unit,
          COUNT(*)                             as saleCount,
          CAST(COALESCE(SUM(${SQL_NET_REVENUE}), 0) AS REAL)       as revenue,
          CAST(COALESCE(SUM(${SQL_COGS}), 0) AS REAL) as costOfGoods
        FROM VetMedicineSale s
        JOIN VetMedicine m ON s.medicineId = m.id
        JOIN VetMedicineBatch b ON s.batchId = b.id
        WHERE s.saleDate >= ? AND s.saleDate <= ?
        GROUP BY m.id, m.name, m.unit
        ORDER BY revenue DESC
        LIMIT 10
      `, from, to) as any[]

      const r          = rows[0] ?? {}
      const revenue    = Number(r.revenue)    || 0
      const costOfGoods = Number(r.costOfGoods) || 0
      const grossProfit = Number(r.grossProfit) || 0
      const margin      = revenue > 0 ? (grossProfit / revenue) * 100 : 0
      const unitsSold   = Number(r.unitsSold) || 0

      // Pharmacy receivables: net (after refunds) minus amount paid, all-time, for non-refunded sales.
      const outstandingRows = await prisma.$queryRawUnsafe(`
        SELECT CAST(COALESCE(SUM(
          MAX(0, (s.totalPrice - COALESCE(s.refundedAmount,0)) - COALESCE(s.amountPaid, s.totalPrice))
        ), 0) AS REAL) as outstanding
        FROM VetMedicineSale s
        WHERE s.status IS NULL OR s.status != 'refunded'
      `) as any[]
      const pharmacyOutstanding = Number(outstandingRows[0]?.outstanding) || 0

      return {
        saleCount:   Number(r.saleCount) || 0,
        unitsSold,
        revenue,
        costOfGoods,
        grossProfit,
        margin,
        pharmacyOutstanding,
        topMedicines: topRows.map((t: any) => ({
          id:         t.id,
          name:       t.name,
          unit:       t.unit,
          saleCount:  Number(t.saleCount)   || 0,
          revenue:    Number(t.revenue)     || 0,
          costOfGoods: Number(t.costOfGoods) || 0,
          grossProfit: Number(t.revenue) - Number(t.costOfGoods)
        }))
      }
    } catch (err) { log.error('getSummary', err); throw err }
  })
}
