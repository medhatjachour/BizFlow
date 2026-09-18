/**
 * Backup & Restore IPC Handlers
 * Handles local database backup and restore operations
 */

import { ipcMain, dialog, safeStorage } from 'electron'
import * as fs from 'fs/promises'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import * as path from 'path'
import { app } from 'electron'
import { getDatabasePath } from '../../database/init'
import { createLogger } from '../../utils/logger'
import { mainT } from '../../i18n'
import {
  BackupDecryptError,
  ENCRYPTED_SUFFIX,
  decryptBackup,
  encryptBackup,
  isEncryptedBackupFile
} from '../../backup-crypto'
import { checkBackupPath } from '../../backup-path'

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

type BackupResult =
  | { success: true; data: RegistryEntry }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Backup encryption settings
// The passphrase is never written to disk in the clear: it is wrapped with
// Electron's safeStorage, which delegates to the OS keychain (DPAPI on Windows,
// Keychain on macOS). A backup therefore stays useless on another machine, and
// a backup dropped into a synced folder stays useless to the cloud provider.
// ---------------------------------------------------------------------------

export type BackupEncryptionSettings = {
  /** False when the OS offers no keychain, i.e. the passphrase cannot be kept. */
  supported: boolean
  enabled: boolean
  hasPassphrase: boolean
}

type StoredEncryptionPrefs = {
  enabled: boolean
  /** base64 of the safeStorage-wrapped passphrase, or null when unset. */
  protectedPassphrase: string | null
}

const getEncryptionPrefsPath = (): string =>
  path.join(app.getPath('userData'), 'backup-encryption.json')

let encryptionPrefs: StoredEncryptionPrefs = { enabled: false, protectedPassphrase: null }
/** Unwrapped passphrase, kept in memory for this session only. */
let cachedPassphrase: string | null = null

const loadEncryptionPrefs = (): void => {
  try {
    if (existsSync(getEncryptionPrefsPath())) {
      const parsed = JSON.parse(
        readFileSync(getEncryptionPrefsPath(), 'utf-8')
      ) as Partial<StoredEncryptionPrefs>
      encryptionPrefs = {
        enabled: parsed.enabled === true,
        protectedPassphrase:
          typeof parsed.protectedPassphrase === 'string' ? parsed.protectedPassphrase : null
      }
    }
  } catch (error) {
    log.warn('Failed to read backup encryption prefs:', error)
  }
}
loadEncryptionPrefs()

const saveEncryptionPrefs = (): void => {
  writeFileSync(getEncryptionPrefsPath(), JSON.stringify(encryptionPrefs, null, 2), 'utf-8')
}

const encryptionSupported = (): boolean => {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

const encryptionSettings = (): BackupEncryptionSettings => ({
  supported: encryptionSupported(),
  enabled: encryptionPrefs.enabled,
  hasPassphrase: encryptionPrefs.protectedPassphrase !== null
})

/**
 * The passphrase to use for a backup the user did not type one for.
 * `{ok: true, passphrase: null}` means "write it in the clear"; `ok: false`
 * means encryption was asked for but cannot be honoured, which must never
 * silently degrade into a plaintext backup.
 */
const resolveStoredPassphrase = async (): Promise<
  { ok: true; passphrase: string | null } | { ok: false; error: string }
> => {
  if (!encryptionPrefs.enabled) return { ok: true, passphrase: null }
  if (cachedPassphrase) return { ok: true, passphrase: cachedPassphrase }
  if (!encryptionPrefs.protectedPassphrase) {
    return { ok: false, error: mainT('backupEncMissingPassphrase') }
  }
  if (!encryptionSupported()) {
    return { ok: false, error: mainT('backupEncUnsupported') }
  }
  try {
    cachedPassphrase = safeStorage.decryptString(
      Buffer.from(encryptionPrefs.protectedPassphrase, 'base64')
    )
    return { ok: true, passphrase: cachedPassphrase }
  } catch (error) {
    log.error('Failed to unwrap the stored backup passphrase:', error)
    return { ok: false, error: mainT('backupEncMissingPassphrase') }
  }
}

/** Wrap a passphrase so it can be written to disk, or fail if unsupported. */
const protectPassphrase = (passphrase: string): string => {
  if (!encryptionSupported()) throw new Error(mainT('backupEncUnsupported'))
  return safeStorage.encryptString(passphrase).toString('base64')
}

/**
 * Copy the live database to `destDir`, register it, and return the entry.
 * Shared by the `backup:create` IPC handler and the backup-on-close flow.
 *
 * `passphrase` of `undefined` follows the saved encryption setting; `null`
 * forces a plaintext backup; a string encrypts with that passphrase.
 */
export const performBackup = async (
  destDir: string,
  passphrase?: string | null
): Promise<BackupResult> => {
  const dbPath = getDatabasePath()

  try {
    await fs.access(dbPath)
  } catch {
    return { success: false, error: `Database file not found at: ${dbPath}` }
  }

  if (!destDir) {
    return { success: false, error: 'No destination folder provided' }
  }

  let effectivePassphrase: string | null
  if (passphrase === undefined) {
    const resolved = await resolveStoredPassphrase()
    if (!resolved.ok) return { success: false, error: resolved.error }
    effectivePassphrase = resolved.passphrase
  } else {
    effectivePassphrase = passphrase
  }

  // Ensure destination exists
  await fs.mkdir(destDir, { recursive: true })

  const backupFilename = formatBackupFilename()
  let backupPath = path.join(destDir, backupFilename)

  await fs.copyFile(dbPath, backupPath)

  if (effectivePassphrase) {
    try {
      const encrypted = await encryptBackup(await fs.readFile(backupPath), effectivePassphrase)
      const encryptedPath = `${backupPath}${ENCRYPTED_SUFFIX}`
      await fs.writeFile(encryptedPath, encrypted)
      // Only drop the plaintext copy once the encrypted one is safely written.
      await fs.unlink(backupPath)
      backupPath = encryptedPath
    } catch (error) {
      await fs.unlink(backupPath).catch(() => undefined)
      log.error('Failed to encrypt backup:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to encrypt backup'
      }
    }
  }

  const stats = await fs.stat(backupPath)

  const entry: RegistryEntry = {
    filename: path.basename(backupPath),
    path: backupPath,
    size: stats.size,
    createdAt: new Date().toISOString()
  }

  await addToRegistry(entry)

  log.info(`Backup created and registered: ${backupPath}`)
  return { success: true, data: entry }
}

// ---------------------------------------------------------------------------
// Backup-on-close preferences
// Persisted in a small JSON file so the MAIN process can read them synchronously
// while handling the window `close` event (renderer localStorage is unreachable
// there). Kept in memory and re-saved whenever the renderer updates them.
// ---------------------------------------------------------------------------

export type CloseBackupPrefs = {
  promptOnClose: boolean
  backupDir: string | null
}

const getClosePrefsPath = (): string =>
  path.join(app.getPath('userData'), 'close-backup-prefs.json')

/** Default folder used when the user hasn't chosen one. */
export const defaultBackupDir = (): string =>
  path.join(app.getPath('documents'), 'BizFlow Backups')

let closeBackupPrefs: CloseBackupPrefs = { promptOnClose: true, backupDir: null }

const loadClosePrefs = (): void => {
  try {
    if (existsSync(getClosePrefsPath())) {
      const raw = readFileSync(getClosePrefsPath(), 'utf-8')
      const parsed = JSON.parse(raw) as Partial<CloseBackupPrefs>
      closeBackupPrefs = {
        promptOnClose: parsed.promptOnClose !== false,
        backupDir: typeof parsed.backupDir === 'string' ? parsed.backupDir : null
      }
    }
  } catch (error) {
    log.warn('Failed to read close-backup prefs:', error)
  }
}
loadClosePrefs()

/** Synchronous accessor for the window `close` handler. */
export const getCloseBackupPrefs = (): CloseBackupPrefs => closeBackupPrefs

/**
 * Create Database Backup
 * Saves the file to the user-chosen directory and registers it globally.
 */
ipcMain.handle(
  'backup:create',
  async (_event, options?: { customPath?: string; passphrase?: string | null }) => {
    try {
      const destDir = options?.customPath
      if (!destDir) {
        return { success: false, error: 'No destination folder provided' }
      }
      return await performBackup(destDir, options?.passphrase)
    } catch (error) {
      log.error('Backup creation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create backup'
      }
    }
  }
)

/** Read the encryption settings (for the Settings UI). */
ipcMain.handle('backup:get-encryption', async () => {
  return { success: true, data: encryptionSettings() }
})

/**
 * Update the encryption settings (from the Settings UI).
 * Setting `passphrase` to `null` (or '') forgets it; enabling encryption
 * without a passphrase is refused rather than silently writing plaintext.
 */
ipcMain.handle(
  'backup:set-encryption',
  async (_event, prefs: { enabled?: boolean; passphrase?: string | null }) => {
    try {
      if (prefs.passphrase !== undefined) {
        if (!prefs.passphrase) {
          encryptionPrefs.protectedPassphrase = null
          cachedPassphrase = null
        } else {
          encryptionPrefs.protectedPassphrase = protectPassphrase(prefs.passphrase)
          cachedPassphrase = prefs.passphrase
        }
      }

      if (typeof prefs.enabled === 'boolean') {
        if (prefs.enabled && !encryptionPrefs.protectedPassphrase) {
          return {
            success: false,
            code: 'missing-passphrase',
            error: mainT('backupEncMissingPassphrase')
          }
        }
        encryptionPrefs.enabled = prefs.enabled
      }

      saveEncryptionPrefs()
      return { success: true, data: encryptionSettings() }
    } catch (error) {
      log.error('Failed to save backup encryption prefs:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save encryption settings'
      }
    }
  }
)

/** Read the backup-on-close preferences (for the Settings UI). */
ipcMain.handle('backup:get-close-prefs', async () => {
  return { success: true, data: closeBackupPrefs }
})

/** Update the backup-on-close preferences (from the Settings UI). */
ipcMain.handle(
  'backup:set-close-prefs',
  async (_event, prefs: Partial<CloseBackupPrefs>) => {
    try {
      closeBackupPrefs = {
        promptOnClose:
          typeof prefs.promptOnClose === 'boolean'
            ? prefs.promptOnClose
            : closeBackupPrefs.promptOnClose,
        backupDir:
          prefs.backupDir === undefined ? closeBackupPrefs.backupDir : prefs.backupDir
      }
      writeFileSync(getClosePrefsPath(), JSON.stringify(closeBackupPrefs, null, 2), 'utf-8')
      return { success: true, data: closeBackupPrefs }
    } catch (error) {
      log.error('Failed to save close-backup prefs:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save preferences'
      }
    }
  }
)

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
        let encrypted = false
        try {
          const stats = await fs.stat(entry.path)
          size = stats.size
          encrypted = await isEncryptedBackupFile(entry.path)
        } catch {
          missing = true
        }
        return { ...entry, size, encrypted, missing }
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
 *
 * An encrypted backup is decrypted *before* the live database is touched, so a
 * wrong passphrase can never leave the app with a half-replaced database.
 */
ipcMain.handle(
  'backup:restore',
  async (_event, backupPath: string, options?: { passphrase?: string | null }) => {
    try {
      // The source path arrives over IPC and becomes the live database, so it
      // is validated before anything is read from it (see backup-path.ts).
      const source = checkBackupPath(backupPath, getDatabasePath())
      if (!source.ok) {
        return { success: false, error: source.error }
      }

      // Verify backup file exists
      try {
        const stats = await fs.stat(source.path)
        if (!stats.isFile()) throw new Error('not a file')
      } catch {
        return {
          success: false,
          error: 'Backup file not found'
        }
      }

      const encrypted = await isEncryptedBackupFile(source.path)

      let payload: Buffer | null = null
      if (encrypted) {
        let passphrase: string | null = options?.passphrase || null

        if (!passphrase) {
          const resolved = await resolveStoredPassphrase()
          if (!resolved.ok) {
            return { success: false, code: 'passphrase-required', error: resolved.error }
          }
          passphrase = resolved.passphrase
        }

        if (!passphrase) {
          return {
            success: false,
            code: 'passphrase-required',
            error: mainT('backupEncPromptMessage')
          }
        }

        try {
          payload = await decryptBackup(await fs.readFile(source.path), passphrase)
        } catch (error) {
          if (error instanceof BackupDecryptError) {
            return {
              success: false,
              code: 'wrong-passphrase',
              error: mainT('backupEncWrongPassphrase')
            }
          }
          throw error
        }
      }

      // Get current database path using centralized function
      const dbPath = getDatabasePath()
      const dbDir = path.dirname(dbPath)

      // Create a backup of current database before restoring
      const emergencyBackupPath = path.join(dbDir, `emergency-backup-${Date.now()}.db`)

      try {
        await fs.copyFile(dbPath, emergencyBackupPath)
      } catch (error) {
        log.warn('Failed to create emergency backup:', error)
      }

      // Replace current database with backup
      // Note: The application should be restarted after restore for changes to take effect
      if (payload) {
        await fs.writeFile(dbPath, payload)
      } else {
        await fs.copyFile(source.path, dbPath)
      }

      return {
        success: true,
        data: {
          restoredFrom: source.path,
          emergencyBackup: emergencyBackupPath,
          decrypted: encrypted
        }
      }
    } catch (error) {
      log.error('Restore failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore backup'
      }
    }
  }
)

/**
 * Delete Backup File + remove from registry
 */
ipcMain.handle('backup:delete', async (_event, backupPath: string) => {
  try {
    const target = checkBackupPath(backupPath, getDatabasePath())
    if (!target.ok) {
      return { success: false, error: target.error }
    }

    // Try to delete the file (it might already be missing from disk)
    try {
      await fs.unlink(target.path)
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') throw e // re-throw unexpected errors
      // file was already gone — that's fine, still remove from registry
    }

    await removeFromRegistry(target.path)

    return { success: true, data: { deleted: target.path } }
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
 * Select a Backup File from anywhere on the PC (for restore).
 */
ipcMain.handle('backup:select-file', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select Backup File to Restore',
      filters: [
        { name: 'Database Backup', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'Encrypted Backup', extensions: ['enc'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePaths[0]) {
      return {
        success: false,
        error: 'No file selected'
      }
    }

    return {
      success: true,
      data: { path: result.filePaths[0] }
    }
  } catch (error) {
    log.error('Failed to select backup file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to select file'
    }
  }
})

/**
 * Clean Old Backups
 * Keep only specified number of most recent backups
 */
ipcMain.handle('backup:clean', async (_event, options: { keepCount: number, customPath?: string }) => {
  try {
    const backupDir = options.customPath
    if (!backupDir) {
      return { success: false, error: 'No backup folder provided' }
    }
    const files = await fs.readdir(backupDir)
    
    // Filter backup files
    const backupFiles = await Promise.all(
      files
        .filter(file => file.startsWith('backup-') && /\.db(\.enc)?$/.test(file))
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
