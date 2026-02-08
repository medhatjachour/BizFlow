import { db } from '../database/sqlite'

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
  /**
   * Check if customer can be deleted
   */
  static async checkCustomerDelete(customerId: string): Promise<DeleteCheckResult> {
    const customer = db.queryOne('SELECT * FROM Customer WHERE id = ?', [customerId])
    
    if (!customer) {
      return {
        canDelete: false,
        message: 'Customer not found.',
        suggestedAction: 'CANCEL'
      }
    }
    
    const transactions = db.query('SELECT id, total FROM SaleTransaction WHERE customerId = ?', [customerId])
    const transactionCount = transactions.length
    const totalSpent = transactions.reduce((sum: number, t: any) => sum + Number(t.total), 0)
    
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
    const product = db.queryOne('SELECT * FROM Product WHERE id = ?', [productId])
    
    if (!product) {
      return {
        canDelete: false,
        message: 'Product not found.',
        suggestedAction: 'CANCEL'
      }
    }
    
    const variants = db.query('SELECT id, stock FROM ProductVariant WHERE productId = ?', [productId])
    const saleItems = db.query('SELECT id FROM SaleItem WHERE productId = ?', [productId])
    
    const totalStock = variants.reduce((sum: number, v: any) => sum + v.stock, 0)
    const saleCount = saleItems.length
    const variantCount = variants.length
    
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
    const transactions = db.queryOne('SELECT COUNT(*) as count FROM SaleTransaction WHERE userId = ?', [userId])
    const discounts = db.queryOne('SELECT COUNT(*) as count FROM SaleItem WHERE discountAppliedBy = ?', [userId])
    
    const transactionCount = transactions?.count || 0
    const discountCount = discounts?.count || 0
    const totalActions = transactionCount + discountCount
    
    if (totalActions > 0) {
      return {
        canDelete: false,
        dependencies: {
          transactions: transactionCount,
          sales: discountCount
        },
        message: `User has ${transactionCount} transaction(s) and ${discountCount} discount(s). Deactivating preserves audit trail while preventing login.`,
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
    db.execute(
      'UPDATE Customer SET isArchived = 1, archivedAt = ?, archivedBy = ?, archiveReason = ? WHERE id = ?',
      [new Date().toISOString(), archivedBy, reason || null, customerId]
    )
    return db.queryOne('SELECT * FROM Customer WHERE id = ?', [customerId])
  }
  
  /**
   * Archive product (soft delete)
   */
  static async archiveProduct(productId: string, archivedBy: string, reason?: string) {
    db.execute(
      'UPDATE Product SET isArchived = 1, archivedAt = ?, archivedBy = ?, archiveReason = ? WHERE id = ?',
      [new Date().toISOString(), archivedBy, reason || null, productId]
    )
    return db.queryOne('SELECT * FROM Product WHERE id = ?', [productId])
  }
  
  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(userId: string, deactivatedBy: string) {
    db.execute(
      'UPDATE User SET isActive = 0, deactivatedAt = ?, deactivatedBy = ? WHERE id = ?',
      [new Date().toISOString(), deactivatedBy, userId]
    )
    return db.queryOne('SELECT * FROM User WHERE id = ?', [userId])
  }
  
  /**
   * Restore archived customer
   */
  static async restoreCustomer(customerId: string) {
    db.execute(
      'UPDATE Customer SET isArchived = 0, archivedAt = NULL, archivedBy = NULL, archiveReason = NULL WHERE id = ?',
      [customerId]
    )
    return db.queryOne('SELECT * FROM Customer WHERE id = ?', [customerId])
  }
  
  /**
   * Restore archived product
   */
  static async restoreProduct(productId: string) {
    db.execute(
      'UPDATE Product SET isArchived = 0, archivedAt = NULL, archivedBy = NULL, archiveReason = NULL WHERE id = ?',
      [productId]
    )
    return db.queryOne('SELECT * FROM Product WHERE id = ?', [productId])
  }
  
  /**
   * Reactivate user
   */
  static async reactivateUser(userId: string) {
    db.execute(
      'UPDATE User SET isActive = 1, deactivatedAt = NULL, deactivatedBy = NULL WHERE id = ?',
      [userId]
    )
    return db.queryOne('SELECT * FROM User WHERE id = ?', [userId])
  }
  
  /**
   * Hard delete (only if allowed)
   */
  static async hardDeleteCustomer(customerId: string) {
    const check = await this.checkCustomerDelete(customerId)
    if (!check.canDelete) {
      throw new Error(check.message)
    }
    db.execute('DELETE FROM Customer WHERE id = ?', [customerId])
    return { id: customerId }
  }
  
  static async hardDeleteProduct(productId: string) {
    const check = await this.checkProductDelete(productId)
    if (!check.canDelete) {
      throw new Error(check.message)
    }
    
    db.transaction(() => {
      db.execute('DELETE FROM ProductVariant WHERE productId = ?', [productId])
      db.execute('DELETE FROM Product WHERE id = ?', [productId])
    })
    return { id: productId }
  }
  
  static async hardDeleteUser(userId: string) {
    const check = await this.checkUserDeactivate(userId)
    if (!check.canDelete) {
      throw new Error(check.message)
    }
    db.execute('DELETE FROM User WHERE id = ?', [userId])
    return { id: userId }
  }
  
  /**
   * Get archived items for management
   */
  static async getArchivedCustomers() {
    return db.query('SELECT * FROM Customer WHERE isArchived = 1 ORDER BY archivedAt DESC')
  }
  
  static async getArchivedProducts() {
    const query = `
      SELECT 
        p.*,
        c.name as categoryName,
        (SELECT COUNT(*) FROM ProductVariant WHERE productId = p.id) as variantCount
      FROM Product p
      LEFT JOIN Category c ON p.categoryId = c.id
      WHERE p.isArchived = 1
      ORDER BY p.archivedAt DESC
    `
    return db.query(query)
  }
  
  static async getDeactivatedUsers() {
    return db.query('SELECT * FROM User WHERE isActive = 0 ORDER BY deactivatedAt DESC')
  }
  
  /**
   * Delete unlinked deposits and installments for a customer
   * Used when customer selection changes in POS to prevent showing old payment data
   */
  static async deleteUnlinkedDeposits(customerId: string) {
    try {
      const deposits = db.query(
        'SELECT id FROM Deposit WHERE customerId = ? AND saleId IS NULL',
        [customerId]
      )
      
      if (deposits.length > 0) {
        deposits.forEach((deposit: any) => {
          db.execute('DELETE FROM Deposit WHERE id = ?', [deposit.id])
        })
        console.log(`✅ Deleted ${deposits.length} unlinked deposits for customer ${customerId}`)
        return deposits.length
      }
      
      return 0
    } catch (error) {
      console.error('❌ Error deleting unlinked deposits:', error)
      throw error
    }
  }
  
  static async deleteUnlinkedInstallments(customerId: string) {
    try {
      const installments = db.query(
        'SELECT id FROM Installment WHERE customerId = ? AND saleId IS NULL',
        [customerId]
      )
      
      if (installments.length > 0) {
        installments.forEach((installment: any) => {
          db.execute('DELETE FROM Installment WHERE id = ?', [installment.id])
        })
        console.log(`✅ Deleted ${installments.length} unlinked installments for customer ${customerId}`)
        return installments.length
      }
      
      return 0
    } catch (error) {
      console.error('❌ Error deleting unlinked installments:', error)
      throw error
    }
  }
}
