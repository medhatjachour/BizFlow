import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerInstallmentsHandlers() {
  ipcMain.handle('installments:create', async (_, data: any) => {
    try {
      const id = crypto.randomUUID()
      db.execute(
        'INSERT INTO Installment (id, customerId, saleId, amount, dueDate, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, data.customerId, data.saleId || null, data.amount, data.dueDate, 'PENDING', new Date().toISOString()]
      )
      return db.queryOne('SELECT * FROM Installment WHERE id = ?', [id])
    } catch (error) {
      console.error('Error creating installment:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:list', async () => {
    try {
      const query = `
        SELECT 
          i.*,
          c.name as customerName,
          st.id as saleTransactionId
        FROM Installment i
        JOIN Customer c ON i.customerId = c.id
        LEFT JOIN SaleTransaction st ON i.saleId = st.id
        ORDER BY i.dueDate ASC
      `
      return db.query(query)
    } catch (error) {
      console.error('Error listing installments:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:getByCustomer', async (_, customerId: string) => {
    try {
      const query = `
        SELECT 
          i.*,
          st.id as saleTransactionId,
          st.total as saleTotal
        FROM Installment i
        LEFT JOIN SaleTransaction st ON i.saleId = st.id
        WHERE i.customerId = ?
        ORDER BY i.dueDate ASC
      `
      return db.query(query, [customerId])
    } catch (error) {
      console.error('Error getting installments by customer:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:getBySale', async (_, saleId: string) => {
    try {
      return db.query('SELECT * FROM Installment WHERE saleId = ? ORDER BY dueDate ASC', [saleId])
    } catch (error) {
      console.error('Error getting installments by sale:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:getUpcomingReminders', async (_, days = 7) => {
    try {
      const query = `
        SELECT 
          i.*,
          c.name as customerName,
          c.phone as customerPhone,
          c.email as customerEmail
        FROM Installment i
        JOIN Customer c ON i.customerId = c.id
        WHERE i.status = 'PENDING'
          AND i.dueDate <= datetime('now', '+' || ? || ' days')
          AND i.dueDate >= datetime('now')
        ORDER BY i.dueDate ASC
      `
      return db.query(query, [days])
    } catch (error) {
      console.error('Error getting upcoming reminders:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:getOverdue', async () => {
    try {
      const query = `
        SELECT 
          i.*,
          c.name as customerName,
          c.phone as customerPhone
        FROM Installment i
        JOIN Customer c ON i.customerId = c.id
        WHERE i.status = 'PENDING'
          AND i.dueDate < datetime('now')
        ORDER BY i.dueDate ASC
      `
      return db.query(query)
    } catch (error) {
      console.error('Error getting overdue installments:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:markAsPaid', async (_, installmentId: string) => {
    try {
      db.execute(
        'UPDATE Installment SET status = ?, paidAt = ? WHERE id = ?',
        ['PAID', new Date().toISOString(), installmentId]
      )
      return db.queryOne('SELECT * FROM Installment WHERE id = ?', [installmentId])
    } catch (error) {
      console.error('Error marking installment as paid:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:markAsOverdue', async (_, installmentId: string) => {
    try {
      db.execute('UPDATE Installment SET status = ? WHERE id = ?', ['OVERDUE', installmentId])
      return db.queryOne('SELECT * FROM Installment WHERE id = ?', [installmentId])
    } catch (error) {
      console.error('Error marking installment as overdue:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:linkToSale', async (_, { installmentId, saleId }: any) => {
    try {
      db.execute('UPDATE Installment SET saleId = ? WHERE id = ?', [saleId, installmentId])
      return db.queryOne('SELECT * FROM Installment WHERE id = ?', [installmentId])
    } catch (error) {
      console.error('Error linking installment to sale:', error)
      throw error
    }
  })
  
  ipcMain.handle('installments:delete', async (_, installmentId: string) => {
    try {
      db.execute('DELETE FROM Installment WHERE id = ?', [installmentId])
      return { success: true }
    } catch (error) {
      console.error('Error deleting installment:', error)
      throw error
    }
  })
  
  ipcMain.handle('deposits:create', async (_, data: any) => {
    try {
      const id = crypto.randomUUID()
      db.execute(
        'INSERT INTO Deposit (id, customerId, saleId, amount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.customerId, data.saleId || null, data.amount, 'PENDING', new Date().toISOString()]
      )
      return db.queryOne('SELECT * FROM Deposit WHERE id = ?', [id])
    } catch (error) {
      console.error('Error creating deposit:', error)
      throw error
    }
  })
  
  ipcMain.handle('deposits:getByCustomer', async (_, customerId: string) => {
    try {
      return db.query('SELECT * FROM Deposit WHERE customerId = ? ORDER BY createdAt DESC', [customerId])
    } catch (error) {
      console.error('Error getting deposits by customer:', error)
      throw error
    }
  })
}
