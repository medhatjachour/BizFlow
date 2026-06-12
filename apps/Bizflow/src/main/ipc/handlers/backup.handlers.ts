/**
 * Backup & Restore IPC Handlers
 * Handles local database backup and restore operations
 */

import { ipcMain, dialog } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { getDatabasePath } from '../../database/init'
import { createLogger } from '../../utils/logger'

const log = createLogger('Backup')

// ---------------------------------------------------------------------------
// Registry helpers
// A single JSON file in userData tracks every backup ever created by this app,
// regardless of where on disk each file was saved.
// ---------------------------------------------------------------------------

type RegistryEntry = {
  filename: string
  path: string
  size: number
  createdAt: string
}

type Registry = { backups: RegistryEntry[] }

const getRegistryPath = (): string =>
  path.join(app.getPath('userData'), 'backup-registry.json')

const readRegistry = async (): Promise<Registry> => {
  try {
    const raw = await fs.readFile(getRegistryPath(), 'utf-8')
    return JSON.parse(raw) as Registry
  } catch {
    return { backups: [] }
  }
}

const writeRegistry = async (registry: Registry): Promise<void> => {
  await fs.writeFile(getRegistryPath(), JSON.stringify(registry, null, 2), 'utf-8')
}

const addToRegistry = async (entry: RegistryEntry): Promise<void> => {
  const registry = await readRegistry()
  registry.backups.unshift(entry) // newest first
  await writeRegistry(registry)
}

const removeFromRegistry = async (backupPath: string): Promise<void> => {
  const registry = await readRegistry()
  registry.backups = registry.backups.filter((b) => b.path !== backupPath)
  await writeRegistry(registry)
}

// ---------------------------------------------------------------------------

// Format date for backup filename
const formatBackupFilename = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  return `backup-${year}${month}${day}-${hour}${minute}${second}.db`
}

/**
 * Create Database Backup
 * Saves the file to the user-chosen directory and registers it globally.
 */
ipcMain.handle('backup:create', async (_event, options?: { customPath?: string }) => {
  try {
    const dbPath = getDatabasePath()

    try {
      await fs.access(dbPath)
    } catch {
      return { success: false, error: `Database file not found at: ${dbPath}` }
    }

    // Destination folder — must be provided (UI always asks the user first)
    const destDir = options?.customPath
    if (!destDir) {
      return { success: false, error: 'No destination folder provided' }
    }

    // Ensure destination exists
    await fs.mkdir(destDir, { recursive: true })

    const backupFilename = formatBackupFilename()
    const backupPath = path.join(destDir, backupFilename)

    await fs.copyFile(dbPath, backupPath)
    const stats = await fs.stat(backupPath)
    const createdAt = new Date().toISOString()

    const entry: RegistryEntry = {
      filename: backupFilename,
      path: backupPath,
      size: stats.size,
      createdAt
    }

    await addToRegistry(entry)

    log.info(`Backup created and registered: ${backupPath}`)
    return { success: true, data: entry }
  } catch (error) {
    log.error('Backup creation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create backup'
    }
  }
})

/**
 * List All Backups (registry-based, cross-location)
 * Each entry includes a `missing` flag if the file no longer exists on disk.
 */
ipcMain.handle('backup:list', async () => {
  try {
    const registry = await readRegistry()

    const backups = await Promise.all(
      registry.backups.map(async (entry) => {
        let missing = false
        let size = entry.size
        try {
          const stats = await fs.stat(entry.path)
          size = stats.size
        } catch {
          missing = true
        }
        return { ...entry, size, missing }
      })
    )

    return { success: true, data: { backups } }
  } catch (error) {
    log.error('Failed to list backups:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list backups'
    }
  }
})

/**
 * Restore Database from Backup
 */
ipcMain.handle('backup:restore', async (_event, backupPath: string) => {
  try {
    // Verify backup file exists
    try {
      await fs.access(backupPath)
    } catch {
      return {
        success: false,
        error: 'Backup file not found'
      }
    }

    // Get current database path using centralized function
    const dbPath = getDatabasePath()
    const dbDir = path.dirname(dbPath)
    
    // Create a backup of current database before restoring
    const emergencyBackupPath = path.join(
      dbDir,
      `emergency-backup-${Date.now()}.db`
    )
    
    try {
      await fs.copyFile(dbPath, emergencyBackupPath)
    } catch (error) {
      log.warn('Failed to create emergency backup:', error)
    }
    
    // Replace current database with backup
    // Note: The application should be restarted after restore for changes to take effect
    await fs.copyFile(backupPath, dbPath)
    
    return {
      success: true,
      data: {
        restoredFrom: backupPath,
        emergencyBackup: emergencyBackupPath
      }
    }
  } catch (error) {
    log.error('Restore failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore backup'
    }
  }
})

/**
 * Delete Backup File + remove from registry
 */
ipcMain.handle('backup:delete', async (_event, backupPath: string) => {
  try {
    // Try to delete the file (it might already be missing from disk)
    try {
      await fs.unlink(backupPath)
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') throw e // re-throw unexpected errors
      // file was already gone — that's fine, still remove from registry
    }

    await removeFromRegistry(backupPath)

    return { success: true, data: { deleted: backupPath } }
  } catch (error) {
    log.error('Failed to delete backup:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete backup'
    }
  }
})

/**
 * Select Backup Directory
 */
ipcMain.handle('backup:select-directory', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Backup Location'
    })
    
    if (result.canceled || !result.filePaths[0]) {
      return {
        success: false,
        error: 'No directory selected'
      }
    }
    
    return {
      success: true,
      data: { path: result.filePaths[0] }
    }
  } catch (error) {
    log.error('Failed to select directory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to select directory'
    }
  }
})

/**
 * Clean Old Backups
 * Keep only specified number of most recent backups
 */
ipcMain.handle('backup:clean', async (_event, options: { keepCount: number, customPath?: string }) => {
  try {
    const backupDir = await getBackupDirectory(options.customPath)
    const files = await fs.readdir(backupDir)
    
    // Filter backup files
    const backupFiles = await Promise.all(
      files
        .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
        .map(async (file) => {
          const filePath = path.join(backupDir, file)
          const stats = await fs.stat(filePath)
          return {
            filename: file,
            path: filePath,
            createdAt: stats.birthtime
          }
        })
    )
    
    // Sort by creation date (newest first)
    backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    // Delete old backups beyond keepCount
    const toDelete = backupFiles.slice(options.keepCount)
    const deleted: string[] = []
    
    for (const backup of toDelete) {
      await fs.unlink(backup.path)
      deleted.push(backup.filename)
    }
    
    return {
      success: true,
      data: {
        deletedCount: deleted.length,
        deleted,
        kept: backupFiles.slice(0, options.keepCount).length
      }
    }
  } catch (error) {
    log.error('Failed to clean backups:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clean backups'
    }
  }
})

/**
 * Get Backup Info
 */
ipcMain.handle('backup:info', async (_event, backupPath: string) => {
  try {
    const stats = await fs.stat(backupPath)
    
    return {
      success: true,
      data: {
        path: backupPath,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      }
    }
  } catch (error) {
    log.error('Failed to get backup info:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get backup info'
    }
  }
})
