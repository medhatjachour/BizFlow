/**
 * Employees IPC Handlers
 * Handles employee management
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Employees')

export function registerEmployeesHandlers(prisma: any) {
  ipcMain.handle('employees:getAll', async () => {
    try {
      if (prisma) {
        return await prisma.employee.findMany({ orderBy: { createdAt: 'desc' } })
      }
      return []
    } catch (error) {
      log.error('Error fetching employees:', error)
      throw error
    }
  })

  ipcMain.handle('employees:create', async (_, employeeData) => {
    try {
      if (prisma) {
        const employee = await prisma.employee.create({ data: employeeData })
        return { success: true, employee }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      log.error('Error creating employee:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:update', async (_, { id, employeeData }) => {
    try {
      if (prisma) {
        const employee = await prisma.employee.update({ where: { id }, data: employeeData })
        return { success: true, employee }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      log.error('Error updating employee:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('employees:delete', async (_, id) => {
    try {
      if (prisma) {
        await prisma.employee.delete({ where: { id } })
        return { success: true }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      log.error('Error deleting employee:', error)
      return { success: false, message: error.message }
    }
  })
}
