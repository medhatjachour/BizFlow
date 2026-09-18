/**
 * Validation for caller-supplied backup paths.
 *
 * `backup:restore` / `backup:delete` take a path over IPC and hand it to the
 * file system. The renderer is not a trusted caller (the preload bridge exposes
 * a generic `invoke`), and the destination of a restore is the live database, so
 * the path is checked before anything touches the disk:
 *
 * - Network and device paths are refused. On Windows a UNC path such as
 *   `\\attacker\share\x.db` makes the *main process* authenticate outbound to an
 *   attacker-controlled SMB host — an easy NTLM-relay primitive that has nothing
 *   to do with the file once it is opened.
 * - Only backup extensions are accepted. This mirrors what the file dialog
 *   already restricts picks to, and stops an arbitrary readable file from being
 *   loaded as this application's database.
 * - The live database itself is never a valid source.
 *
 * Existence and regular-file checks stay in the handler, since only it can do
 * file-system I/O.
 */

import * as path from 'node:path'
import { ENCRYPTED_SUFFIX } from './backup-crypto'

export const ALLOWED_BACKUP_EXTENSIONS = ['.db', '.sqlite', '.sqlite3', ENCRYPTED_SUFFIX]

export type BackupPathCheck =
  | { ok: true; path: string }
  | { ok: false; error: string }

/** `\\server\share`, `//server/share`, `\\?\C:\…` and `\\.\device`. */
export function isNetworkOrDevicePath(candidate: string): boolean {
  return /^[\\/]{2}/.test(candidate) || /^[a-z]:[\\/]{2}/i.test(candidate)
}

/** Windows compares paths case-insensitively; the live DB is a fixed name. */
function samePath(a: string, b: string): boolean {
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()
}

/**
 * @param raw        The path as received over IPC.
 * @param liveDbPath The database a restore would overwrite, or null if unknown.
 */
export function checkBackupPath(raw: unknown, liveDbPath: string | null): BackupPathCheck {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'A backup file path is required' }
  }
  const candidate = raw.trim()
  if (isNetworkOrDevicePath(candidate)) {
    return { ok: false, error: 'Network and device paths are not supported' }
  }
  const resolved = path.resolve(candidate)
  if (!ALLOWED_BACKUP_EXTENSIONS.includes(path.extname(resolved).toLowerCase())) {
    return { ok: false, error: 'Not a recognised backup file' }
  }
  if (liveDbPath && samePath(resolved, liveDbPath)) {
    return { ok: false, error: 'The live database cannot be used as a backup source' }
  }
  return { ok: true, path: resolved }
}
