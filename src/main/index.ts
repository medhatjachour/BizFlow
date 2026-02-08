import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { schedule } from 'node-cron'
import icon from '../../resources/icon.png?asset'

// Import IPC handlers registration function
import { registerAllHandlers } from './ipc/handlers/index'
import { initializeDatabase } from './database/init'
import { SimpleMigrationManager } from './services/SimpleMigrationManager'
import { db } from './database/sqlite'

// Setup daily email reports cron job
function setupDailyEmailReports() {
  // DISABLED until EmailReportService is converted to better-sqlite3
  console.log('[Cron] Daily email reports disabled (needs migration to better-sqlite3)')
  return
  
  /*
  // Run at 11:00 PM every day
  schedule('0 23 * * *', async () => {
    console.log('[Cron] Starting daily email reports...')

    try {
      // Get all enabled email reports
      const enabledReports = db.query(
        'SELECT * FROM EmailReport WHERE enabled = 1'
      )

      console.log(`[Cron] Found ${enabledReports.length} enabled email reports`)

      for (const report of enabledReports) {
        try {
          const emailService = new EmailReportService()
          const data = await emailService.generateDailyReport(report.userId)
          await emailService.sendEmailReport(report.userId, data)
          console.log(`[Cron] Sent daily report to ${report.email}`)
        } catch (error) {
          console.error(`[Cron] Failed to send report to ${report.email}:`, error)
        }
      }

      console.log('[Cron] Daily email reports completed')
    } catch (error) {
      console.error('[Cron] Failed to run daily email reports:', error)
    }
  })

  console.log('[Cron] Daily email reports scheduled for 11:00 PM daily')
  */
}

// Setup logging to file
const logDir = join(app.getPath('userData'), 'logs')
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}
const logFile = join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`)

// Save original console methods BEFORE overriding
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

function logToFile(level: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  const message = args.map(a => {
    try {
      return typeof a === 'string' ? a : JSON.stringify(a)
    } catch {
      return String(a)
    }
  }).join(' ')
  const logMessage = `[${timestamp}] [${level}] ${message}\n`
  
  try {
    appendFileSync(logFile, logMessage)
  } catch (err) {
    originalConsoleError('Failed to write to log file:', err)
  }
}

// Override console methods to also log to file
console.log = (...args) => {
  originalConsoleLog(...args)
  logToFile('INFO', ...args)
}

console.error = (...args) => {
  originalConsoleError(...args)
  logToFile('ERROR', ...args)
}

console.warn = (...args) => {
  originalConsoleWarn(...args)
  logToFile('WARN', ...args)
}

let migrationManager: SimpleMigrationManager | null = null
let mainWindow: BrowserWindow | null = null

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
    console.warn('Could not set window title:', err)
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
    console.log('[Main] Loading renderer from URL:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).catch(err => {
      console.error('[Main] Failed to load renderer URL:', err)
    })
  } else {
    const indexPath = join(__dirname, '../renderer/index.html')
    // Safety: check file exists before loading to avoid white screen + silent fail
    try {
      if (!existsSync(indexPath)) {
        console.error('[Main] Renderer index.html not found at:', indexPath)
        // Print a small error HTML to help users debug a missing build
        const errorHtml = `<!doctype html><html><body><h2>Missing renderer build</h2><p>Expected file not found: ${indexPath}</p></body></html>`
        mainWindow.loadURL('data:text/html,' + encodeURIComponent(errorHtml))
      } else {
        mainWindow.loadFile(indexPath).catch(err => {
          console.error('[Main] Failed to load index.html:', err)
          const errorHtml = `<!doctype html><html><body><h2>Renderer failed to load</h2><pre>${String(err)}</pre></body></html>`
          mainWindow?.loadURL('data:text/html,' + encodeURIComponent(errorHtml))
        })
      }
    } catch (err) {
      console.error('[Main] Error while attempting to load renderer:', err)
      const errorHtml = `<!doctype html><html><body><h2>Renderer load error</h2><pre>${String(err)}</pre></body></html>`
      mainWindow.loadURL('data:text/html,' + encodeURIComponent(errorHtml))
    }
  }

  // Log any renderer errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Renderer] Page failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Renderer] Process gone:', details.reason, details.exitCode)
  })

  // Console message logging for debugging
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[Renderer Console] ${message}`)
  })

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.bizflow.app')

  console.log('[Main] Starting application...')
  console.log('[Main] Environment:', is.dev ? 'development' : 'production')
  console.log('[Main] User data path:', app.getPath('userData'))

  try {
    // Initialize database (create in userData on first run)
    console.log('[Main] Initializing database...')
    await initializeDatabase()

    // Register all IPC handlers BEFORE creating windows
    console.log('[Main] Registering IPC handlers...')
    registerAllHandlers()

    // Create window (hidden initially)
    mainWindow = createWindow()

    // Run database migrations if needed
    console.log('[Main] Checking for database migrations...')
    migrationManager = new SimpleMigrationManager()
    
    const migrationSuccess = await migrationManager.migrateWithUI(mainWindow)
    
    if (!migrationSuccess) {
      console.log('[Main] Migration failed or cancelled, exiting...')
      return // App will quit from migration manager
    }

    console.log('[Main] Migration check complete, showing window...')

    // Seed default installment plans - DISABLED until converted to better-sqlite3
    // console.log('[Main] Seeding default installment plans...')
    // try {
    //   const planService = InstallmentPlanService.getInstance()
    //   await planService.seedDefaultPlans()
    //   console.log('[Main] ✅ Installment plans initialized')
    // } catch (error) {
    //   console.error('[Main] ⚠️  Failed to seed installment plans:', error)
    // }

    // Setup daily email reports cron job (runs at 11 PM every day)
    console.log('[Main] Setting up daily email reports cron job...')
    setupDailyEmailReports()

    console.log('[Main] ✅ Setup complete')
    
    // Show window after everything is ready
    mainWindow.show()
  } catch (error) {
    console.error('[Main] ❌ Setup failed:', error)
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

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

let isQuitting = false

app.on('before-quit', async (event) => {
  if (isQuitting) return
  
  // Prevent default quit to allow cleanup
  event.preventDefault()
  isQuitting = true
  
  console.log('[Main] App is quitting, cleaning up...')
  
  // Cleanup migration manager
  if (migrationManager) {
    try {
      await migrationManager.cleanup()
    } catch (error) {
      console.error('[Main] Cleanup error:', error)
    }
  }
  
  // Force quit after cleanup
  app.exit(0)
})

// Handle uncaught errors
process.on('uncaughtException', (error: any) => {
  // Ignore Prisma cleanup errors during shutdown
  if (error?.message?.includes('napi ref') || error?.message?.includes('Prisma')) {
    console.warn('[Main] ⚠️ Non-critical Prisma cleanup error (ignored):', error?.message)
    if (isQuitting) {
      app.exit(0)
    }
    return
  }
  console.error('[Main] Uncaught exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
