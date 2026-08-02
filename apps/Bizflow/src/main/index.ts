import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log, { createLogger } from './utils/logger'

const mainLog = createLogger('Main')
import { schedule, ScheduledTask } from 'node-cron'
import icon from '../../resources/icon.png?asset'

// Import IPC handlers registration function
import { registerAllHandlers, prisma, initializePrisma } from './ipc/handlers/index'
import {
  performBackup,
  getCloseBackupPrefs,
  defaultBackupDir
} from './ipc/handlers/backup.handlers'
import { initializeDatabase } from './database/init'
import { MigrationManager } from './services/MigrationManager'
import { setupAutoUpdater } from './updater'
// Static imports — fixes "dynamically and statically imported" Vite warnings
import { EmailReportService } from './services/EmailReportService'
import { InstallmentPlanService } from './services/InstallmentPlanService'

// ------------------------------------------------------------------
// Suppress VSync / GPU errors on Linux (non-critical rendering glitches)
// Must run BEFORE app.whenReady()
// ------------------------------------------------------------------
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu-vsync')
  app.commandLine.appendSwitch('disable-frame-rate-limit')
}
// Suppress the GetVSyncParametersIfAvailable OpenGL warning on all platforms
app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder')

// Cron task reference — stored so we can clean up on quit
let dailyEmailCronTask: ScheduledTask | null = null

const cronLog = createLogger('Cron')

// Register IPC handler for PDF printing with Arabic/RTL support
// Uses Chromium's native rendering which has full Arabic support
function registerPdfPrintHandler(): void {
  ipcMain.on('print-to-pdf', async (event, { html, filename }) => {
    let pdfWindow: BrowserWindow | null = null

    try {
      const pdfLog = createLogger('PDF Export')
      pdfLog.info(`Generating PDF: ${filename}`)

      // Show save dialog to let user choose where to save
      const result = await dialog.showSaveDialog({
        defaultPath: join(app.getPath('downloads'), filename),
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      // User cancelled the save dialog
      if (result.canceled) {
        pdfLog.info('PDF export cancelled by user')
        event.reply('pdf-generated', { success: false, error: 'Export cancelled' })
        return
      }

      const savePath = result.filePath
      if (!savePath) {
        throw new Error('No save path selected')
      }

      pdfLog.info(`User selected save path: ${savePath}`)

      // Create a hidden window for rendering
      pdfWindow = new BrowserWindow({
        width: 1200,
        height: 1500,
        show: false,
        webPreferences: {
          sandbox: true,
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Load HTML using data URL with base64 encoding
      // This avoids file system issues on Windows and preserves UTF-8 properly
      const base64Html = Buffer.from(html, 'utf-8').toString('base64')
      const dataUrl = `data:text/html;charset=utf-8;base64,${base64Html}`
      
      pdfLog.info('Loading HTML from data URL...')
      await pdfWindow.loadURL(dataUrl)

      // Wait for the page to fully load
      await new Promise<void>((resolve, reject) => {
        let resolved = false

        const loadedHandler = () => {
          if (resolved) return
          resolved = true
          pdfWindow?.webContents.removeListener('did-finish-load', loadedHandler)
          pdfWindow?.webContents.removeListener('crashed', crashHandler)
          clearTimeout(timeout)
          mainLog.info('Page fully loaded')
          resolve()
        }

        const crashHandler = () => {
          if (resolved) return
          resolved = true
          pdfWindow?.webContents.removeListener('did-finish-load', loadedHandler)
          pdfWindow?.webContents.removeListener('crashed', crashHandler)
          clearTimeout(timeout)
          reject(new Error('Renderer process crashed'))
        }

        // Increased timeout to 30 seconds for complex HTML with lots of data
        const timeout = setTimeout(() => {
          if (resolved) return
          resolved = true
          pdfWindow?.webContents.removeListener('did-finish-load', loadedHandler)
          pdfWindow?.webContents.removeListener('crashed', crashHandler)
          
          mainLog.warn('Page load did not complete within 30 seconds, proceeding anyway')
          // Proceed anyway - the DOM should be ready even if all resources aren't loaded
          resolve()
        }, 30000)

        pdfWindow?.webContents.on('did-finish-load', loadedHandler)
        pdfWindow?.webContents.on('crashed', crashHandler)
      })

      pdfLog.info('Page loaded, generating PDF...')

      // Add a small delay to ensure the page is fully rendered
      // This helps with complex tables and styling
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Generate PDF using Chromium's print-to-PDF
      // This uses Chromium's superior rendering engine which has native Arabic support
      const pdfData = await pdfWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        landscape: false
      })

      // Save to the user-selected location
      writeFileSync(savePath, pdfData)
      pdfLog.info(`PDF saved successfully: ${savePath}`)

      // Send success message back to renderer
      event.reply('pdf-generated', { success: true, filePath: savePath, filename })
    } catch (error) {
      mainLog.error('PDF generation failed:', error)
      event.reply('pdf-generated', { 
        success: false, 
        error: `PDF generation failed: ${(error as Error).message}` 
      })
    } finally {
      // Clean up the window
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.destroy()
      }
    }
  })
}

// Setup daily email reports cron job
function setupDailyEmailReports(): void {
  // Run at 11:00 PM every day
  dailyEmailCronTask = schedule('0 23 * * *', async () => {
    cronLog.info('Starting daily email reports...')

    try {
      // Reuse the already-imported EmailReportService (no dynamic import needed)
      const enabledReports = await prisma.emailReport.findMany({
        where: { enabled: true }
      })

      cronLog.info(`Found ${enabledReports.length} enabled email reports`)

      for (const report of enabledReports) {
        try {
          const emailService = new EmailReportService(prisma)
          const data = await emailService.generateDailyReport(report.userId)
          await emailService.sendEmailReport(report.userId, data)
          cronLog.info(`Sent daily report to ${report.email}`)
        } catch (error) {
          cronLog.error(`Failed to send report to ${report.email}:`, error)
        }
      }

      cronLog.info('Daily email reports completed')
    } catch (error) {
      cronLog.error('Failed to run daily email reports:', error)
    }
  })

  cronLog.info('Daily email reports scheduled for 11:00 PM daily')
}

// electron-log is already configured in utils/logger.ts.
// It writes to the platform log directory automatically.
// Override console.* so any remaining console calls in third-party
// code or handlers are also captured in the log file.
log.transports.console.level = is.dev ? 'debug' : 'warn'
console.log = (...args) => log.info(...args)
console.error = (...args) => log.error(...args)
console.warn = (...args) => log.warn(...args)
console.debug = (...args) => log.debug(...args)

let migrationManager: MigrationManager | null = null
let mainWindow: BrowserWindow | null = null
// Guard so the backup-on-close prompt only runs once per quit.
let backupQuitConfirmed = false

const DEMO_EXPIRES_AT_ISO = '2040-06-19T23:59:59.999Z'
const DEFAULT_LINKEDIN_URL = 'https://www.linkedin.com/in/medhatjachour/'
// Hidden "cheat code": type this into the demo-expired window's input to bypass
// the gate and launch the app. Override via BIZFLOW_DEMO_UNLOCK_CODE.
const DEMO_UNLOCK_CODE = process.env.BIZFLOW_DEMO_UNLOCK_CODE || 'mga+'
// The expired page has no preload/IPC, so it hands the typed code to the main
// process by writing it into document.title behind this sentinel prefix.
const DEMO_UNLOCK_TITLE_SENTINEL = '__bizflow_unlock__:'

function getDemoExpiryDate(): Date {
  const configuredExpiry = process.env.BIZFLOW_DEMO_EXPIRES_AT || DEMO_EXPIRES_AT_ISO
  const expiryDate = new Date(configuredExpiry)

  if (Number.isNaN(expiryDate.getTime())) {
    // Fail closed: if date config is invalid, lock demo immediately.
    mainLog.error('Invalid demo expiry date configuration:', configuredExpiry)
    return new Date(0)
  }

  return expiryDate
}

function createDemoExpiredWindow(linkedInUrl: string, expiryDate: Date): BrowserWindow {
  const expiredWindow = new BrowserWindow({
    width: 640,
    height: 460,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f7f5',
    icon,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: is.dev
    }
  })

  expiredWindow.setTitle('BizFlow Demo Expired')

  expiredWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const expiryDateText = expiryDate.toLocaleDateString()
  const pageHtml = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Demo Expired</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, #ffffff 0%, #f0f3f6 100%);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card {
        width: min(520px, calc(100vw - 40px));
        padding: 32px;
        border-radius: 20px;
        background: #ffffff;
        box-shadow: 0 20px 50px rgba(13, 41, 67, 0.15);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 28px;
        color: #0f172a;
      }
      p {
        margin: 10px 0;
        color: #334155;
        line-height: 1.6;
      }
      .cta {
        display: inline-block;
        margin-top: 16px;
        background: #0a66c2;
        color: #ffffff;
        text-decoration: none;
        border-radius: 10px;
        padding: 12px 18px;
        font-weight: 600;
      }
      .footer {
        margin-top: 18px;
        font-size: 12px;
        color: #64748b;
      }
      .unlock {
        margin-top: 22px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .unlock input {
        flex: 1 1 180px;
        padding: 10px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 14px;
        outline: none;
      }
      .unlock input:focus {
        border-color: #0a66c2;
        box-shadow: 0 0 0 3px rgba(10, 102, 194, 0.15);
      }
      .unlock button {
        padding: 10px 16px;
        border: none;
        border-radius: 10px;
        background: #0f172a;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }
      .err {
        margin: 8px 0 0;
        color: #dc2626;
        font-size: 13px;
        font-weight: 600;
      }
      .ok {
        margin: 8px 0 0;
        color: #16a34a;
        font-size: 13px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>BizFlow Demo Has Expired</h1>
      <p>This demo version ended on <strong>${expiryDateText}</strong>.</p>
      <p>To continue, please connect with me on LinkedIn for full access.</p>
      <a class="cta" href="${linkedInUrl}" target="_blank" rel="noreferrer">Connect on LinkedIn</a>

      <div class="unlock">
        <input id="code" type="password" placeholder="Enter access code" autocomplete="off" spellcheck="false" />
        <button id="go" type="button">Unlock</button>
      </div>
      <p id="err" class="err" hidden>Invalid code \u2014 try again.</p>
      <p id="ok" class="ok" hidden>Code accepted \u2014 starting BizFlow\u2026</p>

      <p class="footer">Close this window to exit the application.</p>
    </main>
    <script>
      (function () {
        var SENTINEL = '${DEMO_UNLOCK_TITLE_SENTINEL}';
        var input = document.getElementById('code');
        var err = document.getElementById('err');
        var ok = document.getElementById('ok');
        function submit() {
          var v = (input.value || '').trim();
          if (!v) return;
          err.hidden = true;
          // Hand the typed code to the main process via the window title.
          document.title = SENTINEL + v;
        }
        document.getElementById('go').addEventListener('click', submit);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') submit();
        });
        // Invoked by the main process (executeJavaScript) when the code is wrong.
        window.__demoInvalid = function () {
          err.hidden = false;
          input.value = '';
          input.focus();
        };
        // Invoked by the main process right before the app launches.
        window.__demoAccepted = function () {
          err.hidden = true;
          ok.hidden = false;
        };
        input.focus();
      })();
    </script>
  </body>
</html>`

  expiredWindow.loadURL('data:text/html,' + encodeURIComponent(pageHtml))
  return expiredWindow
}

function isDemoExpired(): { expired: boolean; expiryDate: Date } {
  const expiryDate = getDemoExpiryDate()

  return {
    expired: Date.now() > expiryDate.getTime(),
    expiryDate
  }
}

function createWindow(): BrowserWindow {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Keep hidden until migration completes
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: is.dev // Enable DevTools in development
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Offer to back up the database when the user closes the app.
  mainWindow.on('close', (e) => {
    if (backupQuitConfirmed) return
    const prefs = getCloseBackupPrefs()
    if (!prefs.promptOnClose) return
    const win = mainWindow
    if (!win) return

    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Back up & Quit', 'Quit without backup', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: 'Back up before closing?',
      message: 'Do you want to back up your data before closing BizFlow?',
      detail: 'A copy of your database will be saved so you can restore it later.'
    })
    if (choice === 2) {
      // Cancel — keep the app open.
      e.preventDefault()
      return
    }
    // === CLEAR STORAGE BEFORE QUIT ===
    const clearStorage = async () => {
      if (win.isDestroyed()) return
      try {
        await win.webContents.executeJavaScript(`localStorage.clear(); sessionStorage.clear();`)
        // Or use: await win.webContents.session.clearStorageData();
      } catch (err) {
        mainLog.warn('Storage clear failed:', err)
      }
    }

    if (choice === 1) {
      // Quit without backup
      clearStorage().then(() => {
        backupQuitConfirmed = true
        app.quit()
      })
      return
    }
    // Back up, then quit once the copy is written.
    e.preventDefault()
    const destDir = prefs.backupDir || defaultBackupDir()
    performBackup(destDir)
      .then((res) => {
        backupQuitConfirmed = true
        if (!res.success) {
          dialog.showMessageBoxSync(win, {
            type: 'error',
            title: 'Backup failed',
            noLink: true,
            message: 'Could not create a backup.',
            detail: res.error + '\n\nThe app will now close.'
          })
        } else {
          mainLog.info('Backup-on-close saved to ' + res.data.path)
        }

        clearStorage().then(() => {
          backupQuitConfirmed = true
          app.quit()
        })
      })
      .catch((err) => {
        backupQuitConfirmed = true
        mainLog.error('Backup-on-close failed:', err)
        clearStorage().then(() => {
          backupQuitConfirmed = true
          app.quit()
        })
      })
  })

  // Set a clear, branded window title
  try {
    mainWindow.setTitle('BizFlow')
  } catch (err) {
    mainLog.warn('Could not set window title:', err)
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Allow DevTools in development mode
  if (!is.dev) {
    // Only prevent DevTools shortcuts in production
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const key = input.key?.toLowerCase?.() || ''
      // Block F12 or Ctrl+Shift+I / Command+Option+I
      if (key === 'f12' || ((input.control || input.meta) && input.shift && key === 'i')) {
        event.preventDefault()
      }
    })
  }

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  // Load renderer: prefer dev URL in development, otherwise load local file.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainLog.info('Loading renderer from URL:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch((err) => {
      mainLog.error('Failed to load renderer URL:', err)
    })
  } else {
    const indexPath = join(__dirname, '../renderer/index.html')
    // Safety: check file exists before loading to avoid white screen + silent fail
    try {
      if (!existsSync(indexPath)) {
        mainLog.error('Renderer index.html not found at:', indexPath)
        // Print a small error HTML to help users debug a missing build
        const errorHtml = `<!doctype html><html><body><h2>Missing renderer build</h2><p>Expected file not found: ${indexPath}</p></body></html>`
        mainWindow.loadURL('data:text/html,' + encodeURIComponent(errorHtml))
      } else {
        mainWindow.loadFile(indexPath).catch((err) => {
          mainLog.error('Failed to load index.html:', err)
          const errorHtml = `<!doctype html><html><body><h2>Renderer failed to load</h2><pre>${String(err)}</pre></body></html>`
          mainWindow?.loadURL('data:text/html,' + encodeURIComponent(errorHtml))
        })
      }
    } catch (err) {
      mainLog.error('Error while attempting to load renderer:', err)
      const errorHtml = `<!doctype html><html><body><h2>Renderer load error</h2><pre>${String(err)}</pre></body></html>`
      mainWindow.loadURL('data:text/html,' + encodeURIComponent(errorHtml))
    }
  }

  // Log any renderer errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    mainLog.error('Renderer page failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    mainLog.error('Renderer process gone:', details.reason, 'exitCode:', details.exitCode)
  })

  // Console message logging for debugging
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const rendererLog = createLogger('Renderer')
    if (level >= 3)
      rendererLog.error(message) // level 3 = error
    else if (level >= 2)
      rendererLog.warn(message) // level 2 = warning
    else rendererLog.verbose(message)
  })

  return mainWindow
}

/**
 * Bridges the demo-expired window's typed access code to the main process.
 * The page writes the sentinel-prefixed code into document.title; we read it
 * here and resolve only when the correct code is entered. Wrong codes flash an
 * inline error and keep waiting. If the user never enters the code, this never
 * resolves and closing the window quits the app.
 */
function waitForDemoUnlock(expiredWindow: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    expiredWindow.webContents.on('page-title-updated', (event, title) => {
      if (!title.startsWith(DEMO_UNLOCK_TITLE_SENTINEL)) return
      event.preventDefault()
      const code = title.slice(DEMO_UNLOCK_TITLE_SENTINEL.length)
      // Restore the visible title so the typed code never lingers there.
      try {
        expiredWindow.setTitle('BizFlow Demo Expired')
      } catch {
        /* ignore */
      }

      if (code === DEMO_UNLOCK_CODE) {
        mainLog.warn('Demo unlock code accepted \u2014 launching application.')
        expiredWindow.webContents
          .executeJavaScript('window.__demoAccepted && window.__demoAccepted();')
          .catch(() => {})
        // Brief pause so the "accepted" message is visible, then continue
        // startup. We HIDE (not close) the window: with no main window yet,
        // closing it would fire window-all-closed and quit the app. The
        // whenReady startup destroys it once the main window is created.
        setTimeout(() => {
          if (!expiredWindow.isDestroyed()) expiredWindow.hide()
          resolve()
        }, 400)
      } else {
        mainLog.warn('Invalid demo unlock code entered.')
        expiredWindow.webContents
          .executeJavaScript('window.__demoInvalid && window.__demoInvalid();')
          .catch(() => {})
      }
    })
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.bizflow.app')

  mainLog.info('Starting application...')
  mainLog.info('Environment:', is.dev ? 'development' : 'production')
  mainLog.info('Version:', app.getVersion())
  mainLog.info('User data path:', app.getPath('userData'))
  mainLog.info('Log file:', log.transports.file.getFile().path)

  // The demo-expired window (if shown). Kept alive but hidden after a
  // successful unlock so closing it doesn't trigger window-all-closed -> quit
  // before the main window exists. Destroyed once the main window is created.
  let demoExpiredWindow: BrowserWindow | null = null
  try {
    const demoStatus = isDemoExpired()
    if (demoStatus.expired) {
      const linkedInUrl = process.env.BIZFLOW_LINKEDIN_URL || DEFAULT_LINKEDIN_URL
      mainLog.warn('Demo access expired. Showing unlock / LinkedIn window.')
      demoExpiredWindow = createDemoExpiredWindow(linkedInUrl, demoStatus.expiryDate)
      // Block startup until the correct unlock code is typed. If it is never
      // entered, the user closes the window and the app quits.
      await waitForDemoUnlock(demoExpiredWindow)
      mainLog.warn('Demo unlocked via access code \u2014 continuing startup.')
    }
  } catch (error) {
    mainLog.error('Failed to validate demo period. Continuing startup:', error)
  }

  try {
    // 1. Ensure the database file exists and is seeded BEFORE Prisma opens it.
    //    initializePrisma() (called below) is what actually opens the SQLite file,
    //    so there is no EBUSY race on first production run.
    mainLog.info('Initializing database...')
    await initializeDatabase()

    // 2. Now it is safe to open Prisma — the seeded template is already in place.
    mainLog.info('Initializing Prisma client...')
    await initializePrisma()

    // 3. Register all IPC handlers (they use the prisma export from handlers/index).
    mainLog.info('Registering IPC handlers...')
    registerAllHandlers()

    // Register PDF printing handler for Arabic/RTL support
    registerPdfPrintHandler()

    // Create window (hidden initially)
    mainWindow = createWindow()

    // The main window now exists, so the (hidden) demo-unlock window can be
    // disposed without window-all-closed firing and quitting the app.
    if (demoExpiredWindow && !demoExpiredWindow.isDestroyed()) {
      demoExpiredWindow.destroy()
    }
    demoExpiredWindow = null

    // Run database migrations if needed
    mainLog.info('Checking for database migrations...')
    migrationManager = new MigrationManager()

    const migrationSuccess = await migrationManager.migrateWithUI(mainWindow)

    if (!migrationSuccess) {
      mainLog.warn('Migration failed or cancelled, exiting...')
      return // App will quit from migration manager
    }

    mainLog.info('Migration check complete, showing window...')

    // Seed default installment plans (only if none exist — table may not exist in all module configs)
    try {
      const tableRows = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='InstallmentPlan'`
      )) as { cnt: number }[]
      if (Number(tableRows[0]?.cnt) > 0) {
        const p = prisma as any
        const planCount = await p.installmentPlan.count()
        if (planCount === 0) {
          mainLog.info('No installment plans found, seeding defaults...')
          const planService = InstallmentPlanService.getInstance(prisma)
          await planService.seedDefaultPlans()
          mainLog.info('Installment plans initialized')
        }
      }
    } catch (error: any) {
      if (error?.code !== 'P2021') {
        mainLog.error('Failed to check/seed installment plans:', error)
      }
    }

    // Setup daily email reports cron job (runs at 11 PM every day)
    mainLog.info('Setting up daily email reports cron job...')
    setupDailyEmailReports()

    mainLog.info('Setup complete')

    // Show window after everything is ready
    mainWindow.show()

    // Start checking for updates (no-op in development / unpackaged builds).
    setupAutoUpdater(mainWindow)
  } catch (error) {
    mainLog.error('Setup failed:', error)
    // Don't leave a hidden demo window keeping the app alive after a failure.
    if (demoExpiredWindow && !demoExpiredWindow.isDestroyed()) {
      demoExpiredWindow.destroy()
    }
    demoExpiredWindow = null
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => mainLog.debug('pong'))

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      mainWindow.show()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  // Stop cron job to prevent callbacks firing after process teardown
  if (dailyEmailCronTask) {
    mainLog.info('Stopping daily email cron task...')
    dailyEmailCronTask.stop()
    dailyEmailCronTask = null
  }
  // Cleanup migration manager
  if (migrationManager) {
    mainLog.info('Cleaning up migration manager...')
    await migrationManager.cleanup()
  }
  mainLog.info('Application quitting')
})

// Handle uncaught errors (electron-log.errorHandler also catches these,
// but keep explicit handlers for custom formatting)
process.on('uncaughtException', (error) => {
  mainLog.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  mainLog.error('Unhandled rejection at:', promise, 'reason:', reason)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
