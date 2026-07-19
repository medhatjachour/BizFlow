// ─── Coffee: Products & Categories Handlers ───────────────────────────────────
// IPC channels:
//   coffee:categories:getAll/create/update/delete
//   coffee:products:getAll/getById/create/update/delete/toggleAvailability
//   coffee:inventory:getMovements/adjust
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { getImageService } from '../../../main/services/ImageService'

const log = createLogger('Coffee:Products')

export function registerProductHandlers(prisma: any) {
  // ── Categories ──────────────────────────────────────────────────────────────
  ipcMain.handle('coffee:categories:getAll', async () => {
    try {
      return await prisma.coffeeCategory.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
      })
    } catch (err) { log.error('categories:getAll', err); throw err }
  })

  ipcMain.handle('coffee:categories:create', async (_e, data: { name: string; description?: string; color?: string; icon?: string; displayOrder?: number }) => {
    try {
      return await prisma.coffeeCategory.create({ data })
    } catch (err) { log.error('categories:create', err); throw err }
  })

  ipcMain.handle('coffee:categories:update', async (_e, data: { id: string; name?: string; description?: string; color?: string; icon?: string; displayOrder?: number }) => {
    try {
      const { id, ...rest } = data
      return await prisma.coffeeCategory.update({ where: { id }, data: rest })
    } catch (err) { log.error('categories:update', err); throw err }
  })

  ipcMain.handle('coffee:categories:delete', async (_e, id: string) => {
    try {
      return await prisma.coffeeCategory.delete({ where: { id } })
    } catch (err) { log.error('categories:delete', err); throw err }
  })

  // ── Products ─────────────────────────────────────────────────────────────────
  ipcMain.handle('coffee:products:getAll', async (_e, opts?: { categoryId?: string; available?: boolean; search?: string }) => {
    try {
      const where: any = {}
      if (opts?.categoryId)           where.categoryId  = opts.categoryId
      if (opts?.available !== undefined) where.isAvailable = opts.available
      if (opts?.search)               where.name = { contains: opts.search }
      return await prisma.coffeeProduct.findMany({
        where,
        include: { category: { select: { id: true, name: true, color: true, icon: true } } },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
      })
    } catch (err) { log.error('products:getAll', err); throw err }
  })

  ipcMain.handle('coffee:products:getById', async (_e, id: string) => {
    try {
      return await prisma.coffeeProduct.findUnique({
        where: { id },
        include: { category: true }
      })
    } catch (err) { log.error('products:getById', err); throw err }
  })

  ipcMain.handle('coffee:products:create', async (_e, data: {
    name: string; categoryId?: string; description?: string; price: number;
    cost?: number; stock?: number; reorderPoint?: number; image?: string;
    isAvailable?: boolean; displayOrder?: number; notes?: string
  }) => {
    try {
      const initialStock = data.stock ?? 0
      const product = await prisma.coffeeProduct.create({
        data: { ...data, stock: initialStock },
        include: { category: true }
      })
      // Log initial stock as a movement so inventory history starts correctly
      if (initialStock > 0) {
        await prisma.coffeeStockMovement.create({
          data: {
            productId:     product.id,
            type:          'initial',
            quantity:      initialStock,
            previousStock: 0,
            newStock:      initialStock,
            reason:        'Initial stock on product creation'
          }
        })
      }
      return product
    } catch (err) { log.error('products:create', err); throw err }
  })

  ipcMain.handle('coffee:products:update', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, ...rest } = data
      return await prisma.coffeeProduct.update({
        where: { id },
        data: rest,
        include: { category: true }
      })
    } catch (err) { log.error('products:update', err); throw err }
  })

  ipcMain.handle('coffee:products:delete', async (_e, id: string) => {
    try {
      return await prisma.coffeeProduct.delete({ where: { id } })
    } catch (err) { log.error('products:delete', err); throw err }
  })

  ipcMain.handle('coffee:products:toggleAvailability', async (_e, { id, isAvailable }: { id: string; isAvailable: boolean }) => {
    try {
      return await prisma.coffeeProduct.update({ where: { id }, data: { isAvailable } })
    } catch (err) { log.error('products:toggleAvailability', err); throw err }
  })

  // ── Inventory / Stock movements ───────────────────────────────────────────────
  ipcMain.handle('coffee:inventory:getMovements', async (_e, productId: string) => {
    try {
      return await prisma.coffeeStockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
    } catch (err) { log.error('inventory:getMovements', err); throw err }
  })

  ipcMain.handle('coffee:inventory:adjust', async (_e, data: {
    productId: string; quantity: number; type: string; reason?: string; notes?: string
  }) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const product = await tx.coffeeProduct.findUniqueOrThrow({ where: { id: data.productId } })
        const newStock = Math.max(0, product.stock + data.quantity)
        await tx.coffeeProduct.update({ where: { id: data.productId }, data: { stock: newStock } })
        return tx.coffeeStockMovement.create({
          data: {
            productId:     data.productId,
            type:          data.type,
            quantity:      data.quantity,
            previousStock: product.stock,
            newStock,
            reason:        data.reason,
            notes:         data.notes
          }
        })
      })
    } catch (err) { log.error('inventory:adjust', err); throw err }
  })

  // ── Product images ────────────────────────────────────────────────────────────
  /** Save a base64 image to disk, return the filename stored in DB. */
  ipcMain.handle('coffee:products:saveImage', async (_e, base64Data: string) => {
    try {
      const svc = getImageService()
      const filename = await svc.saveImage(base64Data)
      return filename
    } catch (err) { log.error('products:saveImage', err); throw err }
  })

  /** Load a saved image as base64 data URL for display. */
  ipcMain.handle('coffee:products:loadImage', async (_e, filename: string) => {
    try {
      const svc = getImageService()
      return await svc.getImageDataUrl(filename)
    } catch (err) { log.error('products:loadImage', err); return null }
  })
}
