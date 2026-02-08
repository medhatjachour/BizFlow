/**
 * Employees IPC Handlers - better-sqlite3 Version
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerEmployeesHandlers() {
  ipcMain.handle('employees:getAll', async () => {
    try {
      return db.query('SELECT * FROM Employee ORDER BY createdAt DESC')
    } catch (error) {
      console.error('Error fetching employees:', error)
      throw error
    }
  })

  ipcMain.handle('employees:create', async (_, employeeData) => {
    try {
      const employeeId = employeeData.id || `emp_${Date.now()}`
      
      db.execute(`
        INSERT INTO Employee (id, name, email, phone, position, salary, hireDate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId,
        employeeData.name,
        employeeData.email || null,
        employeeData.phone || null,
        employeeData.position || null,
        employeeData.salary || null,
        employeeData.hireDate || null,
        new Date().toISOString(),
        new Date().toISOString()
      ])
      
      const employee = db.queryOne('SELECT * FROM Employee WHERE id = ?', [employeeId])
      return { success: true, employee }
    } catch (error: any) {
      console.error('Error creating employee:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:update', async (_, { id, employeeData }) => {
    try {
      const sets: string[] = []
      const params: any[] = []
      
      Object.keys(employeeData).forEach(key => {
        sets.push(`${key} = ?`)
        params.push(employeeData[key])
      })
      
      sets.push('updatedAt = ?')
      params.push(new Date().toISOString())
      params.push(id)
      
      if (sets.length > 0) {
        db.execute(`UPDATE Employee SET ${sets.join(', ')} WHERE id = ?`, params)
      }
      
      const employee = db.queryOne('SELECT * FROM Employee WHERE id = ?', [id])
      return { success: true, employee }
    } catch (error: any) {
      console.error('Error updating employee:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:delete', async (_, id) => {
    try {
      db.execute('DELETE FROM Employee WHERE id = ?', [id])
      return { success: true }
    } catch (error: any) {
      console.error('Error deleting employee:', error)
      return { success: false, message: error.message }
    }
  })
}
