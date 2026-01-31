/**
 * Customers IPC Handlers
 * Handles customer management
 */

import { ipcMain } from 'electron'
import * as XLSX from 'xlsx'

export function registerCustomersHandlers(prisma: any) {
  // Helper function to recalculate customer totalSpent from transactions
  async function recalculateCustomerTotalSpent(customerId: string) {
    if (!prisma) return
    
    try {
      const result = await prisma.saleTransaction.aggregate({
        where: {
          customerId: customerId,
          status: 'completed' // Only count completed transactions
        },
        _sum: {
          total: true
        }
      })
      
      const totalSpent = result._sum.total || 0
      
      await prisma.customer.update({
        where: { id: customerId },
        data: { totalSpent }
      })
      
    } catch (error) {
      console.error('Error recalculating customer totalSpent:', error)
    }
  }

  ipcMain.handle('customers:getAll', async (_, options = {}) => {
    try {
      if (prisma) {
        const {
          limit = 100,
          offset = 0,
          searchTerm = ''
        } = options

        // Build where clause for search
        const where: any = {
          isArchived: false // Always exclude archived customers
        }
        if (searchTerm) {
          where.OR = [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } },
            { phone: { contains: searchTerm } }
          ]
        }

        // Get customers with pagination
        const [customers, totalCount] = await Promise.all([
          prisma.customer.findMany({ 
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
              saleTransactions: {
                where: { status: 'completed' },
                select: {
                  id: true,
                  total: true,
                  createdAt: true
                }
              }
            }
          }),
          prisma.customer.count({ where })
        ])
        
        // Recalculate totalSpent for each customer from transactions
        const customersWithRealStats = customers.map((customer: any) => {
          const realTotalSpent = customer.saleTransactions.reduce(
            (sum: number, t: any) => sum + t.total, 
            0
          )
          const purchaseCount = customer.saleTransactions.length
          
          return {
            ...customer,
            totalSpent: realTotalSpent,
            purchaseCount,
            saleTransactions: undefined // Remove from response to reduce payload
          }
        })
        
        return {
          customers: customersWithRealStats,
          totalCount,
          hasMore: offset + limit < totalCount
        }
      }
      return { customers: [], totalCount: 0, hasMore: false }
    } catch (error) {
      console.error('Error fetching customers:', error)
      throw error
    }
  })

  ipcMain.handle('customers:create', async (_, customerData) => {
    try {
      if (prisma) {
        // Normalize empty email to null to avoid unique constraint issues
        const normalizedData = {
          ...customerData,
          email: customerData.email?.trim() || null
        }
        
        // Check if phone already exists
        const existingCustomer = await prisma.customer.findUnique({
          where: { phone: normalizedData.phone }
        })
        
        if (existingCustomer) {
          return { 
            success: false, 
            message: 'A customer with this phone number already exists',
            existingCustomer 
          }
        }
        
        const customer = await prisma.customer.create({ data: normalizedData })
        return { success: true, customer }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      console.error('Error creating customer:', error)
      if (error.code === 'P2002') {
        return { success: false, message: 'A customer with this phone number already exists' }
      }
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('customers:update', async (_, { id, customerData }) => {
    try {
      if (prisma) {
        // Normalize empty email to null to avoid unique constraint issues
        const normalizedData = {
          ...customerData,
          email: customerData.email?.trim() || null
        }
        
        // Check if phone already exists (excluding current customer)
        if (normalizedData.phone) {
          const existingCustomer = await prisma.customer.findUnique({
            where: { phone: normalizedData.phone }
          })
          
          if (existingCustomer && existingCustomer.id !== id) {
            return { 
              success: false, 
              message: 'A customer with this phone number already exists',
              existingCustomer 
            }
          }
        }
        
        const customer = await prisma.customer.update({ where: { id }, data: normalizedData })
        return { success: true, customer }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      console.error('Error updating customer:', error)
      if (error.code === 'P2002') {
        return { success: false, message: 'A customer with this phone number already exists' }
      }
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('customers:delete', async (_, id) => {
    try {
      if (prisma) {
        await prisma.customer.delete({ where: { id } })
        return { success: true }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      return { success: false, message: error.message }
    }
  })

  // Get customer purchase history
  ipcMain.handle('customers:getPurchaseHistory', async (_, customerId) => {
    try {
      if (prisma) {
        const transactions = await prisma.saleTransaction.findMany({
          where: { customerId },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    baseSKU: true
                  }
                }
              }
            },
            deposits: true,
            installments: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50 // Last 50 transactions
        })
        return transactions
      }
      return []
    } catch (error) {
      console.error('Error fetching purchase history:', error)
      throw error
    }
  })

  // Get comprehensive customer profile data
  ipcMain.handle('customers:getProfile', async (_, customerId) => {
    try {
      if (!prisma) return null

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          saleTransactions: {
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      baseSKU: true,
                      category: { select: { name: true } }
                    }
                  }
                }
              },
              user: {
                select: {
                  username: true,
                  fullName: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          deposits: {
            orderBy: { date: 'desc' }
          },
          installments: {
            orderBy: { dueDate: 'asc' },
            include: {
              sale: {
                select: {
                  id: true,
                  total: true,
                  createdAt: true
                }
              }
            }
          }
        }
      })

      if (!customer) return null

      // Calculate statistics
      const completedTransactions = customer.saleTransactions.filter((t: any) => t.status === 'completed')
      const partiallyRefundedTransactions = customer.saleTransactions.filter((t: any) => t.status === 'partially_refunded')
      
      const totalSpent = completedTransactions.reduce((sum: number, t: any) => sum + t.total, 0) +
        partiallyRefundedTransactions.reduce((sum: number, tx: any) => {
          const refundedAmount = tx.items.reduce((itemSum: number, item: any) => {
            const refunded = item.refundedQuantity || 0
            return itemSum + (refunded * (item.finalPrice || item.price))
          }, 0)
          return sum + (tx.total - refundedAmount)
        }, 0)

      const totalPurchases = customer.saleTransactions.length
      const averagePurchase = totalPurchases > 0 ? totalSpent / totalPurchases : 0

      // Calculate total items purchased
      const totalItems = customer.saleTransactions.reduce((sum: number, t: any) => {
        return sum + t.items.reduce((itemSum: number, item: any) => {
          return itemSum + (item.quantity - (item.refundedQuantity || 0))
        }, 0)
      }, 0)

      // Find most purchased products
      const productPurchases: Record<string, { name: string; count: number; spent: number }> = {}
      customer.saleTransactions.forEach((t: any) => {
        t.items.forEach((item: any) => {
          const productName = item.product?.name || 'Unknown'
          if (!productPurchases[productName]) {
            productPurchases[productName] = { name: productName, count: 0, spent: 0 }
          }
          const quantity = item.quantity - (item.refundedQuantity || 0)
          productPurchases[productName].count += quantity
          productPurchases[productName].spent += (item.finalPrice || item.price) * quantity
        })
      })
      const topProducts = Object.values(productPurchases)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5)

      // Calculate category preferences
      const categorySpending: Record<string, number> = {}
      customer.saleTransactions.forEach((t: any) => {
        t.items.forEach((item: any) => {
          const category = item.product?.category?.name || 'Uncategorized'
          const quantity = item.quantity - (item.refundedQuantity || 0)
          const amount = (item.finalPrice || item.price) * quantity
          categorySpending[category] = (categorySpending[category] || 0) + amount
        })
      })

      // Calculate installment statistics
      const totalInstallments = customer.installments.length
      const paidInstallments = customer.installments.filter((i: any) => i.status === 'paid').length
      const pendingInstallments = customer.installments.filter((i: any) => i.status === 'pending').length
      const overdueInstallments = customer.installments.filter((i: any) => i.status === 'overdue').length
      const totalInstallmentAmount = customer.installments.reduce((sum: number, i: any) => sum + i.amount, 0)
      const paidInstallmentAmount = customer.installments
        .filter((i: any) => i.status === 'paid')
        .reduce((sum: number, i: any) => sum + i.amount, 0)
      const remainingInstallmentAmount = totalInstallmentAmount - paidInstallmentAmount

      // Calculate deposit statistics
      const totalDeposits = customer.deposits.reduce((sum: number, d: any) => sum + d.amount, 0)

      // Find first and last purchase dates
      const firstPurchase = customer.saleTransactions.length > 0 
        ? customer.saleTransactions[customer.saleTransactions.length - 1].createdAt 
        : null
      const lastPurchase = customer.saleTransactions.length > 0 
        ? customer.saleTransactions[0].createdAt 
        : null

      // Calculate purchase frequency (purchases per month)
      let purchaseFrequency = 0
      if (firstPurchase && totalPurchases > 1) {
        const daysSinceFirst = (Date.now() - new Date(firstPurchase).getTime()) / (1000 * 60 * 60 * 24)
        const monthsSinceFirst = daysSinceFirst / 30
        purchaseFrequency = monthsSinceFirst > 0 ? totalPurchases / monthsSinceFirst : 0
      }

      return {
        ...customer,
        statistics: {
          totalSpent,
          totalPurchases,
          averagePurchase,
          totalItems,
          totalDeposits,
          firstPurchase,
          lastPurchase,
          purchaseFrequency,
          installments: {
            total: totalInstallments,
            paid: paidInstallments,
            pending: pendingInstallments,
            overdue: overdueInstallments,
            totalAmount: totalInstallmentAmount,
            paidAmount: paidInstallmentAmount,
            remainingAmount: remainingInstallmentAmount
          }
        },
        topProducts,
        categorySpending
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error)
      throw error
    }
  })

  // Recalculate totalSpent for a customer (called when transactions change)
  ipcMain.handle('customers:recalculateTotalSpent', async (_, customerId) => {
    try {
      await recalculateCustomerTotalSpent(customerId)
      return { success: true }
    } catch (error: any) {
      console.error('Error recalculating totalSpent:', error)
      return { success: false, message: error.message }
    }
  })

  // Helper function to sanitize vCard field values per RFC 2426
  function sanitizeVCardField(value: string): string {
    if (!value) return ''
    return value
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '')      // Remove carriage returns
      .replace(/,/g, '\\,')    // Escape commas
      .replace(/;/g, '\\;')    // Escape semicolons
  }

  // Export customers in different formats
  ipcMain.handle('customers:export', async (_, { format, searchTerm = '' }) => {
    try {
      if (!prisma) return { success: false, message: 'Database not available' }

      // Build where clause for search (same as getAll)
      const where: any = {
        isArchived: false
      }
      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { phone: { contains: searchTerm } }
        ]
      }

      // Fetch customers with limit to prevent memory issues
      const MAX_EXPORT_LIMIT = 10000
      const customerCount = await prisma.customer.count({ where })
      
      if (customerCount > MAX_EXPORT_LIMIT) {
        return { 
          success: false, 
          message: `Export limited to ${MAX_EXPORT_LIMIT} customers. Found ${customerCount}. Please use search to filter.` 
        }
      }

      // Fetch all customers matching the filter (with limit)
      const customers = await prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        take: MAX_EXPORT_LIMIT,
        include: {
          saleTransactions: {
            where: { 
              OR: [
                { status: 'completed' },
                { status: 'partially_refunded' }
              ]
            },
            select: { 
              status: true,
              total: true,
              items: {
                select: {
                  price: true,
                  finalPrice: true,
                  refundedQuantity: true
                }
              }
            }
          }
        }
      })

      // Recalculate totalSpent including partially refunded transactions
      const customersWithStats = customers.map((customer: any) => {
        // Calculate completed transactions total
        const completedTotal = customer.saleTransactions
          .filter((t: any) => t.status === 'completed')
          .reduce((sum: number, t: any) => sum + t.total, 0)
        
        // Calculate net amount for partially refunded transactions
        const partiallyRefundedTotal = customer.saleTransactions
          .filter((t: any) => t.status === 'partially_refunded')
          .reduce((sum: number, tx: any) => {
            const refundedAmount = tx.items.reduce((itemSum: number, item: any) => {
              const refunded = item.refundedQuantity || 0
              return itemSum + (refunded * (item.finalPrice || item.price))
            }, 0)
            return sum + (tx.total - refundedAmount)
          }, 0)
        
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone,
          loyaltyTier: customer.loyaltyTier,
          totalSpent: completedTotal + partiallyRefundedTotal,
          createdAt: customer.createdAt
        }
      })

      const timestamp = new Date().toISOString().split('T')[0]

      if (format === 'excel') {
        // Create Excel workbook
        const ws = XLSX.utils.json_to_sheet(customersWithStats.map(c => ({
          'Name': c.name,
          'Email': c.email,
          'Phone': c.phone,
          'Loyalty Tier': c.loyaltyTier,
          'Total Spent': c.totalSpent,
          'Member Since': new Date(c.createdAt).toLocaleDateString()
        })))
        
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Customers')
        
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
        
        return {
          success: true,
          data: excelBuffer,
          filename: `customers-${timestamp}.xlsx`,
          count: customersWithStats.length
        }
      } else if (format === 'csv') {
        // Create CSV
        const ws = XLSX.utils.json_to_sheet(customersWithStats.map(c => ({
          'Name': c.name,
          'Email': c.email,
          'Phone': c.phone,
          'Loyalty Tier': c.loyaltyTier,
          'Total Spent': c.totalSpent,
          'Member Since': new Date(c.createdAt).toLocaleDateString()
        })))
        
        const csv = XLSX.utils.sheet_to_csv(ws)
        
        return {
          success: true,
          data: Buffer.from(csv),
          filename: `customers-${timestamp}.csv`,
          count: customersWithStats.length
        }
      } else if (format === 'vcf') {
        // Create vCard format (VCF) - compatible with iOS and Android
        const vcards = customersWithStats.map(c => {
          const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${sanitizeVCardField(c.name)}`,
            `TEL;TYPE=CELL:${sanitizeVCardField(c.phone)}`,
            c.email ? `EMAIL:${sanitizeVCardField(c.email)}` : '',
            `NOTE:${sanitizeVCardField(`Loyalty Tier: ${c.loyaltyTier} | Total Spent: $${c.totalSpent.toFixed(2)}`)}`,
            'END:VCARD'
          ].filter(line => line).join('\r\n')
          return vcard
        }).join('\r\n')

        return {
          success: true,
          data: Buffer.from(vcards),
          filename: `customers-${timestamp}.vcf`,
          count: customersWithStats.length
        }
      } else {
        return { success: false, message: 'Invalid export format' }
      }
    } catch (error: any) {
      console.error('Error exporting customers:', error)
      return { success: false, message: error.message }
    }
  })
}
