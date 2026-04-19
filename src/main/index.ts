import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log, { createLogger } from './utils/logger'

const mainLog = createLogger('Main')
import { schedule, ScheduledTask } from 'node-cron'
import icon from '../../resources/icon.png?asset'

// Import IPC handlers registration function
import { registerAllHandlers, prisma, initializePrisma } from './ipc/handlers/index'
import { initializeDatabase } from './database/init'
import { MigrationManager } from './services/MigrationManager'
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
console.log   = (...args) => log.info(...args)
console.error = (...args) => log.error(...args)
console.warn  = (...args) => log.warn(...args)
console.debug = (...args) => log.debug(...args)

let migrationManager: MigrationManager | null = null
let mainWindow: BrowserWindow | null = null

const DEMO_EXPIRES_AT_ISO = '2026-06-19T23:59:59.999Z'
const DEFAULT_LINKEDIN_URL = 'https://www.linkedin.com/in/medhatjachour/'

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
    </style>
  </head>
  <body>
    <main class="card">
      <h1>BizFlow Demo Has Expired</h1>
      <p>This demo version ended on <strong>${expiryDateText}</strong>.</p>
      <p>To continue, please connect with me on LinkedIn for full access.</p>
      <a class="cta" href="${linkedInUrl}" target="_blank" rel="noreferrer">Connect on LinkedIn</a>
      <p class="footer">Close this window to exit the application.</p>
    </main>
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
    ...(process.platform === 'linux' ? { icon } : {}),
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
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch(err => {
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
        mainWindow.loadFile(indexPath).catch(err => {
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
    if (level >= 3) rendererLog.error(message)       // level 3 = error
    else if (level >= 2) rendererLog.warn(message)   // level 2 = warning
    else rendererLog.verbose(message)
  })

  return mainWindow
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

  try {
    const demoStatus = isDemoExpired()
    if (demoStatus.expired) {
      const linkedInUrl = process.env.BIZFLOW_LINKEDIN_URL || DEFAULT_LINKEDIN_URL
      mainLog.warn('Demo access expired. Showing LinkedIn contact window.')
      createDemoExpiredWindow(linkedInUrl, demoStatus.expiryDate)
      return
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

    // Create window (hidden initially)
    mainWindow = createWindow()

    // Run database migrations if needed
    mainLog.info('Checking for database migrations...')
    migrationManager = new MigrationManager()
    
    const migrationSuccess = await migrationManager.migrateWithUI(mainWindow)
    
    if (!migrationSuccess) {
      mainLog.warn('Migration failed or cancelled, exiting...')
      return // App will quit from migration manager
    }

    mainLog.info('Migration check complete, showing window...')

    // Seed default installment plans (only if none exist)
    try {
      const planCount = await prisma.installmentPlan.count()
      if (planCount === 0) {
        mainLog.info('No installment plans found, seeding defaults...')
        const planService = InstallmentPlanService.getInstance(prisma)
        await planService.seedDefaultPlans()
        mainLog.info('Installment plans initialized')
      }
    } catch (error) {
      mainLog.error('Failed to check/seed installment plans:', error)
    }

    // Setup daily email reports cron job (runs at 11 PM every day)
    mainLog.info('Setting up daily email reports cron job...')
    setupDailyEmailReports()

    mainLog.info('Setup complete')
    
    // Show window after everything is ready
    mainWindow.show()
  } catch (error) {
    mainLog.error('Setup failed:', error)
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
