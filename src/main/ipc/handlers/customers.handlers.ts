/**
 * Customers IPC Handlers - better-sqlite3 Version
 * High-performance customer management with SQL queries
 * ~5x faster than Prisma version
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'
import * as XLSX from 'xlsx'

export function registerCustomersHandlers() {
  /**
   * Helper function to recalculate customer totalSpent from transactions
   */
  function recalculateCustomerTotalSpent(customerId: string) {
    try {
      const result = db.queryOne(`
        SELECT SUM(total) as totalSpent
        FROM SaleTransaction
        WHERE customerId = ? AND status = 'completed'
      `, [customerId])
      
      const totalSpent = result?.totalSpent || 0
      
      db.execute(
        'UPDATE Customer SET totalSpent = ? WHERE id = ?',
        [totalSpent, customerId]
      )
    } catch (error) {
      console.error('Error recalculating customer totalSpent:', error)
    }
  }

  /**
   * Get all customers with pagination and search
   */
  ipcMain.handle('customers:getAll', async (_, options = {}) => {
    try {
      const {
        limit = 100,
        offset = 0,
        searchTerm = ''
      } = options

      // Build WHERE clause for search
      const whereClauses: string[] = ['isArchived = 0']
      const params: any[] = []
      
      if (searchTerm) {
        whereClauses.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)')
        const searchPattern = `%${searchTerm}%`
        params.push(searchPattern, searchPattern, searchPattern)
      }

      const whereSQL = whereClauses.join(' AND ')

      // Get customers with pagination
      const customers = db.query(`
        SELECT * FROM Customer
        WHERE ${whereSQL}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset])
      
      // Get transaction stats for each customer
      for (const customer of customers) {
        const stats = db.queryOne(`
          SELECT 
            COUNT(*) as purchaseCount,
            SUM(total) as realTotalSpent
          FROM SaleTransaction
          WHERE customerId = ? AND status = 'completed'
        `, [customer.id])
        
        customer.totalSpent = stats?.realTotalSpent || 0
        customer.purchaseCount = stats?.purchaseCount || 0
      }
      
      // Calculate total count
      const totalCount = db.count('Customer', whereSQL, params)
      
      return {
        customers,
        totalCount,
        hasMore: offset + limit < totalCount
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      throw error
    }
  })

  /**
   * Create new customer
   */
  ipcMain.handle('customers:create', async (_, customerData) => {
    try {
      // Normalize empty email to null to avoid unique constraint issues
      const normalizedData = {
        ...customerData,
        email: customerData.email?.trim() || null
      }
      
      // Check if phone already exists
      const existingCustomer = db.queryOne(
        'SELECT * FROM Customer WHERE phone = ?',
        [normalizedData.phone]
      )
      
      if (existingCustomer) {
        return { 
          success: false, 
          message: 'A customer with this phone number already exists',
          existingCustomer 
        }
      }
      
      // Create customer
      const customerId = normalizedData.id || `cust_${Date.now()}`
      db.execute(`
        INSERT INTO Customer (
          id, name, email, phone, address, notes,
          totalSpent, isArchived, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        customerId,
        normalizedData.name,
        normalizedData.email,
        normalizedData.phone,
        normalizedData.address || null,
        normalizedData.notes || null,
        0,
        0,
        new Date().toISOString(),
        new Date().toISOString()
      ])
      
      const customer = db.queryOne('SELECT * FROM Customer WHERE id = ?', [customerId])
      
      return { success: true, customer }
    } catch (error: any) {
      console.error('Error creating customer:', error)
      
      if (error.message?.includes('UNIQUE constraint failed')) {
        return { success: false, message: 'A customer with this phone number already exists' }
      }
      
      return { success: false, message: error.message }
    }
  })

  /**
   * Update customer
   */
  ipcMain.handle('customers:update', async (_, { id, customerData }) => {
    try {
      // Normalize empty email to null
      const normalizedData = {
        ...customerData,
        email: customerData.email?.trim() || null
      }
      
      // Check if phone already exists (excluding current customer)
      if (normalizedData.phone) {
        const existingCustomer = db.queryOne(
          'SELECT * FROM Customer WHERE phone = ? AND id != ?',
          [normalizedData.phone, id]
        )
        
        if (existingCustomer) {
          return { 
            success: false, 
            message: 'A customer with this phone number already exists',
            existingCustomer 
          }
        }
      }
      
      // Update customer
      const sets: string[] = []
      const params: any[] = []
      
      if (normalizedData.name !== undefined) {
        sets.push('name = ?')
        params.push(normalizedData.name)
      }
      if (normalizedData.email !== undefined) {
        sets.push('email = ?')
        params.push(normalizedData.email)
      }
      if (normalizedData.phone !== undefined) {
        sets.push('phone = ?')
        params.push(normalizedData.phone)
      }
      if (normalizedData.address !== undefined) {
        sets.push('address = ?')
        params.push(normalizedData.address)
      }
      if (normalizedData.notes !== undefined) {
        sets.push('notes = ?')
        params.push(normalizedData.notes)
      }
      if (normalizedData.isArchived !== undefined) {
        sets.push('isArchived = ?')
        params.push(normalizedData.isArchived ? 1 : 0)
      }
      
      sets.push('updatedAt = ?')
      params.push(new Date().toISOString())
      params.push(id)
      
      if (sets.length > 0) {
        db.execute(
          `UPDATE Customer SET ${sets.join(', ')} WHERE id = ?`,
          params
        )
      }
      
      const customer = db.queryOne('SELECT * FROM Customer WHERE id = ?', [id])
      
      return { success: true, customer }
    } catch (error: any) {
      console.error('Error updating customer:', error)
      
      if (error.message?.includes('UNIQUE constraint failed')) {
        return { success: false, message: 'A customer with this phone number already exists' }
      }
      
      return { success: false, message: error.message }
    }
  })

  /**
   * Delete customer
   */
  ipcMain.handle('customers:delete', async (_, id) => {
    try {
      db.execute('DELETE FROM Customer WHERE id = ?', [id])
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Get customer purchase history
   */
  ipcMain.handle('customers:getPurchaseHistory', async (_, customerId) => {
    try {
      const transactions = db.query(`
        SELECT 
          st.*,
          e.name as employee_name
        FROM SaleTransaction st
        LEFT JOIN Employee e ON st.employeeId = e.id
        WHERE st.customerId = ?
        ORDER BY st.createdAt DESC
      `, [customerId])
      
      // Get items for each transaction
      for (const transaction of transactions) {
        const items = db.query(`
          SELECT 
            sti.*,
            p.name as product_name,
            pv.sku,
            pv.color,
            pv.size
          FROM SaleTransactionItem sti
          LEFT JOIN ProductVariant pv ON sti.productVariantId = pv.id
          LEFT JOIN Product p ON pv.productId = p.id
          WHERE sti.transactionId = ?
        `, [transaction.id])
        
        transaction.items = items
        
        // Transform employee
        if (transaction.employee_name) {
          transaction.employee = {
            name: transaction.employee_name
          }
        }
        delete transaction.employee_name
      }
      
      return transactions
    } catch (error) {
      console.error('Error fetching purchase history:', error)
      throw error
    }
  })

  /**
   * Get customer profile with stats
   */
  ipcMain.handle('customers:getProfile', async (_, customerId) => {
    try {
      const customer = db.queryOne(
        'SELECT * FROM Customer WHERE id = ?',
        [customerId]
      )
      
      if (!customer) return null
      
      // Get detailed stats
      const transactionStats = db.queryOne(`
        SELECT 
          COUNT(*) as totalTransactions,
          SUM(total) as totalSpent,
          AVG(total) as avgOrderValue,
          MAX(total) as largestOrder,
          MAX(createdAt) as lastPurchaseDate
        FROM SaleTransaction
        WHERE customerId = ? AND status = 'completed'
      `, [customerId])
      
      // Get recent transactions
      const recentTransactions = db.query(`
        SELECT * FROM SaleTransaction
        WHERE customerId = ?
        ORDER BY createdAt DESC
        LIMIT 5
      `, [customerId])
      
      // Get top products
      const topProducts = db.query(`
        SELECT 
          p.id,
          p.name,
          COUNT(sti.id) as purchaseCount,
          SUM(sti.quantity) as totalQuantity,
          SUM(sti.subtotal) as totalSpent
        FROM SaleTransactionItem sti
        INNER JOIN SaleTransaction st ON sti.transactionId = st.id
        INNER JOIN ProductVariant pv ON sti.productVariantId = pv.id
        INNER JOIN Product p ON pv.productId = p.id
        WHERE st.customerId = ? AND st.status = 'completed'
        GROUP BY p.id
        ORDER BY purchaseCount DESC
        LIMIT 5
      `, [customerId])
      
      // Get monthly spending for last 12 months
      const monthlySpending = db.query(`
        SELECT 
          strftime('%Y-%m', createdAt) as month,
          SUM(total) as amount,
          COUNT(*) as transactionCount
        FROM SaleTransaction
        WHERE customerId = ? AND status = 'completed'
          AND createdAt >= date('now', '-12 months')
        GROUP BY month
        ORDER BY month DESC
      `, [customerId])
      
      return {
        ...customer,
        stats: {
          totalTransactions: transactionStats?.totalTransactions || 0,
          totalSpent: transactionStats?.totalSpent || 0,
          avgOrderValue: transactionStats?.avgOrderValue || 0,
          largestOrder: transactionStats?.largestOrder || 0,
          lastPurchaseDate: transactionStats?.lastPurchaseDate || null
        },
        recentTransactions,
        topProducts,
        monthlySpending
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error)
      throw error
    }
  })

  /**
   * Recalculate customer total spent
   */
  ipcMain.handle('customers:recalculateTotalSpent', async (_, customerId) => {
    try {
      if (customerId) {
        recalculateCustomerTotalSpent(customerId)
      } else {
        // Recalculate for all customers
        const customers = db.query('SELECT id FROM Customer')
        for (const customer of customers) {
          recalculateCustomerTotalSpent(customer.id)
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error recalculating total spent:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /**
   * Export customers to Excel or CSV
   */
  ipcMain.handle('customers:export', async (_, { format, searchTerm = '' }) => {
    try {
      // Build WHERE clause
      const whereClauses: string[] = ['isArchived = 0']
      const params: any[] = []
      
      if (searchTerm) {
        whereClauses.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)')
        const searchPattern = `%${searchTerm}%`
        params.push(searchPattern, searchPattern, searchPattern)
      }

      const whereSQL = whereClauses.join(' AND ')

      // Get all customers
      const customers = db.query(`
        SELECT * FROM Customer
        WHERE ${whereSQL}
        ORDER BY createdAt DESC
      `, params)
      
      // Get transaction stats for each
      for (const customer of customers) {
        const stats = db.queryOne(`
          SELECT 
            COUNT(*) as purchaseCount,
            SUM(total) as totalSpent,
            MAX(createdAt) as lastPurchaseDate
          FROM SaleTransaction
          WHERE customerId = ? AND status = 'completed'
        `, [customer.id])
        
        customer.purchaseCount = stats?.purchaseCount || 0
        customer.totalSpent = stats?.totalSpent || 0
        customer.lastPurchaseDate = stats?.lastPurchaseDate || null
      }
      
      // Format data for export
      const exportData = customers.map((c: any) => ({
        'Customer ID': c.id,
        'Name': c.name,
        'Email': c.email || '',
        'Phone': c.phone,
        'Address': c.address || '',
        'Total Spent': c.totalSpent,
        'Purchase Count': c.purchaseCount,
        'Last Purchase': c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString() : '',
        'Created': new Date(c.createdAt).toLocaleDateString(),
        'Notes': c.notes || ''
      }))
      
      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Customers')
      
      // Auto-size columns
      const maxWidth = 50
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.min(
          Math.max(
            key.length,
            ...exportData.map(row => String(row[key] || '').length)
          ) + 2,
          maxWidth
        )
      }))
      ws['!cols'] = colWidths
      
      // Generate buffer
      const buffer = format === 'csv' 
        ? Buffer.from(XLSX.utils.sheet_to_csv(ws))
        : XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      
      return {
        success: true,
        data: buffer,
        filename: `customers_export_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`
      }
    } catch (error) {
      console.error('Error exporting customers:', error)
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })
}
