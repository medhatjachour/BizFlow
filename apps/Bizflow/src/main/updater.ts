/**
 * Auto-update wiring (electron-updater + GitHub Releases).
 *
 * Only runs in the packaged production app. The feed location is read from the
 * `app-update.yml` that electron-builder bakes from the `publish:` block in
 * electron-builder.yml — there is nothing to configure here at runtime.
 *
 * Release flow (see also the publish block in electron-builder.yml):
 *   1. Bump "version" in package.json.
 *   2. Build the installer (e.g. `npm run build:all:win`).
 *   3. Upload the produced  <name>-<version>-<variant>.exe,  *.exe.blockmap  and
 *      the generated  latest.yml  to a GitHub Release for that version tag.
 * Installed apps then detect the new version, download it in the background and
 * install on restart. User data in %AppData% is never touched.
 */
import { app, dialog, ipcMain, type BrowserWindow } from 'electron'
// electron-updater is CommonJS — use a default import + destructure for ESM
// interop (named imports break under electron-vite's bundler).
import electronUpdater from 'electron-updater'
import { createLogger } from './utils/logger'

const { autoUpdater } = electronUpdater
const log = createLogger('Updater')

let wired = false

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  if (wired) return
  wired = true

  const send = (channel: string, payload?: unknown): void => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload)
  }

  // ── IPC available in every environment (dev included) ─────────────────────────
  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) {
      return { status: 'dev' as const, version: app.getVersion() }
    }
    try {
      await autoUpdater.checkForUpdates()
      return { status: 'checking' as const, version: app.getVersion() }
    } catch (e) {
      log.error('Manual update check failed:', e)
      return {
        status: 'error' as const,
        message: e instanceof Error ? e.message : String(e),
        version: app.getVersion()
      }
    }
  })

  // ── Background auto-update only in the packaged app ──────────────────────
  if (!app.isPackaged) {
    log.info('Auto-update disabled in development (manual check returns "dev").')
    return
  }

  autoUpdater.logger = log as unknown as typeof autoUpdater.logger
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // NOTE: if you publish MULTIPLE plugin variants (vet, pharmacy, …) to the SAME
  // GitHub repo, set a per-variant channel here (e.g. autoUpdater.channel = 'vet')
  // AND `channel: vet` in the publish block so their manifests don't collide.

  autoUpdater.on('checking-for-update', () => log.info('Checking for updates…'))
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version)
    send('update:available', { version: info.version })
  })
  autoUpdater.on('update-not-available', () => {
    log.info('App is up to date.')
    send('update:none')
  })
  autoUpdater.on('download-progress', (p) => {
    send('update:progress', { percent: Math.round(p.percent) })
  })
  autoUpdater.on('error', (err) => {
    log.error('Auto-update error:', err)
    send('update:error', { message: err instanceof Error ? err.message : String(err) })
  })
  autoUpdater.on('update-downloaded', async (info) => {
    log.info('Update downloaded:', info.version)
    send('update:downloaded', { version: info.version })
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `BizFlow ${info.version} has been downloaded.`,
      detail: 'Restart to install it now. Your data and settings are preserved.'
    })
    if (response === 0) {
      // isSilent = false (show the brief installer), isForceRunAfter = true (relaunch).
      autoUpdater.quitAndInstall(false, true)
    }
  })

  const check = (): void => {
    autoUpdater.checkForUpdates().catch((e) => log.error('checkForUpdates failed:', e))
  }

  // First check ~10s after launch (let the app settle), then every 6 hours.
  setTimeout(check, 10_000)
  setInterval(check, 6 * 60 * 60 * 1000)
}
