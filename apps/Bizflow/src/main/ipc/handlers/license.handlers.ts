import { app, BrowserWindow, ipcMain, safeStorage } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createLogger } from '../../utils/logger'
import { readSettings, writeSettings } from '../../utils/module-settings'

const log = createLogger('License')
const ACTIVATION_SETTINGS_KEY = 'licenseActivation'
const TRIAL_SETTINGS_KEY = 'licenseTrial'

/** After activation, the license must be revalidated online at least this often. */
const REVALIDATION_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000
/** How long the app keeps working (with a warning) after a missed revalidation. */
const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000
/** Free trial length from first launch on this device. */
const TRIAL_PERIOD_MS = 14 * 24 * 60 * 60 * 1000
/** Network calls to the license server should never hang the UI. */
const FETCH_TIMEOUT_MS = 15_000
/**
 * Slack allowed before we treat "lastSeenAt is in the future" as a rolled-back
 * clock. A day of slack absorbs timezone/DST mistakes and NTP corrections that
 * move the clock slightly backwards.
 */
const CLOCK_SKEW_TOLERANCE_MS = 24 * 60 * 60 * 1000
/**
 * How often the clock high-water mark is flushed to disk.
 *
 * `getActivationState()` runs on every gate render and every poll, so writing on
 * each call would mean constant disk churn. Flushing hourly caps the gain a
 * rolled-back clock could reach at roughly an hour, which is negligible.
 */
const HIGH_WATER_PERSIST_INTERVAL_MS = 60 * 60 * 1000
/**
 * How many consecutive explicit `valid:false` answers from the server we accept
 * before wiping the local activation. One transient server/database hiccup must
 * not lock out a paying customer on the spot.
 */
const MAX_INVALID_BEFORE_CLEAR = 3
/** IPC channel the renderer listens on so the UI reacts to a revalidation. */
export const LICENSE_STATE_CHANGED_CHANNEL = 'license:stateChanged'

interface LocalActivation {
  version: 2
  email: string
  licenseKey: string
  itemId: string
  deviceFingerprint: string
  deviceName: string
  issuedAt: string
  /** ISO timestamp of the current license validity window (set by the server). */
  expiresAt: string
  /** ISO timestamp of the last successful online revalidation. */
  lastValidatedAt: string
  signature: string
}

export type LicenseStatus = 'trial' | 'active' | 'grace' | 'expired' | 'trial_expired'

function activationPayload(activation: Omit<LocalActivation, 'signature'>): string {
  return JSON.stringify(activation)
}

function signatureIsValid(activation: LocalActivation): boolean {
  // Development builds do not embed the production public key.
  if (!app.isPackaged) return true
  if (!__BIZFLOW_LICENSE_PUBLIC_KEY__) return false
  try {
    const { signature, ...certificate } = activation
    return crypto.verify(
      null,
      Buffer.from(activationPayload(certificate)),
      __BIZFLOW_LICENSE_PUBLIC_KEY__,
      Buffer.from(signature, 'base64')
    )
  } catch {
    return false
  }
}

/**
 * Lowest non-internal physical MAC address on the machine.
 *
 * We sort and take the lowest rather than "the first interface" because the key
 * order of `os.networkInterfaces()` is not stable, and docking stations, VPN
 * adapters and virtual switches add interfaces at runtime. Taking a stable
 * minimum means attaching a new adapter does not change the fingerprint.
 */
function primaryMacAddress(): string {
  const macs: string[] = []
  const interfaces = os.networkInterfaces()

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal) continue
      const mac = entry.mac?.toUpperCase()
      if (!mac || mac === '00:00:00:00:00:00') continue
      macs.push(mac)
    }
  }

  macs.sort()
  return macs[0] ?? ''
}

/**
 * Stable device fingerprint.
 *
 * Deliberately EXCLUDES `os.hostname()` and `os.userInfo().username`, both of
 * which are user-editable. Previously a Windows user rename or a hostname change
 * produced a different fingerprint, so the server answered
 * LOCKED_TO_OTHER_DEVICE and the customer stayed locked out until an admin
 * manually released the device.
 */
function getDeviceFingerprint(): string {
  const cpu = os.cpus()[0]?.model ?? ''
  const raw = [os.platform(), os.arch(), cpu, primaryMacAddress()].join('|')

  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase()
}

function getDeviceName(): string {
  return `${os.hostname()} (${os.platform()}-${os.arch()})`
}

function getLicenseServerBaseUrl(): string {
  const fromEnv = process.env.BIZFLOW_LICENSE_API_BASE?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  // Must be the canonical host that actually resolves. The bare
  // `bizflow.medhatjachour.tech` has no DNS A record, so a request to it fails
  // with ENOTFOUND and both activation and revalidation become impossible.
  return 'https://www.bizflow.medhatjachour.tech'
}

/** fetch() with a hard timeout so a dead network never freezes activation. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ── Trial clock ─────────────────────────────────────────────────────────────

/**
 * Persisted trial state.
 *
 * `lastSeenAt` is a high-water mark: the newest wall-clock time this install has
 * ever observed. It is what makes a rolled-back system clock useless - see
 * `ensureTrialRecord()`.
 */
interface TrialRecord {
  startedAt: number
  lastSeenAt: number
}

interface TrialStatus {
  /** When the 14-day trial began. */
  start: number
  /** `Date.now()` clamped so it can never move backwards. */
  effectiveNow: number
  /** True when the system clock appears to be behind our high-water mark. */
  clockTampered: boolean
}

const TRIAL_RECORD_NAME = 'license-trial.json'

/**
 * Salt for the integrity tag on the plaintext trial mirrors.
 *
 * This is tamper-EVIDENT, not tamper-PROOF: anyone with the source can forge a
 * tag. It exists to stop casual hand-editing of the timestamp, not a determined
 * attacker. Real protection would require the server to record trial starts
 * against the device fingerprint.
 */
const TRIAL_TAG_SALT = 'bizflow-trial-record-v1'

function isTrialRecord(value: unknown): value is TrialRecord {
  if (!value || typeof value !== 'object') return false
  const rec = value as Partial<TrialRecord>
  return (
    Number.isFinite(rec.startedAt) &&
    (rec.startedAt as number) > 0 &&
    Number.isFinite(rec.lastSeenAt) &&
    (rec.lastSeenAt as number) > 0
  )
}

function trialTag(record: TrialRecord): string {
  return crypto
    .createHmac('sha256', TRIAL_TAG_SALT)
    .update(`${record.startedAt}|${record.lastSeenAt}`)
    .digest('hex')
}

/**
 * Every location the trial record is mirrored to.
 *
 * More than one so that deleting the app's user-data folder (the usual way to
 * farm a fresh trial) does not reset the clock. The machine-scoped destinations
 * need no elevation on Windows and macOS; on Linux `/var/lib` may not be
 * writable, so every read and write is best-effort.
 */
function trialRecordPaths(): string[] {
  const paths: string[] = []

  try {
    paths.push(path.join(app.getPath('userData'), TRIAL_RECORD_NAME))
  } catch {
    /* userData should always resolve, but never crash the license path */
  }

  try {
    if (process.platform === 'win32') {
      paths.push(path.join(process.env.ProgramData ?? 'C:\\ProgramData', 'BizFlow', TRIAL_RECORD_NAME))
    } else if (process.platform === 'darwin') {
      paths.push(`/Library/Application Support/BizFlow/${TRIAL_RECORD_NAME}`)
    } else {
      paths.push(`/var/lib/bizflow/${TRIAL_RECORD_NAME}`)
    }
  } catch {
    /* best-effort */
  }

  return paths
}

function readTrialRecords(): TrialRecord[] {
  const records: TrialRecord[] = []

  // Encrypted copy held in the app settings store.
  try {
    const settings = readSettings() as Record<string, unknown>
    const raw = settings[TRIAL_SETTINGS_KEY]
    if (typeof raw === 'string' && raw.length > 0) {
      if (safeStorage.isEncryptionAvailable()) {
        const decoded = safeStorage.decryptString(Buffer.from(raw, 'base64'))
        const parsed: unknown = JSON.parse(decoded)
        if (isTrialRecord(parsed)) records.push(parsed)
      } else {
        // Older builds stored the bare timestamp as a plain string.
        const legacy = Number(raw)
        if (Number.isFinite(legacy) && legacy > 0) {
          records.push({ startedAt: legacy, lastSeenAt: legacy })
        }
      }
    }
  } catch {
    /* unreadable or corrupt: fall through to the plaintext mirrors */
  }

  for (const file of trialRecordPaths()) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as TrialRecord & { tag?: string }
      if (!isTrialRecord(parsed)) continue
      if (parsed.tag && parsed.tag !== trialTag(parsed)) {
        log.warn('Ignoring a trial record that failed its integrity tag', file)
        continue
      }
      records.push(parsed)
    } catch {
      /* missing or unreadable is expected on a first run */
    }
  }

  return records
}

/**
 * Reconciles every mirror into one record.
 *
 * Takes the EARLIEST `startedAt` and the LATEST `lastSeenAt`, so deleting a copy
 * or editing one forward cannot extend the trial.
 */
function loadTrialRecord(): TrialRecord | null {
  const records = readTrialRecords()
  if (records.length === 0) return null

  return {
    startedAt: Math.min(...records.map((record) => record.startedAt)),
    lastSeenAt: Math.max(...records.map((record) => record.lastSeenAt)),
  }
}

function persistTrialRecord(record: TrialRecord): void {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const settings = readSettings() as Record<string, unknown>
      settings[TRIAL_SETTINGS_KEY] = safeStorage
        .encryptString(JSON.stringify(record))
        .toString('base64')
      writeSettings(settings)
    }
  } catch (error) {
    log.warn('Could not persist the encrypted trial record', error)
  }

  const payload = JSON.stringify({ ...record, tag: trialTag(record) })
  for (const file of trialRecordPaths()) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, payload, 'utf8')
    } catch {
      /* best-effort: another mirror may still succeed */
    }
  }
}

/**
 * Reads (or lazily creates) the trial record and advances the high-water mark.
 *
 * Unlike the previous implementation this ALWAYS persists, including when
 * `safeStorage` is unavailable - which is common on Linux without a keyring.
 * Previously that case dropped the timestamp entirely, so every call returned a
 * fresh `Date.now()` and the trial never expired.
 *
 * `effectiveNow` is clamped to the high-water mark, which neutralises a rolled
 * back system clock without punishing someone who fixed a mis-set clock: moving
 * the clock backwards simply gains no time, and moving it forwards never loses
 * any.
 */
function ensureTrialRecord(): TrialStatus {
  const now = Date.now()
  const existing = loadTrialRecord()

  if (!existing) {
    const fresh: TrialRecord = { startedAt: now, lastSeenAt: now }
    persistTrialRecord(fresh)
    return { start: fresh.startedAt, effectiveNow: now, clockTampered: false }
  }

  const clockTampered = now + CLOCK_SKEW_TOLERANCE_MS < existing.lastSeenAt
  const effectiveNow = Math.max(now, existing.lastSeenAt)

  // Only ever advance the mark - never rewind it - and flush at most hourly.
  if (now - existing.lastSeenAt > HIGH_WATER_PERSIST_INTERVAL_MS) {
    persistTrialRecord({ startedAt: existing.startedAt, lastSeenAt: now })
  }

  return { start: existing.startedAt, effectiveNow, clockTampered }
}

/**
 * Fallback location for the activation record when no OS keyring is available.
 *
 * `writeActivation` used to hard-require `safeStorage`, which made activation
 * impossible on machines without one (common on Linux without
 * libsecret/gnome-keyring). Storing the record unencrypted is strictly better
 * than refusing to activate a paying customer: the record carries an Ed25519
 * signature, so plaintext costs confidentiality of the customer's own key, not
 * integrity.
 */
function activationFallbackPath(): string {
  return path.join(app.getPath('userData'), 'license-activation.json')
}

function parseActivation(raw: string): LocalActivation | null {
  let rec: Partial<LocalActivation>
  try {
    rec = JSON.parse(raw) as Partial<LocalActivation>
  } catch {
    return null
  }

  if (
    rec.version !== 2 ||
    !rec.email ||
    !rec.licenseKey ||
    !rec.deviceFingerprint ||
    !rec.issuedAt ||
    !rec.itemId ||
    !rec.expiresAt ||
    !rec.signature
  ) {
    return null
  }

  return {
    version: 2,
    email: rec.email,
    licenseKey: rec.licenseKey,
    itemId: rec.itemId,
    deviceFingerprint: rec.deviceFingerprint,
    deviceName: rec.deviceName ?? 'Unknown device',
    issuedAt: rec.issuedAt,
    expiresAt: rec.expiresAt,
    lastValidatedAt: rec.lastValidatedAt ?? rec.issuedAt,
    signature: rec.signature,
  }
}

function readActivation(): LocalActivation | null {
  try {
    const settings = readSettings() as Record<string, unknown>
    const raw = settings[ACTIVATION_SETTINGS_KEY]
    if (typeof raw === 'string' && safeStorage.isEncryptionAvailable()) {
      const parsed = parseActivation(safeStorage.decryptString(Buffer.from(raw, 'base64')))
      if (parsed) return parsed
    }
  } catch {
    /* fall through to the plaintext fallback */
  }

  try {
    return parseActivation(fs.readFileSync(activationFallbackPath(), 'utf8'))
  } catch {
    return null
  }
}

function writeActivation(activation: LocalActivation): boolean {
  if (!signatureIsValid(activation)) return false

  const json = JSON.stringify(activation)
  let stored = false

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const settings = readSettings() as Record<string, unknown>
      settings[ACTIVATION_SETTINGS_KEY] = safeStorage.encryptString(json).toString('base64')
      writeSettings(settings)
      stored = true
    }
  } catch (error) {
    log.warn('Could not store the activation in the OS keyring', error)
  }

  try {
    fs.mkdirSync(path.dirname(activationFallbackPath()), { recursive: true })
    fs.writeFileSync(activationFallbackPath(), json, 'utf8')
    stored = true
  } catch (error) {
    log.warn('Could not store the activation fallback file', error)
  }

  return stored
}

function clearActivation(): void {
  try {
    const settings = readSettings() as Record<string, unknown>
    delete settings[ACTIVATION_SETTINGS_KEY]
    writeSettings(settings)
  } catch {
    /* nothing to clear */
  }

  try {
    fs.rmSync(activationFallbackPath(), { force: true })
  } catch {
    /* nothing to clear */
  }
}

/** Consecutive explicit `valid:false` answers, reset by any success. */
let consecutiveInvalidAnswers = 0

/** Lets the renderer re-read its state instead of waiting up to 15 minutes. */
function notifyLicenseStateChanged(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send(LICENSE_STATE_CHANGED_CHANNEL)
  }
}

async function validateActivationOnline(): Promise<{ valid: boolean; checked: boolean; expiresAt?: string }> {
  if (!app.isPackaged) return { valid: true, checked: false }

  const activation = readActivation()
  if (!activation || !signatureIsValid(activation)) return { valid: false, checked: false }

  try {
    const response = await fetchWithTimeout(`${getLicenseServerBaseUrl()}/api/license/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: activation.email,
        licenseKey: activation.licenseKey,
        deviceFingerprint: activation.deviceFingerprint,
        deviceName: activation.deviceName,
      }),
    })
    const data = (await response.json().catch(() => ({}))) as {
      valid?: boolean
      expiresAt?: string
      activation?: Omit<LocalActivation, 'signature'>
      signature?: string
    }

    if (response.ok && data.valid === true) {
      consecutiveInvalidAnswers = 0

      // The server re-signs the certificate so the rolled-forward `expiresAt`
      // arrives with a matching signature. Writing a new `expiresAt` onto the
      // old certificate invalidates its signature and would be rejected, which
      // is why the previous implementation silently discarded every renewal and
      // locked out customers at day 44 despite them revalidating perfectly.
      if (data.activation && data.signature) {
        const refreshed: LocalActivation = { ...data.activation, signature: data.signature }
        if (!writeActivation(refreshed)) {
          log.warn('Revalidation succeeded but the refreshed certificate could not be stored')
        }
      } else {
        log.warn('Revalidation succeeded without a refreshed certificate; expiry left unchanged')
      }

      notifyLicenseStateChanged()
      return { valid: true, checked: true, expiresAt: data.expiresAt }
    }

    if (response.ok && data.valid === false) {
      // Do not wipe the activation on a single answer: one transient server or
      // database hiccup must not lock out a paying customer on the spot.
      consecutiveInvalidAnswers += 1
      if (consecutiveInvalidAnswers >= MAX_INVALID_BEFORE_CLEAR) {
        log.warn(
          `License reported invalid ${consecutiveInvalidAnswers} times in a row; clearing the local activation`
        )
        clearActivation()
        notifyLicenseStateChanged()
      } else {
        log.warn(
          `License reported invalid (${consecutiveInvalidAnswers}/${MAX_INVALID_BEFORE_CLEAR}); keeping it pending`
        )
      }
    }

    return { valid: false, checked: true }
  } catch (error) {
    log.warn('Online license revalidation unavailable; retaining offline activation', error)
    return { valid: true, checked: false }
  }
}

function getActivationState() {
  const currentFingerprint = getDeviceFingerprint()
  const activation = readActivation()

  // Also advances the clock high-water mark, which protects both the trial and
  // the activated window from a rolled-back system clock.
  const { start, effectiveNow, clockTampered } = ensureTrialRecord()
  const now = effectiveNow

  // No activation yet → we are on the free trial clock.
  if (!activation) {
    const trialEndsAt = start + TRIAL_PERIOD_MS
    const msLeft = trialEndsAt - now
    const trialActive = msLeft > 0
    const trialDaysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)))

    return {
      status: (trialActive ? 'trial' : 'trial_expired') as LicenseStatus,
      activated: false,
      locked: !trialActive,
      clockTampered,
      trialDaysLeft,
      trialEndsAt: new Date(trialEndsAt).toISOString(),
      deviceFingerprint: currentFingerprint,
      deviceName: getDeviceName(),
    }
  }

  const signatureValid = signatureIsValid(activation)
  const boundToCurrentDevice = activation.deviceFingerprint === currentFingerprint
  const expiresAt = new Date(activation.expiresAt).getTime()
  const graceEndsAt = expiresAt + GRACE_PERIOD_MS

  let status: LicenseStatus
  if (!signatureValid || !boundToCurrentDevice) status = 'expired'
  else if (now <= expiresAt) status = 'active'
  else if (now <= graceEndsAt) status = 'grace'
  else status = 'expired'

  const msUntilExpiry = expiresAt - now
  const daysUntilExpiry = Math.max(0, Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000)))
  const graceDaysLeft = Math.max(0, Math.ceil((graceEndsAt - now) / (24 * 60 * 60 * 1000)))

  return {
    status,
    activated: (status === 'active' || status === 'grace') && signatureValid && boundToCurrentDevice,
    // Only fully gated when the license is invalid or the grace window is over.
    locked: status === 'expired',
    signatureValid,
    boundToCurrentDevice,
    clockTampered,
    daysUntilExpiry,
    graceDaysLeft,
    deviceFingerprint: currentFingerprint,
    deviceName: getDeviceName(),
    activation: {
      email: activation.email,
      licenseKey: activation.licenseKey,
      itemId: activation.itemId,
      deviceFingerprint: activation.deviceFingerprint,
      deviceName: activation.deviceName,
      issuedAt: activation.issuedAt,
      expiresAt: activation.expiresAt,
      lastValidatedAt: activation.lastValidatedAt,
    },
  }
}

export function registerLicenseHandlers(): void {
  ipcMain.handle('license:getDeviceFingerprint', async () => {
    return {
      deviceFingerprint: getDeviceFingerprint(),
      deviceName: getDeviceName(),
      serverBaseUrl: getLicenseServerBaseUrl(),
      appVersion: app.getVersion(),
    }
  })

  ipcMain.handle('license:validateOnline', async () => validateActivationOnline())

  ipcMain.handle('license:getState', async () => getActivationState())

  ipcMain.handle(
    'license:activateOnline',
    async (_event, payload: { email?: string; licenseKey?: string }) => {
      const email = String(payload?.email ?? '').trim().toLowerCase()
      const licenseKey = String(payload?.licenseKey ?? '').trim().toUpperCase()

      if (!email || !licenseKey) {
        return { ok: false, error: 'Email and license key are required' }
      }

      const deviceFingerprint = getDeviceFingerprint()
      const deviceName = getDeviceName()
      const baseUrl = getLicenseServerBaseUrl()

      try {
        const res = await fetchWithTimeout(`${baseUrl}/api/license/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            licenseKey,
            deviceFingerprint,
            deviceName,
          }),
        })

        const data = (await res.json().catch(() => ({}))) as {
          activation?: Omit<LocalActivation, 'signature'>
          signature?: string
          error?: string
          code?: string
        }

        if (!res.ok || !data.activation || !data.signature) {
          return {
            ok: false,
            error: data.error ?? 'Activation failed',
            code: data.code,
          }
        }

        const activation: LocalActivation = { ...data.activation, signature: data.signature }
        if (!writeActivation(activation)) {
          return { ok: false, error: 'Secure license activation is unavailable. Contact support.' }
        }

        return {
          ok: true,
          activationState: getActivationState(),
        }
      } catch (error) {
        log.error('license:activateOnline failed', error)
        return {
          ok: false,
          error: (error as Error).message,
        }
      }
    }
  )

  if (app.isPackaged) {
    void validateActivationOnline()
    setInterval(() => void validateActivationOnline(), REVALIDATION_INTERVAL_MS).unref()
  }
}
