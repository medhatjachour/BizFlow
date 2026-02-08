/**
 * Better-SQLite3 Database Service
 * 
 * Provides a simple, fast, synchronous SQLite interface
 * Replaces Prisma for better performance and simpler packaging
 */

import Database from 'better-sqlite3'
import { getDatabasePath } from './init'

let dbInstance: Database.Database | null = null

/**
 * Initialize and return the database connection
 * Uses singleton pattern - only one connection per app instance
 */
export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = getDatabasePath()
  console.log('[SQLite] Connecting to database:', dbPath)

  dbInstance = new Database(dbPath, {
    verbose: process.env.DEBUG_SQL ? console.log : undefined
  })

  // Enable WAL mode for better concurrency
  dbInstance.pragma('journal_mode = WAL')
  
  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON')
  
  // Set synchronous mode to NORMAL for better performance (still safe with WAL)
  dbInstance.pragma('synchronous = NORMAL')

  console.log('[SQLite] ✓ Database connected successfully')
  
  return dbInstance
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close()
      dbInstance = null
      console.log('[SQLite] Database connection closed')
    } catch (error) {
      console.error('[SQLite] Error closing database:', error)
    }
  }
}

/**
 * Helper query functions
 */
export const db = {
  /**
   * Execute a SELECT query and return all matching rows
   */
  query: <T = any>(sql: string, params: any[] = []): T[] => {
    const database = getDatabase()
    const stmt = database.prepare(sql)
    return stmt.all(...params) as T[]
  },

  /**
   * Execute a SELECT query and return the first matching row
   */
  queryOne: <T = any>(sql: string, params: any[] = []): T | null => {
    const database = getDatabase()
    const stmt = database.prepare(sql)
    const result = stmt.get(...params) as T | undefined
    return result || null
  },

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  execute: (sql: string, params: any[] = []): Database.RunResult => {
    const database = getDatabase()
    const stmt = database.prepare(sql)
    return stmt.run(...params)
  },

  /**
   * Execute multiple statements in a transaction
   * Automatically rolls back on error
   */
  transaction: <T>(fn: () => T): () => T => {
    const database = getDatabase()
    return database.transaction(fn)
  },

  /**
   * Get count of rows matching condition
   */
  count: (table: string, where: string = '1=1', params: any[] = []): number => {
    const database = getDatabase()
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
    const stmt = database.prepare(sql)
    const result = stmt.get(...params) as { count: number }
    return result.count
  },

  /**
   * Check if a row exists
   */
  exists: (table: string, where: string, params: any[] = []): boolean => {
    return db.count(table, where, params) > 0
  }
}
