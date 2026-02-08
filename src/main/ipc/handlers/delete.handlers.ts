import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'
import { DeleteService } from '../../services/DeleteService'

export function registerDeleteHandlers() {
  
  // Check if can delete
  ipcMain.handle('delete:check-customer', async (_, data: { customerId: string }) => {
    try {
      const result = await DeleteService.checkCustomerDelete(data.customerId)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error checking customer delete:', error)
      return {
        success: false,
        error: error.message || 'Failed to check customer'
      }
    }
  })
  
  ipcMain.handle('delete:check-product', async (_, data: { productId: string }) => {
    try {
      const result = await DeleteService.checkProductDelete(data.productId)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error checking product delete:', error)
      return {
        success: false,
        error: error.message || 'Failed to check product'
      }
    }
  })
  
  ipcMain.handle('delete:check-user', async (_, data: { userId: string }) => {
    try {
      const result = await DeleteService.checkUserDeactivate(data.userId)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error checking user deactivate:', error)
      return {
        success: false,
        error: error.message || 'Failed to check user'
      }
    }
  })
  
  // Archive (soft delete)
  ipcMain.handle('delete:archive-customer', async (_, data: {
    customerId: string
    archivedBy: string
    reason?: string
  }) => {
    try {
      const result = await DeleteService.archiveCustomer(
        data.customerId, 
        data.archivedBy, 
        data.reason
      )
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error archiving customer:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('delete:archive-product', async (_, data: {
    productId: string
    archivedBy: string
    reason?: string
  }) => {
    try {
      const result = await DeleteService.archiveProduct(
        data.productId, 
        data.archivedBy, 
        data.reason
      )
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error archiving product:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('delete:deactivate-user', async (_, data: {
    userId: string
    deactivatedBy: string
  }) => {
    try {
      const result = await DeleteService.deactivateUser(
        data.userId, 
        data.deactivatedBy
      )
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error deactivating user:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Restore
  ipcMain.handle('delete:restore-customer', async (_, data: { customerId: string }) => {
    try {
      const result = await DeleteService.restoreCustomer(data.customerId)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error restoring customer:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('delete:restore-product', async (_, data: { productId: string }) => {
    try {
      const result = await DeleteService.restoreProduct(data.productId)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error restoring product:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('delete:reactivate-user', async (_, data: { userId: string }) => {
    try {
      const result = await DeleteService.reactivateUser(data.userId)
      return { success: true, data: result }
    } catch (error: any) {
      console.error('Error reactivating user:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Hard delete (only if allowed)
  ipcMain.handle('delete:hard-delete-customer', async (_, data: { customerId: string }) => {
    try {
      await DeleteService.hardDeleteCustomer(data.customerId)
      return { success: true }
    } catch (error: any) {
      console.error('Error hard deleting customer:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('delete:hard-delete-product', async (_, data: { productId: string }) => {
    try {
      await DeleteService.hardDeleteProduct(data.productId)
      return { success: true }
    } catch (error: any) {
      console.error('Error hard deleting product:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('delete:hard-delete-user', async (_, data: { userId: string }) => {
    try {
      await DeleteService.hardDeleteUser(data.userId)
      return { success: true }
    } catch (error: any) {
      console.error('Error hard deleting user:', error)
      return { success: false, error: error.message }
    }
  })
  
  // Get archived items
  ipcMain.handle('delete:get-archived-customers', async () => {
    try {
      const data = await DeleteService.getArchivedCustomers()
      return { success: true, data }
    } catch (error: any) {
      console.error('Error getting archived customers:', error)
      return { success: false, error: error.message, data: [] }
    }
  })
  
  ipcMain.handle('delete:get-archived-products', async () => {
    try {
      const data = await DeleteService.getArchivedProducts()
      return { success: true, data }
    } catch (error: any) {
      console.error('Error getting archived products:', error)
      return { success: false, error: error.message, data: [] }
    }
  })
  
  ipcMain.handle('delete:get-deactivated-users', async () => {
    try {
      const data = await DeleteService.getDeactivatedUsers()
      return { success: true, data }
    } catch (error: any) {
      console.error('Error getting deactivated users:', error)
      return { success: false, error: error.message, data: [] }
    }
  })
  
  // Cleanup unlinked payments
  ipcMain.handle('delete:cleanup-unlinked-deposits', async (_, customerId) => {
    try {
      const deletedCount = await DeleteService.deleteUnlinkedDeposits(customerId)
      return { success: true, deletedCount }
    } catch (error: any) {
      console.error('Error cleaning up unlinked deposits:', error)
      return { success: false, error: error.message }
    }
  })
  
  ipcMain.handle('delete:cleanup-unlinked-installments', async (_, customerId) => {
    try {
      const deletedCount = await DeleteService.deleteUnlinkedInstallments(customerId)
      return { success: true, deletedCount }
    } catch (error: any) {
      console.error('Error cleaning up unlinked installments:', error)
      return { success: false, error: error.message }
    }
  })
}
