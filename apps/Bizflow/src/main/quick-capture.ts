/**
 * Global quick-capture shortcut for the Personal work OS (spec section 6):
 * Ctrl/Cmd+Shift+Space, from anywhere in the app and while BizFlow sits in the
 * background.
 *
 * Only the accelerator lives here. The panel is renderer UI, so a global
 * shortcut has to be registered in the main process (there is no window to
 * attach a key listener to) and then hand the focus to the existing window.
 */
import { BrowserWindow, globalShortcut } from 'electron'
import { getEnabledModuleIds } from './utils/module-settings'
import { createLogger } from './utils/logger'

const log = createLogger('QuickCapture')

export const QUICK_CAPTURE_ACCELERATOR = 'CommandOrControl+Shift+Space'

/** Main -> renderer signal that the capture panel should open. */
export const QUICK_CAPTURE_CHANNEL = 'quick-capture:open'

const personalModuleActive = (): boolean =>
  typeof __PLUGIN_PERSONAL__ !== 'undefined' &&
  __PLUGIN_PERSONAL__ &&
  getEnabledModuleIds().includes('personal')

let registered = false

const deliver = (window: BrowserWindow): void => {
  if (window.isDestroyed()) return
  window.webContents.send(QUICK_CAPTURE_CHANNEL)
}

/**
 * Brings BizFlow forward and asks the renderer to open the capture panel.
 * Shared by the accelerator and the tray menu item.
 */
export function openQuickCapture(): void {
  const [window] = BrowserWindow.getAllWindows()
  if (!window) return

  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()

  // A shortcut pressed during startup would otherwise be dropped, because the
  // renderer has not attached its listener yet.
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', () => deliver(window))
  } else {
    deliver(window)
  }
}

/**
 * Registers the accelerator. Silently does nothing when the personal module is
 * off, and survives another app already owning the combination - a taken
 * shortcut must not stop BizFlow from starting.
 */
export function setupQuickCapture(): void {
  if (!personalModuleActive()) {
    log.info('Quick-capture shortcut skipped: the personal module is not enabled.')
    return
  }
  if (registered) return

  try {
    registered = globalShortcut.register(QUICK_CAPTURE_ACCELERATOR, openQuickCapture)
    if (registered) {
      log.info(`Quick-capture shortcut registered: ${QUICK_CAPTURE_ACCELERATOR}`)
    } else {
      log.warn(
        `Could not register ${QUICK_CAPTURE_ACCELERATOR} - another application already uses it. ` +
          'The tray menu still opens the capture panel.'
      )
    }
  } catch (error) {
    registered = false
    log.error('Failed to register the quick-capture shortcut:', error)
  }
}

/** Releases the accelerator on quit. */
export function teardownQuickCapture(): void {
  if (!registered) return
  try {
    globalShortcut.unregister(QUICK_CAPTURE_ACCELERATOR)
  } catch (error) {
    log.warn('Failed to release the quick-capture shortcut:', error)
  }
  registered = false
}
