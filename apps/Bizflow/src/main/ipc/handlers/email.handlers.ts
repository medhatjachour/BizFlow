/**
 * Email Report IPC Handlers
 *
 * Handles email report configuration and management
 */

import { ipcMain } from 'electron'
import { EmailReportService } from '../../services/EmailReportService'
import { createLogger } from '../../utils/logger'

const log = createLogger('Email')

export function registerEmailHandlers(prisma: any) {
  const emailService = new EmailReportService(prisma)

  /**
   * Configure email report settings
   */
  ipcMain.handle('email:configure', async (_, config) => {
    try {
      await emailService.configureEmailReport(config)
      return { success: true }
    } catch (error) {
      log.error('Email configuration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Get email report configuration
   */
  ipcMain.handle('email:getConfig', async (_, userId: string) => {
    try {
      const config = await emailService.getEmailReportConfig(userId)
      return { success: true, config }
    } catch (error) {
      log.error('Get email config error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Generate and preview daily report
   */
  ipcMain.handle('email:generatePreview', async (_, userId: string) => {
    try {
      const data = await emailService.generateDailyReport(userId)
      return { success: true, data }
    } catch (error) {
      log.error('Generate preview error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Send test email
   */
  ipcMain.handle('email:testSend', async (_, email: string) => {
    try {
      await emailService.testEmailConfig(email)
      return { success: true }
    } catch (error) {
      log.error('Test email error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  /**
   * Send daily report manually
   */
  ipcMain.handle('email:sendReport', async (_, userId: string) => {
    try {
      const data = await emailService.generateDailyReport(userId)
      await emailService.sendEmailReport(userId, data)
      return { success: true }
    } catch (error) {
      log.error('Send report error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
}