/**
 * Encrypted backups: the container format, and the promises it makes.
 *
 * This is the one feature where a silent regression is unrecoverable rather
 * than merely annoying. If `decryptBackup` ever accepts a wrong passphrase, the
 * user learns it only when they need the backup; if it ever *rejects* a right
 * one, the money is already gone. The same asymmetry applies to the format
 * itself — a reader that trusts a truncated or re-tagged file will happily
 * restore a corrupt database over a live one — so the tests below pin the byte
 * layout, the authentication of both the ciphertext and the tag, and the
 * refusal to fall back to plaintext when no passphrase is supplied.
 *
 * `backup-crypto.ts` is deliberately Electron-free, which is what makes it
 * directly testable here.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  BackupDecryptError,
  ENCRYPTED_SUFFIX,
  HEADER_LEN,
  decryptBackup,
  encryptedName,
  encryptBackup,
  isEncryptedBackup,
  isEncryptedBackupFile,
  plainName
} from '../../main/backup-crypto'

const MAGIC = Buffer.from('BZFENC01', 'ascii')

const PASSPHRASE = 'correct horse battery staple'

// A miniature stand-in for the SQLite file: a few readable bytes followed by
// binary noise, so a round trip has to be byte-exact rather than merely
// string-equal.
const PAYLOAD = Buffer.concat([
  Buffer.from('SQLite format 3\u0000', 'latin1'),
  Buffer.from(Array.from({ length: 256 }, (_, index) => index))
])

describe('backup encryption', () => {
  let dir: string

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'bizflow-backup-crypto-'))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  describe('round trip', () => {
    it('returns the original bytes for a binary payload', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)

      expect(await decryptBackup(container, PASSPHRASE)).toEqual(PAYLOAD)
    })

    it('round-trips a payload that is longer than one cipher block', async () => {
      const large = Buffer.alloc(70_000, 7)

      expect(await decryptBackup(await encryptBackup(large, PASSPHRASE), PASSPHRASE)).toEqual(
        large
      )
    })

    it('round-trips an empty payload', async () => {
      const container = await encryptBackup(Buffer.alloc(0), PASSPHRASE)

      expect(container).toHaveLength(HEADER_LEN)
      expect(await decryptBackup(container, PASSPHRASE)).toEqual(Buffer.alloc(0))
    })

    it('accepts a non-ASCII passphrase', async () => {
      const passphrase = 'كلمة مرور طويلة 🔐'

      expect(await decryptBackup(await encryptBackup(PAYLOAD, passphrase), passphrase)).toEqual(
        PAYLOAD
      )
    })
  })

  describe('container format', () => {
    it('starts with the magic header that doubles as the format version', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)

      expect(container.subarray(0, MAGIC.length)).toEqual(MAGIC)
    })

    it('adds exactly one 52-byte header and does not pad the ciphertext', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)

      expect(HEADER_LEN).toBe(52)
      expect(container).toHaveLength(HEADER_LEN + PAYLOAD.length)
    })

    it('uses a fresh salt and IV per call, so identical inputs differ on disk', async () => {
      const first = await encryptBackup(PAYLOAD, PASSPHRASE)
      const second = await encryptBackup(PAYLOAD, PASSPHRASE)

      expect(first.equals(second)).toBe(false)
      // Salt is bytes 8..24 and the IV is 24..36; both must move.
      expect(first.subarray(8, 24).equals(second.subarray(8, 24))).toBe(false)
      expect(first.subarray(24, 36).equals(second.subarray(24, 36))).toBe(false)
      expect(await decryptBackup(second, PASSPHRASE)).toEqual(PAYLOAD)
    })
  })

  describe('rejections', () => {
    it('refuses to encrypt without a passphrase', async () => {
      await expect(encryptBackup(PAYLOAD, '')).rejects.toThrow(/passphrase/i)
    })

    it('rejects a wrong passphrase without leaking whether it was close', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)

      await expect(decryptBackup(container, 'wrong passphrase')).rejects.toBeInstanceOf(
        BackupDecryptError
      )
    })

    it('rejects a correct passphrase that differs only in case', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)

      await expect(
        decryptBackup(container, PASSPHRASE.toUpperCase())
      ).rejects.toBeInstanceOf(BackupDecryptError)
    })

    it('rejects a flipped ciphertext byte', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)
      const tampered = Buffer.from(container)
      tampered[tampered.length - 1] ^= 0xff

      await expect(decryptBackup(tampered, PASSPHRASE)).rejects.toBeInstanceOf(
        BackupDecryptError
      )
    })

    it('rejects a flipped authentication-tag byte', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)
      const tampered = Buffer.from(container)
      tampered[36] ^= 0x01

      await expect(decryptBackup(tampered, PASSPHRASE)).rejects.toBeInstanceOf(
        BackupDecryptError
      )
    })

    it('rejects a flipped salt byte, because it derives a different key', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)
      const tampered = Buffer.from(container)
      tampered[8] ^= 0x01

      await expect(decryptBackup(tampered, PASSPHRASE)).rejects.toBeInstanceOf(
        BackupDecryptError
      )
    })

    it('refuses a plain headerless payload instead of guessing', async () => {
      await expect(decryptBackup(PAYLOAD, PASSPHRASE)).rejects.toThrow(/header/i)
    })

    it('refuses a truncated header', async () => {
      const container = await encryptBackup(PAYLOAD, PASSPHRASE)

      await expect(
        decryptBackup(container.subarray(0, HEADER_LEN - 1), PASSPHRASE)
      ).rejects.toThrow(/header/i)
    })
  })

  describe('isEncryptedBackup', () => {
    it('is true for a real container', async () => {
      expect(isEncryptedBackup(await encryptBackup(PAYLOAD, PASSPHRASE))).toBe(true)
    })

    it('is false for a plain SQLite file', () => {
      expect(isEncryptedBackup(PAYLOAD)).toBe(false)
    })

    it('is false for a bare magic prefix with no salt, IV or tag', () => {
      expect(isEncryptedBackup(MAGIC)).toBe(false)
    })

    it('is false for an empty buffer', () => {
      expect(isEncryptedBackup(Buffer.alloc(0))).toBe(false)
    })
  })

  describe('isEncryptedBackupFile', () => {
    it('sniffs a real encrypted file off disk', async () => {
      const file = path.join(dir, 'backup-20240101-000000.db.enc')
      await writeFile(file, await encryptBackup(PAYLOAD, PASSPHRASE))

      expect(await isEncryptedBackupFile(file)).toBe(true)
    })

    it('is false for a plain backup file', async () => {
      const file = path.join(dir, 'backup-20240101-000001.db')
      await writeFile(file, PAYLOAD)

      expect(await isEncryptedBackupFile(file)).toBe(false)
    })

    it('is false for a missing file rather than throwing', async () => {
      expect(await isEncryptedBackupFile(path.join(dir, 'nope.db.enc'))).toBe(false)
    })
  })

  describe('file naming', () => {
    it('appends the .enc suffix exactly once', () => {
      expect(ENCRYPTED_SUFFIX).toBe('.enc')
      expect(encryptedName('backup-20240101-000000.db')).toBe('backup-20240101-000000.db.enc')
      expect(encryptedName('backup-20240101-000000.db.enc')).toBe('backup-20240101-000000.db.enc')
    })

    it('strips the .enc suffix back off, and leaves other names alone', () => {
      expect(plainName('backup-20240101-000000.db.enc')).toBe('backup-20240101-000000.db')
      expect(plainName('backup-20240101-000000.db')).toBe('backup-20240101-000000.db')
      expect(plainName('.enc')).toBe('.enc')
    })

    it('round-trips through both helpers', () => {
      const original = 'backup-20240101-000000.db'

      expect(plainName(encryptedName(original))).toBe(original)
    })
  })
})
