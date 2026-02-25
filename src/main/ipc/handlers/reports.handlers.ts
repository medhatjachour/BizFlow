/**
 * Reports IPC Handlers
 * Handles report generation and data aggregation
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Reports')

export function registerReportsHandlers(prisma: any) {
  // Get Sales Report Data
  ipcMain.handle('reports:getSalesData', async (_, { startDate, endDate, filters }) => {
    try {
      if (!prisma) return { success: false, data: null }

      const whereClause: any = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }

      if (filters?.status) {
        whereClause.status = filters.status
      }

      if (filters?.userId) {
        whereClause.userId = filters.userId
      }

      // Get sale transactions with related data
      const saleTransactions = await prisma.saleTransaction.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          user: {
            select: {
              username: true,
              fullName: true
            }
          },
          customer: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Calculate statistics accounting for refunds
      const totalSales = saleTransactions.length
      let totalRevenue = 0
      let totalRefunded = 0
      let refundedTransactions = 0
      
      saleTransactions.forEach(sale => {
        // Calculate refunded amount for this sale
        const refundedAmount = sale.items.reduce((sum: number, item: any) => {
          const refunded = item.refundedQuantity || 0
          return sum + (refunded * item.price)
        }, 0)
        
        if (refundedAmount > 0 || sale.status === 'partially_refunded') {
          refundedTransactions++
          totalRefunded += refundedAmount
        }
        
        // Net revenue = total - refunded
        totalRevenue += (sale.total - refundedAmount)
      })
      
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0
      
      // Group by payment method
      const byPaymentMethod = saleTransactions.reduce((acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total
        return acc
      }, {} as Record<string, number>)

      // Group by category and calculate top products (excluding refunded items)
      const byCategory: Record<string, number> = {}
      const productSales: Record<string, any> = {}
      
      saleTransactions.forEach(transaction => {
        transaction.items.forEach((item: any) => {
          const category = item.product?.category?.name || 'Uncategorized'
          
          // Calculate active quantities and revenue
          const refundedQty = item.refundedQuantity || 0
          const activeQty = item.quantity - refundedQty
          const refundedRevenue = refundedQty * item.price
          const activeRevenue = item.total - refundedRevenue
          
          byCategory[category] = (byCategory[category] || 0) + activeRevenue
          
          const productName = item.product?.name || 'Unknown'
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 }
          }
          productSales[productName].quantity += activeQty
          productSales[productName].revenue += activeRevenue
        })
      })

      const topProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10)

      // Daily breakdown accounting for refunds
      const dailySales = saleTransactions.reduce((acc, transaction) => {
        const date = new Date(transaction.createdAt).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { date, sales: 0, revenue: 0, orders: 0, refunded: 0 }
        }
        
        // Calculate refunded amount for this transaction
        const refundedAmount = transaction.items.reduce((sum: number, item: any) => {
          const refunded = item.refundedQuantity || 0
          return sum + (refunded * item.price)
        }, 0)
        
        const netRevenue = transaction.total - refundedAmount
        const activeItems = transaction.items.reduce((sum: number, item: any) => {
          const refunded = item.refundedQuantity || 0
          return sum + (item.quantity - refunded)
        }, 0)
        
        acc[date].orders += 1
        acc[date].revenue += netRevenue
        acc[date].sales += activeItems
        acc[date].refunded += refundedAmount
        return acc
      }, {} as Record<string, any>)

      return {
        success: true,
        data: {
          summary: {
            totalSales,
            totalRevenue,
            averageOrderValue,
            totalRefunded,
            refundedTransactions,
            refundRate: totalSales > 0 ? (refundedTransactions / totalSales) * 100 : 0,
            dateRange: { startDate, endDate }
          },
          saleTransactions,
          byPaymentMethod,
          byCategory,
          topProducts,
          dailyBreakdown: Object.values(dailySales).sort((a: any, b: any) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )
        }
      }
    } catch (error) {
      log.error('[Reports] Error generating sales report:', error)
      return { success: false, error: 'Failed to generate sales report' }
    }
  })

  // Get Inventory Report Data
  ipcMain.handle('reports:getInventoryData', async () => {
    try {
      if (!prisma) return { success: false, data: null }

      const products = await prisma.product.findMany({
        where: {
          isArchived: false // Filter out archived products
        },
        include: {
          category: true,
          variants: true,
          images: {
            take: 1,
            orderBy: { order: 'asc' }
          }
        }
      })

      // Calculate total inventory value
      let totalValue = 0
      let totalItems = 0
      let lowStockCount = 0
      let outOfStockCount = 0

      const inventoryData = products.map(product => {
        if (product.hasVariants && product.variants.length > 0) {
          const variantStock = product.variants.reduce((sum, v) => sum + v.stock, 0)
          const variantValue = product.variants.reduce((sum, v) => sum + (v.price * v.stock), 0)
          totalValue += variantValue
          totalItems += variantStock

          const hasLowStock = product.variants.some(v => v.stock < 10 && v.stock > 0)
          const hasOutOfStock = product.variants.some(v => v.stock === 0)
          
          if (hasLowStock) lowStockCount++
          if (hasOutOfStock) outOfStockCount++

          return {
            id: product.id,
            name: product.name,
            sku: product.baseSKU,
            category: product.category?.name || 'Uncategorized',
            stock: variantStock,
            value: variantValue,
            status: hasOutOfStock ? 'Out of Stock' : hasLowStock ? 'Low Stock' : 'In Stock',
            hasVariants: true,
            variants: product.variants.map(v => ({
              sku: v.sku,
              color: v.color,
              size: v.size,
              stock: v.stock,
              price: v.price
            }))
          }
        } else {
          // Calculate from variants if exists, otherwise use base data
          const stock = product.variants[0]?.stock || 0
          const value = stock * product.basePrice
          totalValue += value
          totalItems += stock

          if (stock === 0) outOfStockCount++
          else if (stock < 10) lowStockCount++

          return {
            id: product.id,
            name: product.name,
            sku: product.baseSKU,
            category: product.category?.name || 'Uncategorized',
            stock,
            value,
            status: stock === 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'In Stock',
            hasVariants: false
          }
        }
      })

      // Group by category
      const byCategory = inventoryData.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { count: 0, value: 0, stock: 0 }
        }
        acc[item.category].count += 1
        acc[item.category].value += item.value
        acc[item.category].stock += item.stock
        return acc
      }, {} as Record<string, any>)

      return {
        success: true,
        data: {
          summary: {
            totalProducts: products.length,
            totalItems,
            totalValue,
            lowStockCount,
            outOfStockCount,
            categories: Object.keys(byCategory).length
          },
          inventory: inventoryData,
          byCategory,
          lowStockItems: inventoryData.filter(item => item.status === 'Low Stock'),
          outOfStockItems: inventoryData.filter(item => item.status === 'Out of Stock')
        }
      }
    } catch (error) {
      log.error('[Reports] Error generating inventory report:', error)
      return { success: false, error: 'Failed to generate inventory report' }
    }
  })

  // Get Financial Report Data
  ipcMain.handle('reports:getFinancialData', async (_, { startDate, endDate }) => {
    try {
      if (!prisma) return { success: false, data: null }

      // Get sales revenue from SaleTransaction (new model) - include partially refunded
      const saleTransactions = await prisma.saleTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          status: { in: ['completed', 'partially_refunded'] }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Calculate revenue and COGS accounting for refunds
      let totalRevenue = 0
      let totalCOGS = 0
      let totalRefunded = 0
      
      saleTransactions.forEach(sale => {
        const refundedAmount = sale.items.reduce((sum, item) => {
          const refunded = item.refundedQuantity || 0
          return sum + (refunded * item.price)
        }, 0)
        
        totalRefunded += refundedAmount
        totalRevenue += (sale.total - refundedAmount)
        
        // Calculate COGS for non-refunded items
        sale.items.forEach(item => {
          const refundedQty = item.refundedQuantity || 0
          const netQty = item.quantity - refundedQty
          if (netQty > 0 && item.product?.baseCost) {
            totalCOGS += netQty * item.product.baseCost
          }
        })
      })

      // Get financial transactions (expenses)
      const transactions = await prisma.financialTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: {
          user: {
            select: {
              username: true,
              fullName: true
            }
          }
        }
      })

      // Get active employees and calculate salary expenses
      const employees = await prisma.employee.findMany({
        where: {
          createdAt: {
            lte: new Date(endDate)
          }
        }
      })

      const totalSalaryExpense = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0)

      // Calculate daily/weekly/monthly salary expenses based on date range
      const startTime = new Date(startDate).getTime()
      const endTime = new Date(endDate).getTime()
      const daysInRange = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24))
      
      let salaryExpenseForPeriod = 0
      if (daysInRange <= 1) {
        // Daily: divide monthly salary by ~30 days
        salaryExpenseForPeriod = totalSalaryExpense / 30
      } else if (daysInRange <= 7) {
        // Weekly: divide monthly by 4.33 weeks
        salaryExpenseForPeriod = totalSalaryExpense / 4.33
      } else {
        // Monthly or longer: use full monthly salary * number of months
        const monthsInRange = daysInRange / 30
        salaryExpenseForPeriod = totalSalaryExpense * monthsInRange
      }

      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expensesFromTransactions = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const totalExpenses = expensesFromTransactions + salaryExpenseForPeriod + totalCOGS
      const netProfit = totalRevenue + income - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      // Daily breakdown accounting for refunds
      const dailyFinancials = saleTransactions.reduce((acc, sale) => {
        const date = new Date(sale.createdAt).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, expenses: 0, cogs: 0, profit: 0, refunded: 0 }
        }
        
        // Calculate net revenue and COGS for this sale
        const refundedAmount = sale.items.reduce((sum, item) => {
          const refunded = item.refundedQuantity || 0
          return sum + (refunded * item.price)
        }, 0)
        
        const netRevenue = sale.total - refundedAmount
        acc[date].revenue += netRevenue
        acc[date].refunded += refundedAmount
        
        // Calculate COGS for non-refunded items
        let saleCOGS = 0
        sale.items.forEach(item => {
          const refundedQty = item.refundedQuantity || 0
          const netQty = item.quantity - refundedQty
          if (netQty > 0 && item.product?.baseCost) {
            saleCOGS += netQty * item.product.baseCost
          }
        })
        acc[date].cogs += saleCOGS
        
        return acc
      }, {} as Record<string, any>)

      // Add expenses to daily breakdown
      transactions.forEach(transaction => {
        const date = new Date(transaction.createdAt).toISOString().split('T')[0]
        if (dailyFinancials[date]) {
          if (transaction.type === 'expense') {
            dailyFinancials[date].expenses += transaction.amount
          } else {
            dailyFinancials[date].revenue += transaction.amount
          }
          // Include COGS in daily expenses
          dailyFinancials[date].expenses += dailyFinancials[date].cogs
          dailyFinancials[date].profit = dailyFinancials[date].revenue - dailyFinancials[date].expenses
        }
      })

      // Add daily salary expense proportionally
      const dailySalaryExpense = salaryExpenseForPeriod / Math.max(1, Object.keys(dailyFinancials).length)
      Object.keys(dailyFinancials).forEach(date => {
        dailyFinancials[date].expenses += dailySalaryExpense
        dailyFinancials[date].salaryExpense = dailySalaryExpense
        dailyFinancials[date].netProfit = dailyFinancials[date].revenue - dailyFinancials[date].expenses
      })

      // Expense breakdown by category (add salary as a category)
      const expensesByDescription = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.description] = (acc[t.description] || 0) + t.amount
          return acc
        }, {} as Record<string, number>)
      
      // Add salary expense as a category
      expensesByDescription['Employee Salaries'] = salaryExpenseForPeriod
      
      // Add COGS as a category
      expensesByDescription['Cost of Goods Sold'] = totalCOGS

      return {
        success: true,
        data: {
          summary: {
            totalRevenue: totalRevenue + income,
            totalCOGS,
            totalExpenses: totalExpenses,
            salaryExpense: salaryExpenseForPeriod,
            otherExpenses: expensesFromTransactions,
            totalRefunded,
            netProfit,
            profitMargin,
            salesCount: saleTransactions.length,
            employeeCount: employees.length,
            dateRange: { startDate, endDate }
          },
          transactions,
          dailyBreakdown: Object.values(dailyFinancials).sort((a: any, b: any) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
          expensesByCategory: expensesByDescription
        }
      }
    } catch (error) {
      log.error('[Reports] Error generating financial report:', error)
      return { success: false, error: 'Failed to generate financial report' }
    }
  })

  // Get Customer Report Data
  ipcMain.handle('reports:getCustomerData', async (_, { startDate, endDate }) => {
    try {
      if (!prisma) return { success: false, data: null }

      const customers = await prisma.customer.findMany({
        where: {
          isArchived: false // Filter out archived customers
        },
        orderBy: {
          totalSpent: 'desc'
        }
      })

      const totalCustomers = customers.length
      const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0)
      const averageSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0

      // Group by loyalty tier
      const byLoyaltyTier = customers.reduce((acc, customer) => {
        acc[customer.loyaltyTier] = (acc[customer.loyaltyTier] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Get new customers in date range
      const newCustomers = customers.filter(c => {
        const created = new Date(c.createdAt)
        return created >= new Date(startDate) && created <= new Date(endDate)
      })

      // Get order counts for top customers
      const customerOrderCounts: Record<string, number> = {}
      const allTransactions = await prisma.saleTransaction.findMany({
        where: {
          customerId: { not: null }
        },
        select: {
          customerId: true
        }
      })
      
      allTransactions.forEach(t => {
        if (t.customerId) {
          customerOrderCounts[t.customerId] = (customerOrderCounts[t.customerId] || 0) + 1
        }
      })

      // Top customers
      const topCustomers = customers.slice(0, 10).map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalSpent: c.totalSpent,
        loyaltyTier: c.loyaltyTier,
        orderCount: customerOrderCounts[c.id] || 0
      }))

      return {
        success: true,
        data: {
          summary: {
            totalCustomers,
            newCustomers: newCustomers.length,
            totalSpent,
            averageSpent,
            dateRange: { startDate, endDate }
          },
          customers,
          topCustomers,
          byLoyaltyTier
        }
      }
    } catch (error) {
      log.error('[Reports] Error generating customer report:', error)
      return { success: false, error: 'Failed to generate customer report' }
    }
  })

  // Get Quick Insights
  ipcMain.handle('reports:getQuickInsights', async () => {
    try {
      if (!prisma) return { success: false, data: null }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Today's sales from SaleTransaction
      const todaySales = await prisma.saleTransaction.findMany({
        where: {
          createdAt: {
            gte: today
          },
          status: 'completed'
        }
      })

      const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0)
      const todayOrders = todaySales.length

      // Low stock items
      const products = await prisma.product.findMany({
        where: {
          isArchived: false // Filter out archived products
        },
        include: {
          variants: true
        }
      })

      let lowStockCount = 0
      products.forEach(product => {
        if (product.hasVariants) {
          const hasLowStock = product.variants.some(v => v.stock < 10 && v.stock > 0)
          if (hasLowStock) lowStockCount++
        }
      })

      // New customers this month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const newCustomers = await prisma.customer.count({
        where: {
          createdAt: {
            gte: startOfMonth
          }
        }
      })

      return {
        success: true,
        data: {
          todayRevenue,
          todayOrders,
          lowStockItems: lowStockCount,
          newCustomers
        }
      }
    } catch (error) {
      log.error('[Reports] Error getting quick insights:', error)
      return { success: false, error: 'Failed to get quick insights' }
    }
  })
}
