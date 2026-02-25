import { ipcMain } from 'electron'
import { PurchaseOrderService } from '../../services/PurchaseOrderService'
import { SupplierService } from '../../services/SupplierService'
import { ProductService } from '../../services/ProductService'
import { PurchaseOrderRepository } from '../../repositories/PurchaseOrderRepository'
import { createLogger } from '../../utils/logger'
import type {
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  PurchaseOrderFilters
} from '../../../shared/dtos/purchase-order.dto'

const log = createLogger('PurchaseOrders')

let purchaseOrderService: PurchaseOrderService | null = null

export function setupPurchaseOrderHandlers(prisma: any) {
  if (!prisma) {
    log.error('Prisma not available for purchase order handlers')
    return
  }

  // Initialize services
  const supplierService = new SupplierService(prisma)
  const productService = new ProductService(prisma)
  const purchaseOrderRepository = new PurchaseOrderRepository(prisma)

  purchaseOrderService = new PurchaseOrderService(
    purchaseOrderRepository,
    supplierService,
    productService,
    prisma
  )

  // Get all purchase orders
  ipcMain.handle('purchase-orders:get-all', async (_, filters?: PurchaseOrderFilters) => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.getAllPurchaseOrders(filters)
    } catch (error) {
      log.error('Error getting purchase orders:', error)
      throw error
    }
  })

  // Get purchase order by ID
  ipcMain.handle('purchase-orders:get-by-id', async (_, id: string) => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.getPurchaseOrderById(id)
    } catch (error) {
      log.error('Error getting purchase order by ID:', error)
      throw error
    }
  })

  // Get purchase order by PO number
  ipcMain.handle('purchase-orders:get-by-po-number', async (_, poNumber: string) => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.getPurchaseOrderByPoNumber(poNumber)
    } catch (error) {
      log.error('Error getting purchase order by PO number:', error)
      throw error
    }
  })

  // Create purchase order
  ipcMain.handle('purchase-orders:create', async (event, data: CreatePurchaseOrderDTO) => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      // Get current user from auth context (this would be set by auth middleware)
      const userId = (event.sender as any).session?.userId || 'system'
      return await purchaseOrderService.createPurchaseOrder(data, userId)
    } catch (error) {
      log.error('Error creating purchase order:', error)
      throw error
    }
  })

  // Update purchase order
  ipcMain.handle('purchase-orders:update', async (_, id: string, data: UpdatePurchaseOrderDTO) => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.updatePurchaseOrder(id, data)
    } catch (error) {
      log.error('Error updating purchase order:', error)
      throw error
    }
  })

  // Delete purchase order
  ipcMain.handle('purchase-orders:delete', async (_, id: string) => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      await purchaseOrderService.deletePurchaseOrder(id)
      return { success: true }
    } catch (error) {
      log.error('Error deleting purchase order:', error)
      throw error
    }
  })

  // Receive purchase order
  ipcMain.handle('purchase-orders:receive', async (_, id: string, receivedDate?: Date) => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.receivePurchaseOrder(id, receivedDate)
    } catch (error) {
      log.error('Error receiving purchase order:', error)
      throw error
    }
  })

  // Get purchase order summary
  ipcMain.handle('purchase-orders:get-summary', async () => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.getPurchaseOrderSummary()
    } catch (error) {
      log.error('Error getting purchase order summary:', error)
      throw error
    }
  })

  // Get overdue purchase orders
  ipcMain.handle('purchase-orders:get-overdue', async () => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.getOverduePurchaseOrders()
    } catch (error) {
      log.error('Error getting overdue purchase orders:', error)
      throw error
    }
  })

  // Get pending purchase orders
  ipcMain.handle('purchase-orders:get-pending', async () => {
    try {
      if (!purchaseOrderService) throw new Error('Purchase order service not initialized')
      return await purchaseOrderService.getPendingPurchaseOrders()
    } catch (error) {
      log.error('Error getting pending purchase orders:', error)
      throw error
    }
  })
}