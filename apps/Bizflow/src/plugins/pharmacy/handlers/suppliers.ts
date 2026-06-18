import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Pharmacy:Suppliers')

export function registerPharmacySupplierHandlers(prisma: any): void {
  ipcMain.handle('pharmacy:suppliers:getAll', async (_e, params?: { search?: string }) => {
    try {
      const where: any = {}
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }]
      }
      const rows = await prisma.pharmacySupplier.findMany({
        where,
        include: { _count: { select: { orders: true, batches: true } } },
        orderBy: { name: 'asc' },
      })
      return rows.map((s: any) => ({ ...s, orderCount: s._count.orders, batchCount: s._count.batches, _count: undefined }))
    } catch (err) { log.error('suppliers:getAll', err); throw err }
  })

  ipcMain.handle('pharmacy:suppliers:getById', async (_e, id: string) => {
    try {
      return await prisma.pharmacySupplier.findUnique({ where: { id } })
    } catch (err) { log.error('suppliers:getById', err); throw err }
  })

  ipcMain.handle('pharmacy:suppliers:create', async (_e, data: any) => {
    try {
      const name = (data?.name ?? '').trim()
      if (!name) throw new Error('Supplier name is required')
      return await prisma.pharmacySupplier.create({
        data: {
          name,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          address: data.address?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      })
    } catch (err) { log.error('suppliers:create', err); throw err }
  })

  ipcMain.handle('pharmacy:suppliers:update', async (_e, id: string, data: any) => {
    try {
      const patch: any = {}
      for (const k of ['name', 'phone', 'email', 'address', 'notes']) {
        if (data[k] !== undefined) patch[k] = data[k]?.trim() || (k === 'name' ? undefined : null)
      }
      if (patch.name === '') throw new Error('Supplier name is required')
      return await prisma.pharmacySupplier.update({ where: { id }, data: patch })
    } catch (err) { log.error('suppliers:update', err); throw err }
  })

  ipcMain.handle('pharmacy:suppliers:delete', async (_e, id: string) => {
    try {
      await prisma.pharmacySupplier.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('suppliers:delete', err); throw err }
  })
}
