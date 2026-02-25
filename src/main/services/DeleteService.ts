import type { PrismaClient } from '@prisma/client'
import { createLogger } from '../utils/logger'

const log = createLogger('Delete')

export interface DeleteCheckResult {
  canDelete: boolean
  dependencies?: {
    transactions?: number
    sales?: number
    stock?: number
    refunds?: number
    variants?: number
  }
  message: string
  suggestedAction: 'DELETE' | 'ARCHIVE' | 'CANCEL'
}

export class DeleteService {
  private static prisma: PrismaClient
  
  static initialize(prismaClient: PrismaClient) {
    DeleteService.prisma = prismaClient
  }
  
  /**
   * Check if customer can be deleted
   */
  static async checkCustomerDelete(customerId: string): Promise<DeleteCheckResult> {
    const customer = await DeleteService.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        saleTransactions: {
          select: { id: true, total: true }
        }
      }
    })
    
    if (!customer) {
      return {
        canDelete: false,
        message: 'Customer not found.',
        suggestedAction: 'CANCEL'
      }
    }
    
    const transactionCount = customer.saleTransactions.length
    const totalSpent = customer.saleTransactions.reduce((sum, t) => sum + Number(t.total), 0)
    
    if (transactionCount > 0) {
      return {
        canDelete: false,
        dependencies: { transactions: transactionCount },
        message: `Customer has ${transactionCount} transaction(s) worth $${totalSpent.toFixed(2)}. Deleting would break financial records and audit trail.`,
        suggestedAction: 'ARCHIVE'
      }
    }
    
    return {
      canDelete: true,
      message: 'Customer has no transaction history and can be safely deleted.',
      suggestedAction: 'DELETE'
    }
  }
  
  /**
   * Check if product can be deleted
   */
  static async checkProductDelete(productId: string): Promise<DeleteCheckResult> {
    const product = await DeleteService.prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          select: { id: true, stock: true }
        },
        saleItems: {
          select: { id: true }
        }
      }
    })
    
    if (!product) {
      return {
        canDelete: false,
        message: 'Product not found.',
        suggestedAction: 'CANCEL'
      }
    }
    
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)
    const saleCount = product.saleItems.length
    const variantCount = product.variants.length
    
    // Has sales history - cannot delete
    if (saleCount > 0) {
      return {
        canDelete: false,
        dependencies: { 
          sales: saleCount,
          stock: totalStock,
          variants: variantCount
        },
        message: `Product has ${saleCount} past sale(s). Deleting would break transaction history, reports, and refund records.`,
        suggestedAction: 'ARCHIVE'
      }
    }
    
    // Has stock - should warn
    if (totalStock > 0) {
      return {
        canDelete: false,
        dependencies: { 
          stock: totalStock,
          variants: variantCount
        },
        message: `Product has ${totalStock} items in stock across ${variantCount} variant(s). Archive instead to preserve inventory records.`,
        suggestedAction: 'ARCHIVE'
      }
    }
    
    return {
      canDelete: true,
      message: 'Product has no sales history or stock and can be safely deleted.',
      suggestedAction: 'DELETE'
    }
  }
  
  /**
   * Check if user can be deactivated
   */
  static async checkUserDeactivate(userId: string): Promise<DeleteCheckResult> {
    const [transactions, discounts] = await Promise.all([
      DeleteService.prisma.saleTransaction.count({ 
        where: { userId } 
      }),
      DeleteService.prisma.saleItem.count({ 
        where: { discountAppliedBy: userId } 
      })
    ])
    
    const totalActions = transactions + discounts
    
    if (totalActions > 0) {
      return {
        canDelete: false,
        dependencies: {
          transactions,
          sales: discounts
        },
        message: `User has ${transactions} transaction(s) and ${discounts} discount(s). Deactivating preserves audit trail while preventing login.`,
        suggestedAction: 'ARCHIVE'
      }
    }
    
    return {
      canDelete: true,
      message: 'User has no transaction history and can be safely deleted.',
      suggestedAction: 'DELETE'
    }
  }
  
  /**
   * Archive customer (soft delete)
   */
  static async archiveCustomer(customerId: string, archivedBy: string, reason?: string) {
    return await DeleteService.prisma.customer.update({
      where: { id: customerId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
        archiveReason: reason,
        deactivatedAt: new Date(),
        deactivatedBy: archivedBy
      }
    })
  }
  
  /**
   * Archive product (soft delete)
   */
  static async archiveProduct(productId: string, archivedBy: string, reason?: string) {
    return await DeleteService.prisma.product.update({
      where: { id: productId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
        archiveReason: reason,
        deactivatedAt: new Date(),
        deactivatedBy: archivedBy
      }
    })
  }
  
  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(userId: string, deactivatedBy: string) {
    return await DeleteService.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy
      }
    })
  }
  
  /**
   * Restore archived customer
   */
  static async restoreCustomer(customerId: string) {
    return await DeleteService.prisma.customer.update({
      where: { id: customerId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        deactivatedAt: null,
        deactivatedBy: null
      }
    })
  }
  
  /**
   * Restore archived product
   */
  static async restoreProduct(productId: string) {
    return await DeleteService.prisma.product.update({
      where: { id: productId },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        deactivatedAt: null,
        deactivatedBy: null
      }
    })
  }
  
  /**
   * Reactivate user
   */
  static async reactivateUser(userId: string) {
    return await DeleteService.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        deactivatedAt: null,
        deactivatedBy: null
      }
    })
  }
  
  /**
   * Hard delete (only if allowed)
   */
  static async hardDeleteCustomer(customerId: string) {
    const check = await this.checkCustomerDelete(customerId)
    if (!check.canDelete) {
      throw new Error(check.message)
    }
    return await DeleteService.prisma.customer.delete({ where: { id: customerId } })
  }
  
  static async hardDeleteProduct(productId: string) {
    const check = await this.checkProductDelete(productId)
    if (!check.canDelete) {
      throw new Error(check.message)
    }
    
    // Delete variants first (cascade should handle this, but being explicit)
    await DeleteService.prisma.productVariant.deleteMany({ where: { productId } })
    return await DeleteService.prisma.product.delete({ where: { id: productId } })
  }
  
  static async hardDeleteUser(userId: string) {
    const check = await this.checkUserDeactivate(userId)
    if (!check.canDelete) {
      throw new Error(check.message)
    }
    return await DeleteService.prisma.user.delete({ where: { id: userId } })
  }
  
  /**
   * Get archived items for management
   */
  static async getArchivedCustomers() {
    const customers = await DeleteService.prisma.customer.findMany({
      where: { isArchived: true },
      orderBy: { archivedAt: 'desc' }
    })
    
    // Enrich with deactivator info, handling deleted users
    return await Promise.all(customers.map(async (customer) => {
      let deactivatorName = 'Unknown User'
      if (customer.deactivatedBy) {
        const deactivator = await DeleteService.prisma.user.findUnique({
          where: { id: customer.deactivatedBy },
          select: { fullName: true, username: true }
        })
        deactivatorName = deactivator ? (deactivator.fullName || deactivator.username) : 'Deleted User'
      }
      return {
        ...customer,
        deactivatorName
      }
    }))
  }
  
  static async getArchivedProducts() {
    const products = await DeleteService.prisma.product.findMany({
      where: { isArchived: true },
      include: {
        category: true,
        variants: true
      },
      orderBy: { archivedAt: 'desc' }
    })
    
    // Enrich with deactivator info, handling deleted users
    return await Promise.all(products.map(async (product) => {
      let deactivatorName = 'Unknown User'
      if (product.deactivatedBy) {
        const deactivator = await DeleteService.prisma.user.findUnique({
          where: { id: product.deactivatedBy },
          select: { fullName: true, username: true }
        })
        deactivatorName = deactivator ? (deactivator.fullName || deactivator.username) : 'Deleted User'
      }
      return {
        ...product,
        deactivatorName
      }
    }))
  }
  
  static async getDeactivatedUsers() {
    const users = await DeleteService.prisma.user.findMany({
      where: { isActive: false },
      orderBy: { deactivatedAt: 'desc' }
    })
    
    // Enrich with deactivator info, handling deleted users
    return await Promise.all(users.map(async (user) => {
      let deactivatorName = 'Unknown User'
      if (user.deactivatedBy) {
        const deactivator = await DeleteService.prisma.user.findUnique({
          where: { id: user.deactivatedBy },
          select: { fullName: true, username: true }
        })
        deactivatorName = deactivator ? (deactivator.fullName || deactivator.username) : 'Deleted User'
      }
      return {
        ...user,
        deactivatorName
      }
    }))
  }
  
  /**
   * Delete unlinked deposits and installments for a customer
   * Used when customer selection changes in POS to prevent showing old payment data
   */
  static async deleteUnlinkedDeposits(customerId: string) {
    try {
      // Find deposits that are not linked to any sale for this customer
      const deposits = await DeleteService.prisma.deposit.findMany({
        where: {
          customerId: customerId,
          saleId: null
        }
      })
      
      if (deposits.length > 0) {
        // Delete them individually
        const deletePromises = deposits.map(deposit => 
          DeleteService.prisma.deposit.delete({
            where: { id: deposit.id }
          })
        )
        await Promise.all(deletePromises)
        log.info(`✅ Deleted ${deposits.length} unlinked deposits for customer ${customerId}`)
        return deposits.length
      }
      
      return 0
    } catch (error) {
      log.error('❌ Error deleting unlinked deposits:', error)
      throw error
    }
  }
  
  static async deleteUnlinkedInstallments(customerId: string) {
    try {
      // Find installments that are not linked to any sale for this customer
      const installments = await DeleteService.prisma.installment.findMany({
        where: {
          customerId: customerId,
          saleId: null
        }
      })
      
      if (installments.length > 0) {
        // Delete them individually
        const deletePromises = installments.map(installment => 
          DeleteService.prisma.installment.delete({
            where: { id: installment.id }
          })
        )
        await Promise.all(deletePromises)
        log.info(`✅ Deleted ${installments.length} unlinked installments for customer ${customerId}`)
        return installments.length
      }
      
      return 0
    } catch (error) {
      log.error('❌ Error deleting unlinked installments:', error)
      throw error
    }
  }
}
