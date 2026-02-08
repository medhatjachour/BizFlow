/**
 * Finance IPC Handlers
 * Handles financial transactions and reports
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerFinanceHandlers() {
  ipcMain.handle('finance:addTransaction', async (_, { type, amount, description, userId }) => {
    console.warn('finance:addTransaction not yet converted to better-sqlite3')
    return { success: false, error: 'Not yet implemented' }
  })

  ipcMain.handle('finance:getTransactions', async (_, { startDate, endDate }) => {
    console.warn('finance:getTransactions not yet converted to better-sqlite3')
    return []
  })

  ipcMain.handle('finance:getStats', async () => {
    console.warn('finance:getStats not yet converted to better-sqlite3')
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netProfit: 0,
      transactionCount: 0
    }
  })

  ipcMain.handle('finance:updateTransaction', async (_, { id, data }) => {
    console.warn('finance:updateTransaction not yet converted to better-sqlite3')
    return { success: false, error: 'Not yet implemented' }
  })

  ipcMain.handle('finance:deleteTransaction', async (_, id) => {
    console.warn('finance:deleteTransaction not yet converted to better-sqlite3')
    return { success: false, error: 'Not yet implemented' }
  })
}
