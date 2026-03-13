/**
 * Module Settings IPC Handlers
 *
 * Exposes module feature-flag read/write to the renderer process.
 *
 * Channels:
 *   module:getEnabled  → string[]          — list of enabled module IDs
 *   module:setEnabled  → void              — enable/disable a module by ID
 */

import { ipcMain, app } from 'electron'
import { getEnabledModuleIds, setModuleEnabled } from '../../utils/module-settings'
import { createLogger } from '../../utils/logger'

const log = createLogger('ModuleHandlers')

export function registerModuleHandlers(): void {
  ipcMain.handle('module:getEnabled', () => {
    return getEnabledModuleIds()
  })

  ipcMain.handle('module:setEnabled', (_event, { moduleId, enabled }: { moduleId: string; enabled: boolean }) => {
    setModuleEnabled(moduleId, enabled)
    log.info(`Module "${moduleId}" ${enabled ? 'enabled' : 'disabled'}`)
  })

  ipcMain.handle('module:relaunch', () => {
    log.info('Relaunching app to apply module changes…')
    app.relaunch()
    app.exit(0)
  })
}
