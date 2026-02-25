/**
 * Suppliers IPC Handlers
 * Supplier management with product relationships and purchase order tracking
 */

import { ipcMain } from 'electron'
import { SupplierService } from '../../services/SupplierService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Suppliers')

let supplierService: SupplierService | null = null

export function registerSupplierHandlers(prisma: any) {
  if (!prisma) {
    log.error('Prisma not available for supplier handlers')
    return
  }

  supplierService = new SupplierService(prisma)

  /**
   * Get all suppliers with pagination and filtering
   */
  ipcMain.handle('suppliers:getAll', async (_, options = {}) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const {
        page = 1,
        pageSize = 20,
        search,
        isActive,
        sortBy,
        sortOrder
      } = options

      const query = {
        page,
        pageSize,
        search,
        isActive,
        sortBy,
        sortOrder
      }

      const result = await supplierService.querySuppliers(query)
      return { success: true, data: result }
    } catch (error) {
      log.error('Error fetching suppliers:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Get single supplier by ID
   */
  ipcMain.handle('suppliers:getById', async (_, id: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const supplier = await supplierService.getSupplier(id)
      return { success: true, data: supplier }
    } catch (error) {
      log.error('Error fetching supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Create new supplier
   */
  ipcMain.handle('suppliers:create', async (_, supplierData) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const supplier = await supplierService.createSupplier(supplierData)
      return { success: true, data: supplier }
    } catch (error) {
      log.error('Error creating supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Update supplier
   */
  ipcMain.handle('suppliers:update', async (_, id: string, updateData) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const supplier = await supplierService.updateSupplier(id, updateData)
      return { success: true, data: supplier }
    } catch (error) {
      log.error('Error updating supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Delete supplier (deactivate)
   */
  ipcMain.handle('suppliers:delete', async (_, id: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const result = await supplierService.deleteSupplier(id)
      return { success: true, data: result }
    } catch (error) {
      log.error('Error deleting supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Get supplier products
   */
  ipcMain.handle('suppliers:getProducts', async (_, supplierId: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const products = await supplierService.getSupplierProducts(supplierId)
      return { success: true, data: products }
    } catch (error) {
      log.error('Error fetching supplier products:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Add product to supplier
   */
  ipcMain.handle('suppliers:addProduct', async (_, supplierProductData) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const supplierProduct = await supplierService.addSupplierProduct(supplierProductData)
      return { success: true, data: supplierProduct }
    } catch (error) {
      log.error('Error adding product to supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Add product to supplier (alias for compatibility)
   */
  ipcMain.handle('suppliers:addSupplierProduct', async (_, supplierId: string, supplierProductData) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const supplierProduct = await supplierService.addSupplierProduct(supplierProductData)
      return { success: true, data: supplierProduct }
    } catch (error) {
      log.error('Error adding product to supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Get supplier products
   */
  ipcMain.handle('suppliers:getSupplierProducts', async (_, supplierId: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const products = await supplierService.getSupplierProducts(supplierId)
      return { success: true, data: products }
    } catch (error) {
      log.error('Error getting supplier products:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Update supplier product
   */
  ipcMain.handle('suppliers:updateProduct', async (_, id: string, updateData) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const supplierProduct = await supplierService.updateSupplierProduct(id, updateData)
      return { success: true, data: supplierProduct }
    } catch (error) {
      log.error('Error updating supplier product:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Remove product from supplier
   */
  ipcMain.handle('suppliers:removeProduct', async (_, id: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const result = await supplierService.removeSupplierProduct(id)
      return { success: true, data: result }
    } catch (error) {
      log.error('Error removing product from supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Remove product from supplier (alias for compatibility)
   */
  ipcMain.handle('suppliers:removeSupplierProduct', async (_, id: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const result = await supplierService.removeSupplierProduct(id)
      return { success: true, data: result }
    } catch (error) {
      log.error('Error removing product from supplier:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Get preferred suppliers for a product
   */
  ipcMain.handle('suppliers:getPreferredForProduct', async (_, productId: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const suppliers = await supplierService.getPreferredSuppliersForProduct(productId)
      return { success: true, data: suppliers }
    } catch (error) {
      log.error('Error fetching preferred suppliers for product:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Search suppliers
   */
  ipcMain.handle('suppliers:search', async (_, query: string) => {
    try {
      if (!supplierService) {
        return { success: false, message: 'Supplier service not available' }
      }

      const suppliers = await supplierService.querySuppliers({ search: query })
      return { success: true, data: suppliers.data }
    } catch (error) {
      log.error('Error searching suppliers:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  log.info('Supplier IPC handlers registered')
}