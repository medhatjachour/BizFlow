import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'
import { ReceiptService } from '../../services/ReceiptService'

const receiptService = new ReceiptService()

export function registerReceiptHandlers() {

  ipcMain.handle('receipts:generateDeposit', async (_, depositId) => {
    try {
      const receipt = await receiptService.generateDepositReceipt(depositId)
      return { success: true, receipt }
    } catch (error) {
      console.error('Error generating deposit receipt:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('receipts:generateInstallment', async (_, installmentId) => {
    try {
      const receipt = await receiptService.generateInstallmentReceipt(installmentId)
      return { success: true, receipt }
    } catch (error) {
      console.error('Error generating installment receipt:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('receipts:generateThermal', async (_, receipt) => {
    try {
      const thermalData = receiptService.generateThermalReceipt(receipt)
      return { success: true, thermalData }
    } catch (error) {
      console.error('Error generating thermal receipt:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
}