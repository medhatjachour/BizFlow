/**
 * Database initialization
 * Uses Electron's userData directory for proper cross-platform support
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { app } from 'electron'

/**
 * Get database path based on environment
 */
export function getDatabasePath(): string {
  const isDev = process.env.NODE_ENV === 'development'
  return isDev 
    ? path.resolve(process.cwd(), 'bizflow.db')
    : path.join(app.getPath('userData'), 'database.db')
}

/**
 * Initialize database file and directory structure
 * Creates empty database on first run
 */
export async function initializeDatabase(): Promise<void> {
  const dbPath = getDatabasePath()
  const dbDir = path.dirname(dbPath)

  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    console.log('[DB Init] Creating database directory:', dbDir)
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Create empty database file if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    console.log('[DB Init] Creating new database file:', dbPath)
    fs.writeFileSync(dbPath, '')
  }

  console.log('[DB Init] ✓ Database initialized at:', dbPath)
}
