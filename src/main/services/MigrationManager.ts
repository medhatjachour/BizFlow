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
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

// Load Prisma from correct location
function getPrismaClient() {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    return require('@prisma/client').PrismaClient
  } else {
    // Production: load from resources (outside asar)
    const prismaClientPath = path.join(process.resourcesPath, 'node_modules', '@prisma', 'client')
    return require(prismaClientPath).PrismaClient
  }
}

export class MigrationManager {
  private prisma: any

  private isCleanedUp = false

  constructor() {
    const PrismaClient = getPrismaClient()
    this.prisma = new PrismaClient()
  }

  /**
   * Cleanup Prisma client on app exit
   */
  async cleanup(): Promise<void> {
    if (this.isCleanedUp) {
      console.log('[Migration] Already cleaned up, skipping')
      return
    }

    try {
      console.log('[Migration] Cleaning up Prisma client...')
      
      // Disconnect with timeout to prevent hanging
      await Promise.race([
        this.prisma.$disconnect(),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ])
      
      this.isCleanedUp = true
      console.log('[Migration] ✅ Cleanup complete')
    } catch (error: any) {
      console.warn('[Migration] ⚠️ Cleanup error (non-critical):', error?.message)
      this.isCleanedUp = true
    }
  }

  /**
   * Check if database needs migration by testing for new schema fields
   */
  async needsMigration(): Promise<boolean> {
    try {
      console.log('[Migration] Checking if migration is needed...')
      
      // Try to query fields that only exist in new schema
      // This will throw if the fields don't exist
      await this.prisma.$queryRaw`SELECT newStock FROM StockMovement LIMIT 1`
      
      console.log('[Migration] Database schema is up to date')
      return false
    } catch (error: any) {
      // Check if error is due to missing column (SQLite error)
      if (error.message?.includes('no such column') || error.message?.includes('newStock')) {
        console.log('[Migration] Migration needed: new fields detected')
        return true
      }
      
      // For other errors, log and assume migration needed to be safe
      console.warn('[Migration] Error checking schema, assuming migration needed:', error.message)
      return true
    }
  }

  /**
   * Create a backup of the database before migration
   */
  async backupDatabase(): Promise<string> {
    const dbPath = path.join(app.getPath('userData'), 'database.db')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(
      app.getPath('userData'),
      `database.db.backup-${timestamp}`
    )

    console.log(`[Migration] Creating backup: ${dbPath} -> ${backupPath}`)

    try {
      // Ensure source exists
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at: ${dbPath}`)
      }

      // Copy database file
      fs.copyFileSync(dbPath, backupPath)
      
      console.log(`[Migration] ✅ Backup created successfully: ${backupPath}`)
      return backupPath
    } catch (error: any) {
      console.error('[Migration] ❌ Backup failed:', error)
      throw new Error(`Failed to backup database: ${error.message}`)
    }
  }

  /**
   * Run Prisma migrations on the database
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('[Migration] 🔄 Running database migrations...')

      const dbPath = path.join(app.getPath('userData'), 'database.db')
      // Normalize path for Windows (use forward slashes in URL)
      const normalizedDbPath = dbPath.replace(/\\/g, '/')
      const databaseUrl = `file:${normalizedDbPath}`

      if (app.isPackaged) {
        // Production: Use prisma migrate deploy
        const prismaPath = path.join(process.resourcesPath, 'prisma')
        
        console.log('[Migration] Running in production mode')
        console.log('[Migration] Platform:', process.platform)
        console.log('[Migration] Prisma path:', prismaPath)
        console.log('[Migration] Database URL:', databaseUrl)

        // Check if migrations folder exists
        const migrationsPath = path.join(prismaPath, 'migrations')
        if (fs.existsSync(migrationsPath)) {
          console.log('[Migration] Migrations folder found, running migrate deploy...')
          
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
          console.log('[Migration] No migrations folder, using db push...')
          
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
        console.log('[Migration] Running in development mode')
        console.log('[Migration] Using db push...')
        
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

      console.log('[Migration] ✅ Migrations completed successfully')
    } catch (error: any) {
      console.error('[Migration] ❌ Migration failed:', error)
      throw new Error(`Migration failed: ${error.message}`)
    }
  }

  /**
   * Validate migration by checking schema and data integrity
   */
  async validateMigration(): Promise<boolean> {
    try {
      console.log('[Migration] 🔍 Validating migration...')

      // Test 1: Check new schema fields exist
      await this.prisma.$queryRaw`SELECT newStock FROM StockMovement LIMIT 1`
      console.log('[Migration] ✅ New schema fields validated')

      // Test 2: Verify existing data is accessible
      const customerCount = await this.prisma.customer.count()
      const productCount = await this.prisma.product.count()
      const saleCount = await this.prisma.saleTransaction.count()

      console.log(`[Migration] ✅ Data integrity check:`)
      console.log(`  - ${customerCount} customers`)
      console.log(`  - ${productCount} products`)
      console.log(`  - ${saleCount} sales`)

      // Test 3: Basic query operations
      await this.prisma.user.findMany({ take: 1 })
      console.log('[Migration] ✅ Query operations validated')

      return true
    } catch (error: any) {
      console.error('[Migration] ❌ Validation failed:', error)
      return false
    }
  }

  /**
   * Restore database from backup if migration fails
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    const dbPath = path.join(app.getPath('userData'), 'prisma', 'dev.db')

    console.log(`[Migration] 🔄 Restoring from backup: ${backupPath}`)

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`)
      }

      // Close Prisma connection before restoring
      await this.prisma.$disconnect()

      // Restore backup
      fs.copyFileSync(backupPath, dbPath)

      console.log('[Migration] ✅ Database restored from backup successfully')
    } catch (error: any) {
      console.error('[Migration] ❌ Restore failed:', error)
      throw new Error(`Failed to restore database: ${error.message}`)
    }
  }

  /**
   * Main migration flow with user interaction
   */
  async migrateWithUI(mainWindow: BrowserWindow): Promise<boolean> {
    let backupPath: string | null = null

    try {
      console.log('[Migration] Starting migration process...')

      // Step 1: Check if migration is needed
      const needsMigration = await this.needsMigration()

      if (!needsMigration) {
        console.log('[Migration] ✅ Database is already up to date')
        return true
      }

      console.log('[Migration] Migration required, proceeding...')

      // Step 2: Notify renderer process
      mainWindow.webContents.send('migration:starting')

      // Step 3: Create backup
      try {
        backupPath = await this.backupDatabase()
      } catch (error: any) {
        console.error('[Migration] Failed to create backup:', error)
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
        console.log('[Migration] ❌ User cancelled migration')
        app.quit()
        return false
      }

      // Step 5: Run migrations
      console.log('[Migration] User approved, running migrations...')
      mainWindow.webContents.send('migration:running')
      
      await this.runMigrations()

      // Step 6: Validate
      console.log('[Migration] Validating migration...')
      mainWindow.webContents.send('migration:validating')
      
      const isValid = await this.validateMigration()

      if (!isValid) {
        throw new Error('Migration validation failed - database schema or data integrity check failed')
      }

      // Step 7: Success!
      console.log('[Migration] ✅ Migration completed successfully!')
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
      console.error('[Migration] ❌ Migration process failed:', error)

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
          console.error('[Migration] ❌ Restore also failed:', restoreError)

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
      console.log('[Migration] Cleanup completed')
    } catch (error) {
      console.error('[Migration] Cleanup error:', error)
    }
  }
}
