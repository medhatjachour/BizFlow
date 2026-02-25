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

// Prisma client will be passed from the main handlers if needed
// For backup/restore, we work directly with database files

// Get app data directory for backups
const getBackupDirectory = async (customPath?: string): Promise<string> => {
  if (customPath) {
    return customPath
  }
  const userDataPath = app.getPath('userData')
  const backupDir = path.join(userDataPath, 'backups')
  
  // Ensure backup directory exists
  try {
    await fs.access(backupDir)
  } catch {
    await fs.mkdir(backupDir, { recursive: true })
  }
  
  return backupDir
}

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
 */
ipcMain.handle('backup:create', async (_event, options?: { customPath?: string }) => {
  try {
    // Get database path using centralized function
    const dbPath = getDatabasePath()
    
    // Check if database exists
    try {
      await fs.access(dbPath)
    } catch {
      return {
        success: false,
        error: `Database file not found at: ${dbPath}`
      }
    }

    // Get backup directory
    const backupDir = await getBackupDirectory(options?.customPath)
    
    // Generate backup filename
    const backupFilename = formatBackupFilename()
    const backupPath = path.join(backupDir, backupFilename)
    
    // Copy database file to backup location
    await fs.copyFile(dbPath, backupPath)
    
    // Get backup file stats
    const stats = await fs.stat(backupPath)
    
    return {
      success: true,
      data: {
        path: backupPath,
        filename: backupFilename,
        size: stats.size,
        createdAt: new Date().toISOString()
      }
    }
  } catch (error) {
    log.error('Backup creation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create backup'
    }
  }
})

/**
 * List Available Backups
 */
ipcMain.handle('backup:list', async (_event, customPath?: string) => {
  try {
    const backupDir = await getBackupDirectory(customPath)
    
    // Read directory contents
    const files = await fs.readdir(backupDir)
    
    // Filter and map backup files
    const backups = await Promise.all(
      files
        .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
        .map(async (file) => {
          const filePath = path.join(backupDir, file)
          const stats = await fs.stat(filePath)
          
          return {
            filename: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString()
          }
        })
    )
    
    // Sort by creation date (newest first)
    backups.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return {
      success: true,
      data: {
        backups,
        directory: backupDir
      }
    }
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
 * Delete Backup File
 */
ipcMain.handle('backup:delete', async (_event, backupPath: string) => {
  try {
    await fs.unlink(backupPath)
    return {
      success: true,
      data: { deleted: backupPath }
    }
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
