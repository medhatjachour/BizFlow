/**
 * Simplified Migration Manager using better-sqlite3
 * 
 * Handles SQL migrations with proper PRAGMA support
 * Much simpler than Prisma-based approach
 */

import { app, dialog, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { getDatabase, closeDatabase } from '../database/sqlite'
import type Database from 'better-sqlite3'

export class SimpleMigrationManager {
  private db: Database.Database

  constructor() {
    this.db = getDatabase()
  }

  /**
   * Check if database has actual schema (not just tracking table)
   */
  private hasSchema(): boolean {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT IN ('_prisma_migrations', 'sqlite_sequence')
    `).get() as { count: number }
    
    return result.count > 0
  }

  /**
   * Initialize migration tracking table
   */
  private initMigrationTable(): void {
    this.db.exec(`
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
    
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS "_prisma_migrations_migration_name_idx" 
      ON "_prisma_migrations"("migration_name")
    `)
    
    console.log('[Migration] Tracking table initialized')
    
    // If database has no schema but has migration records, reset them
    if (!this.hasSchema()) {
      const migrationCount = this.db.prepare(
        'SELECT COUNT(*) as count FROM "_prisma_migrations"'
      ).get() as { count: number }
      
      if (migrationCount.count > 0) {
        console.log('[Migration] ⚠️  Database has no schema but has migration records - resetting')
        this.db.exec('DELETE FROM "_prisma_migrations"')
      }
    }
  }

  /**
   * Check if a migration has been applied
   */
  private isMigrationApplied(migrationName: string): boolean {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM "_prisma_migrations" 
      WHERE migration_name = ? AND finished_at IS NOT NULL
    `).get(migrationName) as { count: number }
    
    return result.count > 0
  }

  /**
   * Mark a migration as applied
   */
  private markMigrationApplied(migrationName: string): void {
    const id = `${Date.now()}-${migrationName}`
    const now = new Date().toISOString()
    
    this.db.prepare(`
      INSERT INTO "_prisma_migrations" 
      (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, '', now, migrationName, now, 1)
  }

  /**
   * Get list of unapplied migrations
   */
  getUnappliedMigrations(): string[] {
    const isDev = process.env.NODE_ENV === 'development'
    const migrationsPath = isDev 
      ? path.join(process.cwd(), 'prisma', 'migrations')
      : path.join(process.resourcesPath, 'prisma', 'migrations')

    if (!fs.existsSync(migrationsPath)) {
      console.log('[Migration] No migrations folder found')
      return []
    }

    this.initMigrationTable()

    const availableMigrations = fs.readdirSync(migrationsPath)
      .filter(f => fs.statSync(path.join(migrationsPath, f)).isDirectory())
      .sort()

    const unapplied = availableMigrations.filter(
      migration => !this.isMigrationApplied(migration)
    )

    console.log(`[Migration] Found ${unapplied.length} unapplied migrations`)
    return unapplied
  }

  /**
   * Apply a single migration
   */
  private applyMigration(migrationName: string): void {
    const isDev = process.env.NODE_ENV === 'development'
    const migrationPath = isDev
      ? path.join(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql')
      : path.join(process.resourcesPath, 'prisma', 'migrations', migrationName, 'migration.sql')

    console.log(`[Migration] Applying: ${migrationName}`)

    const sql = fs.readFileSync(migrationPath, 'utf-8')
    
    try {
      // better-sqlite3 handles PRAGMA blocks correctly with exec()
      this.db.exec(sql)
      this.markMigrationApplied(migrationName)
      console.log(`[Migration] ✓ Applied: ${migrationName}`)
    } catch (error: any) {
      // If error is "already exists", it's idempotent - continue
      if (error.message?.includes('already exists')) {
        console.log(`[Migration] ⚠ Table exists (idempotent): ${migrationName}`)
        this.markMigrationApplied(migrationName)
      } else {
        throw error
      }
    }
  }

  /**
   * Create default setup user if no users exist
   */
  private async createDefaultUser(): Promise<void> {
    try {
      // Check if User table exists
      const tableExists = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name='User'
      `).get() as { count: number }
      
      if (tableExists.count === 0) {
        console.log('[Migration] User table does not exist yet')
        return
      }

      // Check if any users exist
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM User').get() as { count: number }
      
      if (userCount.count > 0) {
        console.log('[Migration] Users already exist')
        return
      }

      console.log('[Migration] Creating default setup user...')
      
      const bcrypt = await import('bcryptjs')
      const crypto = await import('crypto')
      
      const passwordHash = await bcrypt.default.hash('setup123', 10)
      const userId = crypto.randomUUID()
      
      this.db.prepare(`
        INSERT INTO User (id, username, passwordHash, role, fullName, email, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        'setup',
        passwordHash,
        'admin',
        'Setup Administrator',
        'setup@bizflow.local',
        1,
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      console.log('[Migration] ✅ Default setup user created')
      console.log('[Migration] 📝 Login: username="setup", password="setup123"')
      console.log('[Migration] ⚠️  SECURITY: Change this password after first login!')
      
    } catch (error: any) {
      console.error('[Migration] ⚠️  Failed to create setup user:', error.message)
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    const unapplied = this.getUnappliedMigrations()
    
    if (unapplied.length === 0) {
      console.log('[Migration] ✅ All migrations up to date')
      // Still check and create default user if needed
      await this.createDefaultUser()
      return
    }

    console.log(`[Migration] Running ${unapplied.length} migrations...`)

    // Use transaction for all migrations
    const applyAll = this.db.transaction(() => {
      for (const migration of unapplied) {
        this.applyMigration(migration)
      }
    })

    try {
      applyAll()
      console.log('[Migration] ✅ All migrations applied successfully')
      
      // Create default user after successful migration
      await this.createDefaultUser()
      
    } catch (error: any) {
      console.error('[Migration] ❌ Migration failed:', error.message)
      throw error
    }
  }

  /**
   * Check if migrations are needed
   */
  needsMigration(): boolean {
    const unapplied = this.getUnappliedMigrations()
    return unapplied.length > 0
  }

  /**
   * Create backup before migration
   */
  async createBackup(dbPath: string): Promise<string> {
    const backupPath = `${dbPath}.backup-${Date.now()}`
    fs.copyFileSync(dbPath, backupPath)
    console.log(`[Migration] Backup created: ${backupPath}`)
    return backupPath
  }

  /**
   * Main migration flow with UI
   */
  async migrateWithUI(mainWindow: BrowserWindow): Promise<boolean> {
    try {
      if (!this.needsMigration()) {
        return true
      }

      const unapplied = this.getUnappliedMigrations()
      
      // Ask user permission
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Database Update Required',
        message: `${unapplied.length} database update(s) need to be applied.`,
        detail: 'This will update your database to the latest version. A backup will be created automatically.',
        buttons: ['Update Now', 'Cancel'],
        defaultId: 0,
        cancelId: 1
      })

      if (response.response !== 0) {
        console.log('[Migration] User cancelled migration')
        return false
      }

      // Create backup
      const dbPath = this.db.name
      await this.createBackup(dbPath)

      // Run migrations
      await this.runMigrations()

      // Show success
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Complete',
        message: 'Database updated successfully!',
        buttons: ['OK']
      })

      return true

    } catch (error: any) {
      console.error('[Migration] Migration failed:', error)
      
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Failed',
        message: 'Database update failed',
        detail: error.message,
        buttons: ['OK']
      })

      return false
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    closeDatabase()
  }
}

export default SimpleMigrationManager
