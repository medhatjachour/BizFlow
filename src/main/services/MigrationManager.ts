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
import { getDatabasePath } from '../database/init'

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
  private dbPath: string

  private isCleanedUp = false

  constructor() {
    const PrismaClient = getPrismaClient()
    this.dbPath = getDatabasePath()
    
    console.log('[Migration] Using database:', this.dbPath)
    
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${this.dbPath}`
        }
      }
    })
  }

  /**
   * Initialize migration tracking table
   * Creates _prisma_migrations table to track which migrations have been applied
   */
  private async initMigrationTable(): Promise<void> {
    try {
      // Create migrations tracking table if it doesn't exist
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
          "id" TEXT PRIMARY KEY NOT NULL,
          "checksum" TEXT NOT NULL,
          "finished_at" DATETIME,
          "migration_name" TEXT NOT NULL,
          "logs" TEXT,
          "rolled_back_at" DATETIME,
          "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "applied_steps_count" INTEGER NOT NULL DEFAULT 0
        )
      `)
      
      // Create index for faster lookups
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "_prisma_migrations_migration_name_idx" 
        ON "_prisma_migrations"("migration_name")
      `)
      
      console.log('[Migration] Migration tracking table initialized')
    } catch (error: any) {
      // Ignore if table already exists
      if (!error.message?.includes('already exists')) {
        console.warn('[Migration] Warning initializing migration table:', error.message)
      }
    }
  }

  /**
   * Check if a specific migration has been applied
   */
  private async isMigrationApplied(migrationName: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "_prisma_migrations" 
        WHERE migration_name = ${migrationName}
        AND finished_at IS NOT NULL
      `
      
      const count = Number(result[0]?.count || 0)
      // Debug logging
      if (process.env.DEBUG_MIGRATIONS) {
        console.log(`[Migration] Check ${migrationName}: count=${count}, result=`, result[0])
      }
      return count > 0
    } catch (error: any) {
      // If table doesn't exist, no migrations have been applied
      if (error.message?.includes('no such table')) {
        return false
      }
      console.error(`[Migration] Error checking if migration applied (${migrationName}):`, error.message)
      throw error
    }
  }

  /**
   * Mark a migration as applied
   */
  private async markMigrationApplied(migrationName: string): Promise<void> {
    const id = require('crypto').randomUUID()
    const checksum = require('crypto')
      .createHash('md5')
      .update(migrationName)
      .digest('hex')
    
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (
        id, checksum, migration_name, finished_at, applied_steps_count
      ) VALUES (
        '${id}', '${checksum}', '${migrationName}', datetime('now'), 1
      )
    `)
  }

  /**
   * Parse SQL statements properly handling PRAGMA blocks and multi-line statements
   * SQLite migrations often have PRAGMA ... ON/OFF blocks that must be executed together
   */
  private parseSQLStatements(sql: string): string[] {
    const statements: string[] = []
    let currentStatement = ''
    let inPragmaBlock = false
    
    // Split by lines to handle PRAGMA blocks
    const lines = sql.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip comments and empty lines
      if (trimmed.startsWith('--') || trimmed.length === 0) {
        continue
      }
      
      // Detect PRAGMA blocks
      if (trimmed.startsWith('PRAGMA')) {
        if (trimmed.includes('=OFF') || trimmed.includes('= OFF')) {
          // Start of PRAGMA block (disabling constraints)
          inPragmaBlock = true
          // If we have a pending statement, save it first
          if (currentStatement.trim()) {
            statements.push(currentStatement.trim())
            currentStatement = ''
          }
        }
        currentStatement += line + '\n'
        
        if (trimmed.includes('=ON') || trimmed.includes('= ON')) {
          // End of PRAGMA block (re-enabling constraints)
          inPragmaBlock = false
          statements.push(currentStatement.trim())
          currentStatement = ''
        }
        continue
      }
      
      // Add line to current statement
      currentStatement += line + '\n'
      
      // If we're in a PRAGMA block, don't split on semicolon
      if (inPragmaBlock) {
        continue
      }
      
      // Check if line ends with semicolon (end of statement)
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement.trim())
        currentStatement = ''
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim())
    }
    
    return statements.filter(s => s.length > 0)
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
   * Check if database needs migration by comparing applied vs available migrations
   */
  async needsMigration(): Promise<boolean> {
    try {
      console.log('[Migration] Checking if migration is needed...')
      console.log('[Migration] Database path:', this.dbPath)
      
      // If database doesn't exist, no migration needed (will be created from template)
      if (!fs.existsSync(this.dbPath)) {
        console.log('[Migration] Database does not exist yet, will be created from template')
        return false
      }
      
      // Check database file size - if it's very small, it's probably just created from template
      const stats = fs.statSync(this.dbPath)
      if (stats.size < 10000) { // Less than 10KB means likely empty or just initialized
        console.log('[Migration] Database is new/empty, no migration needed')
        return false
      }
      
      // Initialize migration tracking table
      await this.initMigrationTable()
      
      // Get list of available migrations
      const isDev = process.env.NODE_ENV === 'development'
      const migrationsPath = isDev 
        ? path.join(process.cwd(), 'prisma', 'migrations')
        : path.join(process.resourcesPath, 'prisma', 'migrations')
      
      if (!fs.existsSync(migrationsPath)) {
        console.log('[Migration] No migrations folder found at:', migrationsPath)
        return false
      }
      
      console.log('[Migration] Migrations path:', migrationsPath)
      
      // Get all migration directories
      const availableMigrations = fs.readdirSync(migrationsPath)
        .filter(f => fs.statSync(path.join(migrationsPath, f)).isDirectory())
        .sort()
      
      console.log(`[Migration] Found ${availableMigrations.length} available migrations`)
      
      // Check if any migrations haven't been applied yet
      let unappliedCount = 0
      for (const migration of availableMigrations) {
        const isApplied = await this.isMigrationApplied(migration)
        if (!isApplied) {
          console.log(`[Migration] Unapplied migration found: ${migration}`)
          unappliedCount++
        }
      }
      
      if (unappliedCount > 0) {
        console.log(`[Migration] ${unappliedCount} migration(s) need to be applied`)
        return true
      }
      
      console.log('[Migration] All migrations are up to date')
      return false
      
    } catch (error: any) {
      // If we can't connect or check, assume no migration needed
      console.warn('[Migration] Error checking migration status:', error.message)
      return false
    }
  }

  /**
   * Create a backup of the database before migration
   */
  async backupDatabase(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${this.dbPath}.backup-${timestamp}`

    console.log(`[Migration] Creating backup: ${this.dbPath} -> ${backupPath}`)

    try {
      // Ensure source exists
      if (!fs.existsSync(this.dbPath)) {
        throw new Error(`Database file not found at: ${this.dbPath}`)
      }

      // Copy database file
      fs.copyFileSync(this.dbPath, backupPath)
      
      console.log(`[Migration] ✅ Backup created successfully: ${backupPath}`)
      return backupPath
    } catch (error: any) {
      console.error('[Migration] ❌ Backup failed:', error)
      throw new Error(`Failed to backup database: ${error.message}`)
    }
  }

  /**
   * Run Prisma migrations on the database
   * Only applies migrations that haven't been applied yet
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('[Migration] 🔄 Running database migrations...')

      const dbPath = path.join(app.getPath('userData'), 'database.db')
      const isDev = process.env.NODE_ENV === 'development'
      
      // Both dev and production now use SQL file approach (no npx!)
      console.log(`[Migration] Running in ${isDev ? 'development' : 'production'} mode`)
      console.log('[Migration] Applying migrations from SQL files...')
      
      const migrationsPath = isDev
        ? path.join(process.cwd(), 'prisma', 'migrations')
        : path.join(process.resourcesPath, 'prisma', 'migrations')
      
      console.log('[Migration] Migrations path:', migrationsPath)
      
      if (!fs.existsSync(migrationsPath)) {
        console.log('[Migration] ⚠️ No migrations folder found')
        throw new Error('Migrations folder not found')
      }

      // Ensure migration tracking table exists
      await this.initMigrationTable()

      // Get all migration directories sorted by timestamp
      const migrationDirs = fs.readdirSync(migrationsPath)
        .filter(f => fs.statSync(path.join(migrationsPath, f)).isDirectory())
        .sort()
      
      console.log(`[Migration] Found ${migrationDirs.length} total migrations`)

        let appliedCount = 0
        let skippedCount = 0

        // Apply each migration SQL file (only if not already applied)
        for (const migDir of migrationDirs) {
          // Check if this migration was already applied
          const isApplied = await this.isMigrationApplied(migDir)
          
          if (isApplied) {
            console.log(`[Migration] ⏭️  Skipping already applied: ${migDir}`)
            skippedCount++
            continue
          }

          const sqlFile = path.join(migrationsPath, migDir, 'migration.sql')
          
          if (fs.existsSync(sqlFile)) {
            console.log(`[Migration] ▶️  Applying: ${migDir}`)
            const sql = fs.readFileSync(sqlFile, 'utf-8')
            
            try {
              // Parse SQL statements properly (handle PRAGMA blocks and multi-line statements)
              const statements = this.parseSQLStatements(sql)
              
              console.log(`[Migration]    Found ${statements.length} SQL statements`)
              
              let successCount = 0
              let hasRealFailure = false
              
              for (let i = 0; i < statements.length; i++) {
                const statement = statements[i]
                if (statement.trim()) {
                  try {
                    await this.prisma.$executeRawUnsafe(statement)
                    successCount++
                    console.log(`[Migration]    ✅ Statement ${i + 1}/${statements.length} executed`)
                  } catch (error: any) {
                    // Log the specific statement that failed
                    console.error(`[Migration]    ❌ Statement ${i + 1} failed:`, error.message)
                    console.error(`[Migration]    Statement: ${statement.substring(0, 100)}...`)
                    
                    // If error is "already exists", continue (idempotent)
                    if (error.message?.includes('already exists') || 
                        error.message?.includes('duplicate column name') ||
                        error.message?.includes('duplicate key') ||
                        error.message?.includes('UNIQUE constraint')) {
                      console.warn(`[Migration]    ⚠️  Already exists, continuing...`)
                      successCount++
                      continue
                    }
                    
                    // For other errors, this is a real failure
                    hasRealFailure = true
                    throw error
                  }
                }
              }
              
              // Only mark migration as applied if no real failures occurred
              if (!hasRealFailure) {
                await this.markMigrationApplied(migDir)
                appliedCount++
                console.log(`[Migration] ✅ Successfully applied: ${migDir} (${successCount}/${statements.length} statements)`)
              } else {
                console.error(`[Migration] ❌ Migration ${migDir} had failures, not marking as applied`)
              }
              
            } catch (error: any) {
              console.error(`[Migration] ❌ Failed to apply ${migDir}:`, error.message)
              throw error
            }
          } else {
            console.warn(`[Migration] ⚠️  No migration.sql found for: ${migDir}`)
          }
        }

        console.log(`[Migration] ✅ Migration complete: ${appliedCount} applied, ${skippedCount} skipped`)
        
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
}
