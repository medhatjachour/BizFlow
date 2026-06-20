/**
 * Stores IPC Handlers
 * Handles store management (multi-store support)
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Stores')

export function registerStoresHandlers(prisma: any) {
  ipcMain.handle('stores:getAll', async () => {
    try {
      if (prisma) {
        return await prisma.store.findMany({ orderBy: { createdAt: 'desc' } })
      }
      return []
    } catch (error) {
      log.error('Error fetching stores:', error)
      throw error
    }
  })

  ipcMain.handle('stores:create', async (_, storeData) => {
    try {
      if (prisma) {
        const store = await prisma.store.create({ data: storeData })
        return { success: true, store }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      log.error('Error creating store:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('stores:update', async (_, { id, storeData }) => {
    try {
      if (prisma) {
        const store = await prisma.store.update({ where: { id }, data: storeData })
        return { success: true, store }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      log.error('Error updating store:', error)
      return { success: false, message: error.message }
    }
  })

  ipcMain.handle('stores:delete', async (_, id) => {
    try {
      if (prisma) {
        await prisma.store.delete({ where: { id } })
        return { success: true }
      }
      return { success: false, message: 'Database not available' }
    } catch (error: any) {
      log.error('Error deleting store:', error)
      return { success: false, message: error.message }
    }
  })
}
