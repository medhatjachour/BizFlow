import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { getImageService } from '../../../main/services/ImageService'

const log = createLogger('Coffee:Products')

// ── ADD THIS: Unit precision helpers ────────────────────────────────────────────
const UNITS: Record<string, { decimals: number }> = {
  piece: { decimals: 0 },
  kg:    { decimals: 3 },
  g:     { decimals: 0 },
  lb:    { decimals: 3 },
  liter: { decimals: 3 },
  ml:    { decimals: 0 },
}

const roundToUnit = (value: number, unit: string): number => {
  const decimals = UNITS[unit]?.decimals ?? 0
  return parseFloat(value.toFixed(decimals))
}
// ────────────────────────────────────────────────────────────────────────────────

export function registerProductHandlers(prisma: any) {
  // ── Categories ─────────────────────────────────
  ipcMain.handle('coffee:categories:getAll', async () => {
    try {
      return await prisma.coffeeCategory.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
      })
    } catch (err) { log.error('categories:getAll', err); throw err }
  })

  ipcMain.handle('coffee:categories:create', async (_e, data: any) => {
    try { return await prisma.coffeeCategory.create({ data }) } 
    catch (err) { log.error('categories:create', err); throw err }
  })

  ipcMain.handle('coffee:categories:update', async (_e, data: any) => {
    try { const { id, ...rest } = data; return await prisma.coffeeCategory.update({ where: { id }, data: rest }) } 
    catch (err) { log.error('categories:update', err); throw err }
  })

  ipcMain.handle('coffee:categories:delete', async (_e, id: string) => {
    try { return await prisma.coffeeCategory.delete({ where: { id } }) } 
    catch (err) { log.error('categories:delete', err); throw err }
  })

  // ── Products ─────────────────────────────────────────────────────────────────
  ipcMain.handle('coffee:products:getAll', async (_e, opts?: any) => {
    try {
      const where: any = {}
      if (opts?.categoryId) where.categoryId = opts.categoryId
      if (opts?.available !== undefined) where.isAvailable = opts.available
      if (opts?.search) where.name = { contains: opts.search }
      if (opts?.unit) where.unit = opts.unit
      
      const products = await prisma.coffeeProduct.findMany({
        where,
        include: { category: { select: { id: true, name: true, color: true, icon: true } } },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
      })
      
      return products.map((p: any) => ({
        ...p,
        needsReorder: p.stock <= p.reorderPoint
      }))
    } catch (err) { log.error('products:getAll', err); throw err }
  })

  ipcMain.handle('coffee:products:getById', async (_e, id: string) => {
    try {
      const product = await prisma.coffeeProduct.findUnique({
        where: { id },
        include: { category: true }
      })
      if (!product) return null
      return { ...product, needsReorder: product.stock <= product.reorderPoint }
    } catch (err) { log.error('products:getById', err); throw err }
  })

  // ── UPDATE THIS: Create Product ──
  ipcMain.handle('coffee:products:create', async (_e, data: any) => {
    try {
      const unit = data.unit ?? 'piece'
      const initialStock = roundToUnit(data.stock ?? 0, unit)
      
      const product = await prisma.coffeeProduct.create({
        data: {
          ...data,
          unit,
          stock: initialStock,
          reorderPoint: roundToUnit(data.reorderPoint ?? 5, unit)
        },
        include: { category: true }
      })
      
      if (initialStock > 0) {
        await prisma.coffeeStockMovement.create({
          data: {
            productId: product.id,
            type: 'initial',
            quantity: initialStock,
            previousStock: 0,
            newStock: initialStock,
            reason: 'Initial stock on product creation'
          }
        })
      }
      return product
    } catch (err) { log.error('products:create', err); throw err }
  })

  // ── UPDATE THIS: Update Product ──
  ipcMain.handle('coffee:products:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data
      
      // Round stock and reorder if provided
      if (rest.unit && rest.stock != null) rest.stock = roundToUnit(rest.stock, rest.unit)
      if (rest.unit && rest.reorderPoint != null) rest.reorderPoint = roundToUnit(rest.reorderPoint, rest.unit)
      
      const product = await prisma.coffeeProduct.update({
        where: { id },
        data: rest,
        include: { category: true }
      })
      
      return { ...product, needsReorder: product.stock <= product.reorderPoint }
    } catch (err) { log.error('products:update', err); throw err }
  })

  ipcMain.handle('coffee:products:delete', async (_e, id: string) => {
    try { return await prisma.coffeeProduct.delete({ where: { id } }) } 
    catch (err) { log.error('products:delete', err); throw err }
  })

  ipcMain.handle('coffee:products:toggleAvailability', async (_e, { id, isAvailable }: any) => {
    try { return await prisma.coffeeProduct.update({ where: { id }, data: { isAvailable } }) } 
    catch (err) { log.error('products:toggleAvailability', err); throw err }
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

  // ── UPDATE THIS: Adjust Inventory ──
  ipcMain.handle('coffee:inventory:adjust', async (_e, data: any) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const product = await tx.coffeeProduct.findUniqueOrThrow({ where: { id: data.productId } })
        
        // Round the incoming adjustment to the unit's precision
        const delta = roundToUnit(data.quantity, product.unit)
        const newStock = Math.max(0, roundToUnit(product.stock + delta, product.unit))
        
        await tx.coffeeProduct.update({
          where: { id: data.productId },
          data: { stock: newStock }
        })
        
        return tx.coffeeStockMovement.create({
          data: {
            productId: data.productId,
            type: data.type,
            quantity: delta,
            previousStock: product.stock,
            newStock,
            reason: data.reason,
            notes: data.notes
          }
        })
      })
    } catch (err) { log.error('inventory:adjust', err); throw err }
  })

  // ── Product images (Keep exactly as you had them) ─────────────────────────────
  ipcMain.handle('coffee:products:saveImage', async (_e, base64Data: string) => {
    try { return await getImageService().saveImage(base64Data) } 
    catch (err) { log.error('products:saveImage', err); throw err }
  })

  ipcMain.handle('coffee:products:loadImage', async (_e, filename: string) => {
    try { return await getImageService().getImageDataUrl(filename) } 
    catch (err) { log.error('products:loadImage', err); return null }
  })
}
