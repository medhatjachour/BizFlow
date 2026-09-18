/**
 * Backup encryption — AES-256-GCM with a scrypt-derived key.
 *
 * The whole point of this module is that a backup copied into Dropbox / iCloud
 * / OneDrive is useless without the passphrase: the file never leaves the
 * machine in a readable form and no third-party service ever sees the key.
 *
 * File layout (52-byte header, then ciphertext):
 *
 *   0..8    magic "BZFENC01"   — doubles as the format version
 *   8..24   scrypt salt        (16 bytes, fresh per backup)
 *   24..36  AES-GCM IV         (12 bytes, fresh per backup)
 *   36..52  AES-GCM auth tag   (16 bytes)
 *   52..    ciphertext
 *
 * Deliberately Electron-free so it can be unit tested without a DOM.
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt, type ScryptOptions } from 'node:crypto'
import { open } from 'node:fs/promises'
import { promisify } from 'node:util'

type ScryptWithOptions = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>

const scryptAsync = promisify(scrypt) as unknown as ScryptWithOptions

/** Suffix added to the normal `backup-…db` name when a backup is encrypted. */
export const ENCRYPTED_SUFFIX = '.enc'

const MAGIC = Buffer.from('BZFENC01', 'ascii')
const SALT_OFFSET = MAGIC.length
const SALT_LEN = 16
const IV_OFFSET = SALT_OFFSET + SALT_LEN
const IV_LEN = 12
const TAG_OFFSET = IV_OFFSET + IV_LEN
const TAG_LEN = 16
const DATA_OFFSET = TAG_OFFSET + TAG_LEN

/** Length of the fixed header that precedes every encrypted backup. */
export const HEADER_LEN = DATA_OFFSET

const KEY_LEN = 32

// 128 * N * r must stay below maxmem, so both are raised together.
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }

/**
 * Thrown when GCM authentication fails — a wrong passphrase or a file that was
 * modified after it was written. The two are indistinguishable by design.
 */
export class BackupDecryptError extends Error {
  constructor(message = 'Backup could not be decrypted') {
    super(message)
    this.name = 'BackupDecryptError'
  }
}

const deriveKey = (passphrase: string, salt: Buffer): Promise<Buffer> =>
  scryptAsync(passphrase, salt, KEY_LEN, SCRYPT_OPTIONS)

/** True when `payload` starts with the encrypted-backup magic header. */
export const isEncryptedBackup = (payload: Buffer): boolean =>
  payload.length >= HEADER_LEN && payload.subarray(0, MAGIC.length).equals(MAGIC)

/** Same test as {@link isEncryptedBackup}, but reading only the header off disk. */
export const isEncryptedBackupFile = async (filePath: string): Promise<boolean> => {
  let handle: Awaited<ReturnType<typeof open>> | null = null
  try {
    handle = await open(filePath, 'r')
    const header = Buffer.alloc(MAGIC.length)
    const { bytesRead } = await handle.read(header, 0, MAGIC.length, 0)
    return bytesRead === MAGIC.length && header.equals(MAGIC)
  } catch {
    return false
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

/** `backup-….db` → `backup-….db.enc` */
export const encryptedName = (filename: string): string =>
  filename.endsWith(ENCRYPTED_SUFFIX) ? filename : `${filename}${ENCRYPTED_SUFFIX}`

/** `backup-….db.enc` → `backup-….db` */
export const plainName = (filename: string): string =>
  filename.length > ENCRYPTED_SUFFIX.length && filename.endsWith(ENCRYPTED_SUFFIX)
    ? filename.slice(0, -ENCRYPTED_SUFFIX.length)
    : filename

/** Encrypt `plain` into a self-describing container. */
export const encryptBackup = async (plain: Buffer, passphrase: string): Promise<Buffer> => {
  if (!passphrase) throw new Error('A passphrase is required to encrypt a backup')

  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', await deriveKey(passphrase, salt), iv)

  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])

  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext])
}

/**
 * Reverse {@link encryptBackup}. Throws {@link BackupDecryptError} when the
 * passphrase is wrong or the payload was tampered with.
 */
export const decryptBackup = async (
  payload: Buffer,
  passphrase: string
): Promise<Buffer> => {
  if (!isEncryptedBackup(payload)) {
    throw new Error('Not an encrypted BizFlow backup (missing header)')
  }

  const salt = payload.subarray(SALT_OFFSET, SALT_OFFSET + SALT_LEN)
  const iv = payload.subarray(IV_OFFSET, IV_OFFSET + IV_LEN)
  const tag = payload.subarray(TAG_OFFSET, TAG_OFFSET + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', await deriveKey(passphrase, salt), iv)
  decipher.setAuthTag(tag)

  try {
    return Buffer.concat([decipher.update(payload.subarray(DATA_OFFSET)), decipher.final()])
  } catch {
    throw new BackupDecryptError()
  }
}
