/**
 * Inventory IPC Handlers
 * Enhanced with service layer for better architecture
 * Uses Repository pattern via InventoryService
 */

import { ipcMain } from 'electron'
import { InventoryService } from '../../services/InventoryService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Inventory')

export function registerInventoryHandlers(prisma: any) {
  const inventoryService = InventoryService.getInstance(prisma)

  // Get all inventory items with enriched data
  ipcMain.handle('inventory:getAll', async () => {
    try {
      // Include images for inventory modal display
      return await inventoryService.getAllInventory({ includeImages: true })
    } catch (error) {
      log.error('Error fetching inventory:', error)
      throw error
    }
  })

  // Get inventory metrics
  ipcMain.handle('inventory:getMetrics', async () => {
    try {
      return await inventoryService.getInventoryMetrics()
    } catch (error) {
      log.error('Error fetching metrics:', error)
      throw error
    }
  })

  // Get top stocked items
  ipcMain.handle('inventory:getTopStocked', async (_, limit: number = 5) => {
    try {
      return await inventoryService.getTopStockedItems(limit)
    } catch (error) {
      log.error('Error fetching top stocked items:', error)
      throw error
    }
  })

  // Get low stock items
  ipcMain.handle('inventory:getLowStock', async (_, threshold: number = 10) => {
    try {
      return await inventoryService.getLowStockItems(threshold)
    } catch (error) {
      log.error('Error fetching low stock items:', error)
      throw error
    }
  })

  // Get out of stock items
  ipcMain.handle('inventory:getOutOfStock', async () => {
    try {
      return await inventoryService.getOutOfStockItems()
    } catch (error) {
      log.error('Error fetching out of stock items:', error)
      throw error
    }
  })

  // Search inventory
  ipcMain.handle('inventory:search', async (_, query: string) => {
    try {
      return await inventoryService.searchInventory(query)
    } catch (error) {
      log.error('Error searching inventory:', error)
      throw error
    }
  })

  // Get stock movement history
  ipcMain.handle('inventory:getStockHistory', async (_, productId: string) => {
    try {
      return await inventoryService.getStockMovementHistory(productId)
    } catch (error) {
      log.error('Error fetching stock history:', error)
      throw error
    }
  })

  // Update variant stock
  ipcMain.handle('inventory:updateStock', async (_, { variantId, stock }: { variantId: string, stock: number }) => {
    try {
      await inventoryService.updateVariantStock(variantId, stock)
      return { success: true }
    } catch (error) {
      log.error('Error updating stock:', error)
      throw error
    }
  })

  // Legacy handler for backward compatibility
  ipcMain.handle('inventory:getProducts', async () => {
    try {
      return await inventoryService.getAllInventory()
    } catch (error) {
      log.error('Error fetching products:', error)
      throw error
    }
  })

  // Search products by barcode - FAST lookup for POS
  ipcMain.handle('inventory:searchByBarcode', async (_, barcode: string) => {
    try {
      if (!barcode || typeof barcode !== 'string') {
        return null
      }

      const trimmedBarcode = barcode.trim()

      // STEP 1: Try to find a variant with this barcode
      const variant = await prisma.productVariant.findUnique({
        where: { barcode: trimmedBarcode },
        include: {
          product: {
            include: {
              category: true,
              images: true,
              variants: true // Include all variants for the product
            }
          }
        }
      })

      if (variant) {
        // Found a variant - return product with this variant selected
        return {
          id: variant.product.id,
          name: variant.product.name,
          baseSKU: variant.product.baseSKU,
          category: variant.product.category,
          price: variant.product.price,
          cost: variant.product.cost,
          hasVariants: variant.product.hasVariants,
          selectedVariant: {
            id: variant.id,
            sku: variant.sku,
            barcode: variant.barcode,
            color: variant.color,
            size: variant.size,
            stock: variant.stock,
            price: variant.price,
            cost: variant.cost
          },
          variants: variant.product.variants,
          images: variant.product.images
        }
      }

      // STEP 2: Try to find a product with baseBarcode
      const product = await prisma.product.findUnique({
        where: { baseBarcode: trimmedBarcode },
        include: {
          category: true,
          images: true,
          variants: true
        }
      })

      if (product) {
        // Found a product by baseBarcode
        // If it has variants, return first available variant
        if (product.hasVariants && product.variants.length > 0) {
          const firstVariant = product.variants[0]
          return {
            id: product.id,
            name: product.name,
            baseSKU: product.baseSKU,
            category: product.category,
            price: product.price,
            cost: product.cost,
            hasVariants: product.hasVariants,
            selectedVariant: {
              id: firstVariant.id,
              sku: firstVariant.sku,
              barcode: firstVariant.barcode,
              color: firstVariant.color,
              size: firstVariant.size,
              stock: firstVariant.stock,
              price: firstVariant.price,
              cost: firstVariant.cost
            },
            variants: product.variants,
            images: product.images
          }
        }

        // Simple product without variants
        return {
          id: product.id,
          name: product.name,
          baseSKU: product.baseSKU,
          category: product.category,
          price: product.price,
          cost: product.cost,
          hasVariants: product.hasVariants,
          selectedVariant: null,
          variants: product.variants,
          images: product.images
        }
      }

      // Not found
      return null
    } catch (error) {
      log.error('Error searching by barcode:', error)
      return null
    }
  })
}
