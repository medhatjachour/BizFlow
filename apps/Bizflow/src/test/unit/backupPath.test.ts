/**
 * Validation of caller-supplied backup paths.
 *
 * `backup:restore` is the one place in the app where a string arriving over IPC
 * becomes a file-system operation whose *read* source is chosen by the caller
 * and whose write destination is the live database. The interesting cases are
 * therefore all adversarial: a UNC path that makes the main process authenticate
 * outbound to an attacker's SMB host, a device path, an arbitrary readable file,
 * and the live database itself.
 *
 * The module is deliberately dependency-free (no Electron, no Prisma) so these
 * rules can be pinned here rather than through a mocked main process.
 */

import { describe, expect, it } from 'vitest'
import * as path from 'node:path'
import {
  ALLOWED_BACKUP_EXTENSIONS,
  checkBackupPath,
  isNetworkOrDevicePath
} from '../../main/backup-path'

const LIVE_DB = path.resolve('C:/Users/medha/AppData/Roaming/BizFlow/bizflow.db')

describe('isNetworkOrDevicePath', () => {
  it('flags UNC paths in both slash styles', () => {
    expect(isNetworkOrDevicePath('\\\\attacker\\share\\x.db')).toBe(true)
    expect(isNetworkOrDevicePath('//attacker/share/x.db')).toBe(true)
    expect(isNetworkOrDevicePath('\\\\?\\C:\\temp\\x.db')).toBe(true)
    expect(isNetworkOrDevicePath('\\\\?\\UNC\\attacker\\share\\x.db')).toBe(true)
    expect(isNetworkOrDevicePath('\\\\.\\PhysicalDrive0')).toBe(true)
  })

  it('flags drive-relative device forms', () => {
    expect(isNetworkOrDevicePath('C:\\\\temp\\x.db')).toBe(true)
    expect(isNetworkOrDevicePath('z://host/share/x.db')).toBe(true)
  })

  it('leaves ordinary local paths alone', () => {
    expect(isNetworkOrDevicePath('C:\\Backups\\backup-2025-01-01.db')).toBe(false)
    expect(isNetworkOrDevicePath('/var/backups/bizflow/backup.db')).toBe(false)
    expect(isNetworkOrDevicePath('backups\\backup.db')).toBe(false)
    expect(isNetworkOrDevicePath('')).toBe(false)
  })
})

describe('checkBackupPath', () => {
  it('refuses anything that is not a usable path string', () => {
    expect(checkBackupPath(undefined, LIVE_DB)).toEqual({ ok: false, error: 'A backup file path is required' })
    expect(checkBackupPath(null, LIVE_DB).ok).toBe(false)
    expect(checkBackupPath('', LIVE_DB).ok).toBe(false)
    expect(checkBackupPath('   ', LIVE_DB).ok).toBe(false)
    expect(checkBackupPath(42, LIVE_DB).ok).toBe(false)
    expect(checkBackupPath({ path: 'x.db' }, LIVE_DB).ok).toBe(false)
  })

  it('refuses network and device paths before touching the disk', () => {
    for (const evil of [
      '\\\\attacker\\share\\backup.db',
      '//attacker/share/backup.db',
      '\\\\?\\C:\\temp\\backup.db',
      '\\\\?\\UNC\\attacker\\share\\backup.db'
    ]) {
      expect(checkBackupPath(evil, LIVE_DB)).toEqual({
        ok: false,
        error: 'Network and device paths are not supported'
      })
    }
  })

  it('only accepts the extensions the file dialog offers', () => {
    for (const bad of ['notes.txt', 'backup.db.bak', 'backup.zip', 'backup', '.gitignore', 'secrets.json']) {
      expect(checkBackupPath(`C:\\Backups\\${bad}`, LIVE_DB)).toEqual({
        ok: false,
        error: 'Not a recognised backup file'
      })
    }
  })

  it('accepts every declared backup extension, case-insensitively', () => {
    for (const ext of ALLOWED_BACKUP_EXTENSIONS) {
      expect(checkBackupPath(`C:\\Backups\\backup-2025-01-01${ext}`, LIVE_DB).ok).toBe(true)
      expect(checkBackupPath(`C:\\Backups\\backup-2025-01-01${ext.toUpperCase()}`, LIVE_DB).ok).toBe(true)
    }
  })

  it('accepts an encrypted backup, whose real extension is the suffix', () => {
    const result = checkBackupPath('C:\\Backups\\backup-2025-01-01.db.enc', LIVE_DB)
    expect(result).toEqual({ ok: true, path: path.resolve('C:\\Backups\\backup-2025-01-01.db.enc') })
  })

  it('never lets the live database be its own restore source', () => {
    expect(checkBackupPath(LIVE_DB, LIVE_DB)).toEqual({
      ok: false,
      error: 'The live database cannot be used as a backup source'
    })
    // Windows paths are case-insensitive.
    expect(checkBackupPath(LIVE_DB.toUpperCase(), LIVE_DB).ok).toBe(false)
  })

  it('resolves relative paths so the handler compares like with like', () => {
    const result = checkBackupPath('backups\\backup.db', null)
    expect(result.ok).toBe(true)
    if (result.ok) expect(path.isAbsolute(result.path)).toBe(true)
  })

  it('trims surrounding whitespace instead of rejecting it', () => {
    const result = checkBackupPath('  C:\\Backups\\backup.db  ', null)
    expect(result).toEqual({ ok: true, path: path.resolve('C:\\Backups\\backup.db') })
  })

  it('still validates the extension when the live database is unknown', () => {
    expect(checkBackupPath('C:\\Backups\\backup.txt', null).ok).toBe(false)
    expect(checkBackupPath('C:\\Backups\\backup.db', null).ok).toBe(true)
  })
})
