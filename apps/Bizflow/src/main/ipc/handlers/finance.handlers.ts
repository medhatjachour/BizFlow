/**
 * Finance IPC Handlers
 * Handles financial transactions and reports
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Finance')

export function registerFinanceHandlers(prisma: any) {
  ipcMain.handle('finance:addTransaction', async (_, { type, amount, description, userId }) => {
    try {
      if (prisma) {
        const transaction = await prisma.financialTransaction.create({ 
          data: { type, amount, description, userId } 
        })
        return { success: true, transaction }
      }
      return { success: true, transaction: { id: 't_mock', type, amount, description, userId } }
    } catch (error) {
      log.error('Error adding transaction:', error)
      throw error
    }
  })

  ipcMain.handle('finance:getTransactions', async (_, { startDate, endDate }) => {
    try {
      if (prisma) {
        const transactions = await prisma.financialTransaction.findMany({ 
          where: { 
            createdAt: { 
              gte: new Date(startDate), 
              lte: new Date(endDate) 
            } 
          }, 
          orderBy: { createdAt: 'desc' }, 
          include: { user: { select: { username: true } } } 
        })
        return transactions
      }
      return []
    } catch (error) {
      log.error('Error fetching transactions:', error)
      throw error
    }
  })

  ipcMain.handle('finance:getStats', async () => {
    try {
      if (prisma) {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const monthlyTransactions = await prisma.financialTransaction.findMany({
          where: { createdAt: { gte: startOfMonth } }
        })
        
        const income = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const expenses = monthlyTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
        
        return {
          totalIncome: income,
          totalExpenses: expenses,
          netProfit: income - expenses,
          transactionCount: monthlyTransactions.length
        }
      }
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        transactionCount: 0
      }
    } catch (error) {
      log.error('Error fetching finance stats:', error)
      throw error
    }
  })

  ipcMain.handle('finance:updateTransaction', async (_, { id, data }) => {
    try {
      if (prisma) {
        const transaction = await prisma.financialTransaction.update({
          where: { id },
          data: {
            amount: data.amount,
            description: data.description,
            type: data.type
          }
        })
        return { success: true, transaction }
      }
      return { success: true, transaction: { id, ...data } }
    } catch (error) {
      log.error('Error updating transaction:', error)
      throw error
    }
  })

  ipcMain.handle('finance:deleteTransaction', async (_, id) => {
    try {
      if (prisma) {
        await prisma.financialTransaction.delete({
          where: { id }
        })
        return { success: true }
      }
      return { success: true }
    } catch (error) {
      log.error('Error deleting transaction:', error)
      throw error
    }
  })
}
