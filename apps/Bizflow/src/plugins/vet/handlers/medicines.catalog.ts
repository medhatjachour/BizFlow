/**
 * Vet medicine catalogue CRUD handlers.
 *   vet:medicines:getAll / create / update / delete
 * Split out of medicines.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Medicines')

export function registerVetMedicineCatalogHandlers(prisma: any) {
  // ─── Get All Medicines ───────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:getAll', async (_e, params?: {
    search?: string; category?: string; skip?: number; take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.search) {
        where.OR = [
          { name: { contains: params.search } },
          { description: { contains: params.search } }
        ]
      }
      if (params?.category && params.category !== 'all') {
        where.category = params.category
      }

      const skip  = params?.skip ?? 0
      const take  = params?.take ?? 50
      const total = await prisma.vetMedicine.count({ where })

      const medicines = await prisma.vetMedicine.findMany({
        where,
        include: {
          batches: {
            orderBy: { expiryDate: 'asc' },
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
              quantity: true,
              initialQty: true,
              costPerUnit: true,
              sellingPrice: true,
              receivedDate: true,
              supplier: true,
              notes: true,
              createdAt: true
            }
          },
          _count: { select: { sales: true } }
        },
        orderBy: { name: 'asc' },
        skip,
        take
      })

      // Compute aggregated stock and expiry info per medicine
      const enriched = medicines.map((m: any) => {
        const now = new Date()
        const activeBatches = m.batches.filter((b: any) => b.quantity > 0)
        const totalStock = activeBatches.reduce((sum: number, b: any) => sum + b.quantity, 0)
        const nearestExpiry = activeBatches.length > 0 ? activeBatches[0].expiryDate : null
        const hasExpired = m.batches.some((b: any) =>
          new Date(b.expiryDate) < now && b.quantity > 0
        )
        const expiresWithin30Days = m.batches.some((b: any) => {
          const exp = new Date(b.expiryDate)
          const diff = (exp.getTime() - now.getTime()) / 86400000
          return diff >= 0 && diff <= 30 && b.quantity > 0
        })

        return {
          ...m,
          totalStock,
          nearestExpiry,
          hasExpired,
          expiresWithin30Days,
          batchCount: m.batches.length,
          activeBatchCount: activeBatches.length,
          salesCount: m._count.sales,
          isLowStock: totalStock <= m.minimumStock && m.minimumStock > 0
        }
      })

      return { data: enriched, total, hasMore: skip + take < total }
    } catch (err) { log.error('getAll', err); throw err }
  })

  // ─── Create Medicine ──────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:create', async (_e, data: {
    name: string; category?: string; unit?: string;
    description?: string; minimumStock?: number
  }) => {
    try {
      return await prisma.vetMedicine.create({ data })
    } catch (err) { log.error('create', err); throw err }
  })

  // ─── Update Medicine ──────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:update', async (_e, id: string, data: any) => {
    try {
      return await prisma.vetMedicine.update({ where: { id }, data })
    } catch (err) { log.error('update', err); throw err }
  })

  // ─── Delete Medicine ──────────────────────────────────────────────────────
  ipcMain.handle('vet:medicines:delete', async (_e, id: string) => {
    try {
      await prisma.vetMedicine.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('delete', err); throw err }
  })
}
