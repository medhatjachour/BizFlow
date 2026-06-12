/**
 * Log IPC Handlers
 * Receives structured log events from the renderer process and writes them
 * to the main-process electron-log file so all errors end up in one place.
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const rendererLog = createLogger('Renderer')

export function registerLogHandlers() {
  ipcMain.handle('log:fromRenderer', (_event, entry: {
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    data?: unknown
  }) => {
    const { level, message, data } = entry
    if (data !== undefined) {
      rendererLog[level](message, data)
    } else {
      rendererLog[level](message)
    }
  })
}
