import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Pharmacy:Products')

const DEFAULT_CATEGORIES = [
  'general', 'antibiotic', 'painkiller', 'antacid', 'vitamin',
  'cough_cold', 'allergy', 'diabetes', 'cardiac', 'skin', 'eye_ear', 'baby_care'
]

export function registerPharmacyProductHandlers(prisma: any): void {
  // ─── List products (enriched with stock + expiry status) ──────────────────
  ipcMain.handle('pharmacy:products:getAll', async (_e, params?: {
    search?: string; category?: string; status?: 'active' | 'inactive' | 'all'
    stockFilter?: 'all' | 'low' | 'out' | 'expiring' | 'expired'
    skip?: number; take?: number
    sortBy?: 'name' | 'category' | 'updatedAt'; sortDir?: 'asc' | 'desc'
  }) => {
    try {
      const where: any = {}
      if (params?.status === 'active') where.isActive = true
      else if (params?.status === 'inactive') where.isActive = false
      if (params?.category && params.category !== 'all') where.category = params.category
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [
          { name: { contains: q } },
          { genericName: { contains: q } },
          { barcode: { contains: q } },
        ]
      }

      const sortBy = params?.sortBy ?? 'name'
      const sortDir = params?.sortDir ?? 'asc'

      const products = await prisma.pharmacyProduct.findMany({
        where,
        include: {
          batches: { select: { id: true, quantity: true, expiryDate: true, costPerUnit: true, sellingPrice: true, status: true } },
          _count: { select: { saleItems: true } },
        },
        orderBy: { [sortBy]: sortDir },
      })

      const now = Date.now()
      let enriched = products.map((p: any) => {
        const active = p.batches.filter((b: any) => b.quantity > 0 && b.status === 'active')
        const totalStock = active.reduce((s: number, b: any) => s + b.quantity, 0)
        const stockValue = active.reduce((s: number, b: any) => s + b.quantity * (b.costPerUnit ?? 0), 0)
        const expiries = active.map((b: any) => new Date(b.expiryDate).getTime()).sort((a: number, z: number) => a - z)
        const nearestExpiry = expiries.length ? new Date(expiries[0]).toISOString() : null
        const hasExpired = p.batches.some((b: any) => b.quantity > 0 && new Date(b.expiryDate).getTime() < now)
        const expiringSoon = active.some((b: any) => {
          const d = (new Date(b.expiryDate).getTime() - now) / 86_400_000
          return d >= 0 && d <= 30
        })
        return {
          ...p,
          batches: undefined,
          totalStock,
          stockValue,
          nearestExpiry,
          hasExpired,
          expiringSoon,
          batchCount: p.batches.length,
          activeBatchCount: active.length,
          salesCount: p._count.saleItems,
          isLowStock: p.minimumStock > 0 && totalStock <= p.minimumStock,
          isOutOfStock: totalStock <= 0,
        }
      })

      // Stock filters (applied after enrichment)
      if (params?.stockFilter && params.stockFilter !== 'all') {
        enriched = enriched.filter((p: any) => {
          if (params.stockFilter === 'low') return p.isLowStock && !p.isOutOfStock
          if (params.stockFilter === 'out') return p.isOutOfStock
          if (params.stockFilter === 'expiring') return p.expiringSoon
          if (params.stockFilter === 'expired') return p.hasExpired
          return true
        })
      }

      const total = enriched.length
      const skip = params?.skip ?? 0
      const take = params?.take ?? 50
      const data = enriched.slice(skip, skip + take)
      return { data, total, hasMore: skip + take < total }
    } catch (err) { log.error('products:getAll', err); throw err }
  })

  ipcMain.handle('pharmacy:products:getById', async (_e, id: string) => {
    try {
      return await prisma.pharmacyProduct.findUnique({
        where: { id },
        include: { batches: { orderBy: { expiryDate: 'asc' } } },
      })
    } catch (err) { log.error('products:getById', err); throw err }
  })

  ipcMain.handle('pharmacy:products:create', async (_e, data: any) => {
    try {
      const name = (data?.name ?? '').trim()
      if (!name) throw new Error('Product name is required')
      return await prisma.pharmacyProduct.create({
        data: {
          name,
          genericName: data.genericName?.trim() || null,
          category: (data.category ?? 'general').trim().toLowerCase(),
          unit: (data.unit ?? 'unit').trim().toLowerCase(),
          subUnit: data.subUnit?.trim() || null,
          subUnitsPerContainer: data.subUnitsPerContainer != null && Number(data.subUnitsPerContainer) > 0 ? Number(data.subUnitsPerContainer) : null,
          subUnitPrice: data.subUnitPrice != null && data.subUnitPrice !== '' ? Number(data.subUnitPrice) : null,
          barcode: data.barcode?.trim() || null,
          sellingPrice: Number(data.sellingPrice) || 0,
          minimumStock: Number(data.minimumStock) || 0,
          description: data.description?.trim() || null,
          isActive: data.isActive ?? true,
        },
      })
    } catch (err) { log.error('products:create', err); throw err }
  })

  ipcMain.handle('pharmacy:products:update', async (_e, id: string, data: any) => {
    try {
      const patch: any = {}
      if (data.name !== undefined) patch.name = String(data.name).trim()
      if (data.genericName !== undefined) patch.genericName = data.genericName?.trim() || null
      if (data.category !== undefined) patch.category = String(data.category).trim().toLowerCase()
      if (data.unit !== undefined) patch.unit = String(data.unit).trim().toLowerCase()
      if (data.subUnit !== undefined) patch.subUnit = data.subUnit?.trim() || null
      if (data.subUnitsPerContainer !== undefined) patch.subUnitsPerContainer = data.subUnitsPerContainer != null && Number(data.subUnitsPerContainer) > 0 ? Number(data.subUnitsPerContainer) : null
      if (data.subUnitPrice !== undefined) patch.subUnitPrice = data.subUnitPrice != null && data.subUnitPrice !== '' ? Number(data.subUnitPrice) : null
      if (data.barcode !== undefined) patch.barcode = data.barcode?.trim() || null
      if (data.sellingPrice !== undefined) patch.sellingPrice = Number(data.sellingPrice) || 0
      if (data.minimumStock !== undefined) patch.minimumStock = Number(data.minimumStock) || 0
      if (data.description !== undefined) patch.description = data.description?.trim() || null
      if (data.isActive !== undefined) patch.isActive = !!data.isActive
      return await prisma.pharmacyProduct.update({ where: { id }, data: patch })
    } catch (err) { log.error('products:update', err); throw err }
  })

  ipcMain.handle('pharmacy:products:delete', async (_e, id: string) => {
    try {
      const sales = await prisma.pharmacySaleItem.count({ where: { productId: id } })
      if (sales > 0) {
        // Preserve sale history — soft-disable instead of deleting.
        await prisma.pharmacyProduct.update({ where: { id }, data: { isActive: false } })
        return { success: true, softDeleted: true }
      }
      await prisma.pharmacyProduct.delete({ where: { id } })
      return { success: true, softDeleted: false }
    } catch (err) { log.error('products:delete', err); throw err }
  })

  // ─── Distinct categories (defaults + any used) ────────────────────────────
  ipcMain.handle('pharmacy:products:getCategories', async () => {
    try {
      const rows = await prisma.pharmacyProduct.findMany({
        select: { category: true }, distinct: ['category'],
      })
      const used = rows.map((r: any) => r.category).filter(Boolean)
      return Array.from(new Set([...DEFAULT_CATEGORIES, ...used])).sort()
    } catch (err) { log.error('products:getCategories', err); throw err }
  })

  // ─── Per-product timeline (batches received / sales / disposals) ──────────
  ipcMain.handle('pharmacy:products:getHistory', async (_e, id: string, params?: { from?: string; to?: string; take?: number }) => {
    try {
      const from = params?.from ? new Date(params.from) : undefined
      const to = params?.to ? new Date(new Date(params.to).getTime() + 86_399_999) : undefined
      const dateFilter = (d: Date) => (!from || d >= from) && (!to || d <= to)
      const take = Math.min(Math.max(params?.take ?? 100, 20), 500)

      const [product, batches, recentItems, aggRows] = await Promise.all([
        prisma.pharmacyProduct.findUnique({ where: { id } }),
        prisma.pharmacyBatch.findMany({ where: { productId: id }, orderBy: { receivedDate: 'desc' } }),
        prisma.pharmacySaleItem.findMany({
          where: { productId: id },
          include: { sale: { select: { saleDate: true, saleNumber: true, customerName: true } } },
          orderBy: { createdAt: 'desc' },
          take,
        }),
        prisma.$queryRawUnsafe(`
          SELECT
            CAST(COALESCE(SUM(quantity), 0) AS REAL)               as soldUnits,
            CAST(COALESCE(SUM(lineTotal), 0) AS REAL)              as revenue,
            CAST(COALESCE(SUM(quantity * costPerUnit), 0) AS REAL) as cogs,
            COUNT(DISTINCT saleId)                                 as saleCount
          FROM PharmacySaleItem WHERE productId = ?
        `, id) as any[],
      ])
      if (!product) throw new Error('Product not found')

      // Current stock + value from active batches
      const active = batches.filter((b: any) => b.status === 'active')
      const currentStock = active.reduce((s: number, b: any) => s + (b.quantity || 0), 0)
      const stockValue = active.reduce((s: number, b: any) => s + (b.quantity || 0) * (b.costPerUnit || 0), 0)
      const retailValue = active.reduce((s: number, b: any) => s + (b.quantity || 0) * ((b.sellingPrice ?? product.sellingPrice) || 0), 0)

      const a = aggRows[0] ?? {}
      const revenue = Number(a.revenue) || 0
      const cogs = Number(a.cogs) || 0

      // Build the movement timeline (received / sold / disposed)
      const events: any[] = []
      for (const b of batches) {
        if (dateFilter(new Date(b.receivedDate))) {
          events.push({ type: 'received', date: b.receivedDate, qty: b.initialQty, batchNumber: b.batchNumber, costPerUnit: b.costPerUnit, value: b.initialQty * b.costPerUnit })
        }
        if (b.disposedAt && dateFilter(new Date(b.disposedAt))) {
          events.push({ type: 'disposed', date: b.disposedAt, qty: b.disposedQty ?? 0, batchNumber: b.batchNumber, reason: b.disposeReason })
        }
      }
      for (const s of recentItems) {
        if (dateFilter(new Date(s.sale.saleDate))) {
          events.push({ type: 'sold', date: s.sale.saleDate, qty: s.quantity, saleUnit: s.saleUnit, unitPrice: s.unitPrice, value: s.lineTotal, refundedQty: s.refundedQty, saleNumber: s.sale.saleNumber, customer: s.sale.customerName })
        }
      }
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return {
        product: {
          id: product.id, name: product.name, genericName: product.genericName, category: product.category,
          unit: product.unit, subUnit: product.subUnit, subUnitsPerContainer: product.subUnitsPerContainer,
          barcode: product.barcode, sellingPrice: product.sellingPrice, minimumStock: product.minimumStock, isActive: product.isActive,
        },
        stats: {
          currentStock,
          stockValue: Math.round(stockValue * 100) / 100,
          retailValue: Math.round(retailValue * 100) / 100,
          soldUnits: Number(a.soldUnits) || 0,
          saleCount: Number(a.saleCount) || 0,
          revenue: Math.round(revenue * 100) / 100,
          cogs: Math.round(cogs * 100) / 100,
          profit: Math.round((revenue - cogs) * 100) / 100,
          margin: revenue > 0 ? Math.round(((revenue - cogs) / revenue) * 1000) / 10 : 0,
          batchCount: batches.length,
          activeBatches: active.length,
          lastSold: recentItems[0]?.sale?.saleDate ?? null,
          lastReceived: batches[0]?.receivedDate ?? null,
        },
        batches: batches.map((b: any) => ({
          id: b.id, batchNumber: b.batchNumber, quantity: b.quantity, initialQty: b.initialQty,
          costPerUnit: b.costPerUnit, sellingPrice: b.sellingPrice, expiryDate: b.expiryDate,
          receivedDate: b.receivedDate, status: b.status, value: (b.quantity || 0) * (b.costPerUnit || 0),
        })),
        events,
        // legacy shape kept for any existing callers
        summary: {
          received: events.filter(e => e.type === 'received').reduce((s, e) => s + e.qty, 0),
          sold: Number(a.soldUnits) || 0,
          disposed: events.filter(e => e.type === 'disposed').reduce((s, e) => s + e.qty, 0),
          revenue: Math.round(revenue * 100) / 100,
        },
      }
    } catch (err) { log.error('products:getHistory', err); throw err }
  })
}
