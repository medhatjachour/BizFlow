/**
 * Database Migration Manager
 * 
 * Handles automatic database migrations when users install new versions.
 * Features:
 * - Automatic backup before migration
 * - Safe rollback on failure
 * - User-friendly progress dialogs
 * - Data validation after migration
 */

import { app, dialog, BrowserWindow } from 'electron'
// The generated Prisma client is module-specific, so commerce models may be
// absent in single-module builds (e.g. vet). Typing it as `any` keeps this
// cross-module code compiling everywhere (matches the plugin-handler convention).
type PrismaClient = any
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { createLogger } from '../utils/logger'
import { dialogButtons, mainT } from '../i18n'

const log = createLogger('Migration')

/**
 * Load the generated PrismaClient at runtime via require to avoid Rollup's
 * static CJS named-export analysis failing on the generated client.
 */
function loadPrismaClient(): any {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return require(path.join(process.cwd(), 'src', 'generated', 'prisma')).PrismaClient
  }
  const prodPath = path.resolve(__dirname, '..', '..', '..', 'app.asar.unpacked', 'src', 'generated', 'prisma')
  return require(prodPath).PrismaClient
}

export class MigrationManager {
  private prisma: PrismaClient

  constructor() {
    const PrismaClient = loadPrismaClient()
    this.prisma = new PrismaClient()
  }

  /**
   * Check if database needs migration by testing for new schema fields
   */
  async needsMigration(): Promise<boolean> {
    try {
      log.info('[Migration] Checking if migration is needed...')
      
      // Get the correct database path based on environment
      const isDev = process.env.NODE_ENV === 'development'
      const dbPath = isDev
        ? path.join(process.cwd(), 'prisma', 'dev.db')
        : path.join(app.getPath('userData'), 'database.db')
      
      // On first run (database just created), skip migration check
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath)
        const ageInSeconds = (Date.now() - stats.birthtimeMs) / 1000
        
        // If database was created less than 10 seconds ago, it's likely first run
        if (ageInSeconds < 10) {
          log.info('[Migration] Database is brand new (first run), skipping migration check')
          return false
        }
      }
      
      const stockMovementTable = await this.prisma.$queryRawUnsafe(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='StockMovement' LIMIT 1"
      ) as Array<{ name: string }>
      if (stockMovementTable.length === 0) {
        log.info('[Migration] Legacy StockMovement table not present in this module build, skipping legacy migration check')
        return false
      }

      // Try to query fields that only exist in the legacy commerce schema.
      // This will throw if the table exists but the field does not.
      await this.prisma.$queryRaw`SELECT newStock FROM StockMovement LIMIT 1`
      
      log.info('[Migration] Database schema is up to date')
      return false
    } catch (error: any) {
      // Check if error is due to missing column (SQLite error)
      if (error.message?.includes('no such column') || error.message?.includes('newStock')) {
        log.info('[Migration] Migration needed: new fields detected')
        return true
      }
      
      // For other errors, log and assume no migration needed (likely first run)
      log.warn('[Migration] Error checking schema:', error.message)
      log.info('[Migration] Assuming first run or already up-to-date')
      return false
    }
  }

  /**
   * Create a backup of the database before migration
   */
  async backupDatabase(): Promise<string> {
    // Get the correct database path based on environment
    const isDev = process.env.NODE_ENV === 'development'
    const dbPath = isDev
      ? path.join(process.cwd(), 'prisma', 'dev.db')
      : path.join(app.getPath('userData'), 'database.db')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.dirname(dbPath)
    const backupPath = path.join(backupDir, `database.backup-${timestamp}`)

    log.info(`[Migration] Creating backup: ${dbPath} -> ${backupPath}`)

    try {
      // Ensure source exists
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at: ${dbPath}`)
      }

      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      // Copy database file
      fs.copyFileSync(dbPath, backupPath)
      
      log.info(`[Migration] ✅ Backup created successfully: ${backupPath}`)
      return backupPath
    } catch (error: any) {
      log.error('[Migration] ❌ Backup failed:', error)
      throw new Error(`Failed to backup database: ${error.message}`)
    }
  }

  /**
   * Run Prisma migrations on the database
   */
  async runMigrations(): Promise<void> {
    try {
      log.info('[Migration] 🔄 Running database migrations...')

      // Get the correct database path based on environment
      const isDev = process.env.NODE_ENV === 'development'
      const dbPath = isDev
        ? path.join(process.cwd(), 'prisma', 'dev.db')
        : path.join(app.getPath('userData'), 'database.db')
      
      // Normalize path for Windows (use forward slashes in URL)
      const normalizedDbPath = dbPath.replace(/\\/g, '/')
      const databaseUrl = `file:${normalizedDbPath}`

      if (app.isPackaged) {
        // Production: Use prisma migrate deploy
        const prismaPath = path.join(process.resourcesPath, 'prisma')
        
        log.info('[Migration] Running in production mode')
        log.info('[Migration] Platform:', process.platform)
        log.info('[Migration] Prisma path:', prismaPath)
        log.info('[Migration] Database URL:', databaseUrl)

        // Check if migrations folder exists
        const migrationsPath = path.join(prismaPath, 'migrations')
        if (fs.existsSync(migrationsPath)) {
          log.info('[Migration] Migrations folder found, running migrate deploy...')
          
          // Use cross-platform command
          const cmd = process.platform === 'win32' 
            ? 'npx.cmd prisma migrate deploy'
            : 'npx prisma migrate deploy'
          
          execSync(cmd, {
            cwd: prismaPath,
            stdio: 'inherit',
            env: {
              ...process.env,
              DATABASE_URL: databaseUrl
            },
            shell: true
          } as any)
        } else {
          log.info('[Migration] No migrations folder, using db push...')
          
          const cmd = process.platform === 'win32'
            ? 'npx.cmd prisma db push --accept-data-loss'
            : 'npx prisma db push --accept-data-loss'
          
          execSync(cmd, {
            cwd: prismaPath,
            stdio: 'inherit',
            env: {
              ...process.env,
              DATABASE_URL: databaseUrl
            },
            shell: true
          } as any)
        }
      } else {
        // Development: Use prisma db push
        log.info('[Migration] Running in development mode')
        log.info('[Migration] Using db push...')
        
        const cmd = process.platform === 'win32'
          ? 'npx.cmd prisma db push --accept-data-loss'
          : 'npx prisma db push --accept-data-loss'
        
        execSync(cmd, {
          stdio: 'inherit',
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl
          },
          shell: true
        } as any)
      }

      log.info('[Migration] ✅ Migrations completed successfully')
    } catch (error: any) {
      log.error('[Migration] ❌ Migration failed:', error)
      throw new Error(`Migration failed: ${error.message}`)
    }
  }

  /**
   * Validate migration by checking schema and data integrity
   */
  async validateMigration(): Promise<boolean> {
    try {
      log.info('[Migration] 🔍 Validating migration...')

      // Test 1: Check new schema fields exist
      await this.prisma.$queryRaw`SELECT newStock FROM StockMovement LIMIT 1`
      log.info('[Migration] ✅ New schema fields validated')

      // Test 2: Verify existing data is accessible
      const customerCount = await this.prisma.customer.count()
      const productCount = await this.prisma.product.count()
      const saleCount = await this.prisma.saleTransaction.count()

      log.info(`[Migration] ✅ Data integrity check:`)
      log.info(`  - ${customerCount} customers`)
      log.info(`  - ${productCount} products`)
      log.info(`  - ${saleCount} sales`)

      // Test 3: Basic query operations
      await this.prisma.user.findMany({ take: 1 })
      log.info('[Migration] ✅ Query operations validated')

      return true
    } catch (error: any) {
      log.error('[Migration] ❌ Validation failed:', error)
      return false
    }
  }

  /**
   * Restore database from backup if migration fails
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    // Get the correct database path based on environment
    const isDev = process.env.NODE_ENV === 'development'
    const dbPath = isDev
      ? path.join(process.cwd(), 'prisma', 'dev.db')
      : path.join(app.getPath('userData'), 'database.db')

    log.info(`[Migration] 🔄 Restoring from backup: ${backupPath}`)

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`)
      }

      // Close Prisma connection before restoring
      await this.prisma.$disconnect()

      // Restore backup
      fs.copyFileSync(backupPath, dbPath)

      log.info('[Migration] ✅ Database restored from backup successfully')
    } catch (error: any) {
      log.error('[Migration] ❌ Restore failed:', error)
      throw new Error(`Failed to restore database: ${error.message}`)
    }
  }

  /**
   * Main migration flow with user interaction
   */
  async migrateWithUI(mainWindow: BrowserWindow): Promise<boolean> {
    let backupPath: string | null = null

    try {
      log.info('[Migration] Starting migration process...')

      // Step 1: Check if migration is needed
      const needsMigration = await this.needsMigration()

      if (!needsMigration) {
        log.info('[Migration] ✅ Database is already up to date')
        return true
      }

      log.info('[Migration] Migration required, proceeding...')

      // Step 2: Notify renderer process
      mainWindow.webContents.send('migration:starting')

      // Step 3: Create backup
      try {
        backupPath = await this.backupDatabase()
      } catch (error: any) {
        log.error('[Migration] Failed to create backup:', error)
        throw new Error(mainT('migBackupFailed'))
      }

      // Step 4: Ask user for confirmation
      const requiredButtons = dialogButtons([mainT('migRequiredNow'), mainT('migRequiredExit')], {
        defaultIndex: 0,
        cancelIndex: 1
      })
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: mainT('migRequiredTitle'),
        message: mainT('migRequiredMessage'),
        detail: mainT('migRequiredDetail', { path: backupPath }),
        buttons: requiredButtons.buttons,
        defaultId: requiredButtons.defaultId,
        cancelId: requiredButtons.cancelId,
        noLink: true
      })

      if (response.response === requiredButtons.indexOf(1)) {
        log.info('[Migration] ❌ User cancelled migration')
        app.quit()
        return false
      }

      // Step 5: Run migrations
      log.info('[Migration] User approved, running migrations...')
      mainWindow.webContents.send('migration:running')
      
      await this.runMigrations()

      // Step 6: Validate
      log.info('[Migration] Validating migration...')
      mainWindow.webContents.send('migration:validating')
      
      const isValid = await this.validateMigration()

      if (!isValid) {
        throw new Error('Migration validation failed - database schema or data integrity check failed')
      }

      // Step 7: Success!
      log.info('[Migration] ✅ Migration completed successfully!')
      mainWindow.webContents.send('migration:completed')

      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: mainT('migDoneTitle'),
        message: mainT('migDoneMessage'),
        detail: mainT('migDoneDetail'),
        buttons: [mainT('migOk')]
      })

      return true
    } catch (error: any) {
      log.error('[Migration] ❌ Migration process failed:', error)

      // Notify renderer
      mainWindow.webContents.send('migration:failed', error.message)

      // Show error dialog with restore option
      const failedButtons = dialogButtons([mainT('migFailRestore'), mainT('migFailExit')], {
        defaultIndex: 0,
        cancelIndex: 1
      })
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: mainT('migFailTitle'),
        message: mainT('migFailMessage'),
        detail: mainT('migFailDetail', { error: error.message }),
        buttons: failedButtons.buttons,
        defaultId: failedButtons.defaultId,
        cancelId: failedButtons.cancelId
      })

      // Attempt to restore if user wants
      if (response.response === failedButtons.indexOf(0) && backupPath) {
        try {
          await this.restoreFromBackup(backupPath)

          await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: mainT('migRestoredTitle'),
            message: mainT('migRestoredMessage'),
            detail: mainT('migRestoredDetail'),
            buttons: [mainT('migOk')]
          })
        } catch (restoreError: any) {
          log.error('[Migration] ❌ Restore also failed:', restoreError)

          await dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: mainT('migCriticalTitle'),
            message: mainT('migCriticalMessage'),
            detail: mainT('migCriticalDetail', {
              error: error.message,
              restoreError: restoreError.message,
              path: backupPath ?? ''
            }),
            buttons: [mainT('migOk')]
          })
        }
      }

      app.quit()
      return false
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect()
      log.info('[Migration] Cleanup completed')
    } catch (error) {
      log.error('[Migration] Cleanup error:', error)
    }
  }
}
