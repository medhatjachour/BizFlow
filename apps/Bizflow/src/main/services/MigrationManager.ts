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
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { createLogger } from '../utils/logger'

const log = createLogger('Migration')

export class MigrationManager {
  private prisma: PrismaClient

  constructor() {
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
      
      // Try to query fields that only exist in new schema
      // This will throw if the fields don't exist
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
        throw new Error('Cannot proceed without backup. Please ensure you have write permissions.')
      }

      // Step 4: Ask user for confirmation
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Database Update Required',
        message: 'This new version requires updating your database.',
        detail: `Your data will be preserved. A backup has been created automatically.\n\nBackup location: ${backupPath}\n\nThis may take a few moments. Do not close the application during this process.`,
        buttons: ['Update Now', 'Exit'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      })

      if (response.response === 1) {
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
        title: 'Update Complete',
        message: 'Your database has been successfully updated!',
        detail: 'All your data has been preserved and the application is ready to use.',
        buttons: ['OK']
      })

      return true
    } catch (error: any) {
      log.error('[Migration] ❌ Migration process failed:', error)

      // Notify renderer
      mainWindow.webContents.send('migration:failed', error.message)

      // Show error dialog with restore option
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Failed',
        message: 'The database update failed.',
        detail: `Error: ${error.message}\n\nWould you like to restore from the backup? Your data will be safe and you can try updating again later.`,
        buttons: ['Restore Backup', 'Exit'],
        defaultId: 0,
        cancelId: 1
      })

      // Attempt to restore if user wants
      if (response.response === 0 && backupPath) {
        try {
          await this.restoreFromBackup(backupPath)

          await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Backup Restored',
            message: 'Your database has been restored to its previous state.',
            detail: 'Please contact support before trying to update again.',
            buttons: ['OK']
          })
        } catch (restoreError: any) {
          log.error('[Migration] ❌ Restore also failed:', restoreError)

          await dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Critical Error',
            message: 'Failed to restore backup.',
            detail: `Original error: ${error.message}\nRestore error: ${restoreError.message}\n\nBackup location: ${backupPath}\n\nPlease restore manually or contact support.`,
            buttons: ['OK']
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
