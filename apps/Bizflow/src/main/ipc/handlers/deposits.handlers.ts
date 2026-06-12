import { ipcMain } from 'electron'
import { DepositService } from '../../services/DepositService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Deposits')

export function registerDepositsHandlers(prisma: any) {
  const depositService = new DepositService(prisma)

  ipcMain.handle('deposits:create', async (_, data) => {
    try {
      const deposit = await depositService.createDeposit(data)
      return { success: true, deposit }
    } catch (error) {
      log.error('Error creating deposit:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('deposits:list', async () => {
    try {
      const deposits = await depositService.listDeposits()
      return deposits
    } catch (error) {
      log.error('Error listing deposits:', error)
      return []
    }
  })

  ipcMain.handle('deposits:getByCustomer', async (_, customerId) => {
    try {
      const deposits = await depositService.getDepositsByCustomer(customerId)
      return deposits
    } catch (error) {
      log.error('Error getting deposits by customer:', error)
      return []
    }
  })

  ipcMain.handle('deposits:getBySale', async (_, saleId) => {
    try {
      const deposits = await depositService.getDepositsBySale(saleId)
      return deposits
    } catch (error) {
      log.error('Error getting deposits by sale:', error)
      return []
    }
  })

  ipcMain.handle('deposits:linkToSale', async (_, { depositIds, saleId }) => {
    try {
      const result = await depositService.linkDepositsToSale(depositIds, saleId)
      return { success: true, result }
    } catch (error) {
      log.error('Error linking deposits to sale:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
}
