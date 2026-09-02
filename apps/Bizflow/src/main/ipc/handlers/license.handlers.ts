import { app, ipcMain, safeStorage } from 'electron'
import crypto from 'node:crypto'
import os from 'node:os'

import { createLogger } from '../../utils/logger'
import { readSettings, writeSettings } from '../../utils/module-settings'

const log = createLogger('License')
const ACTIVATION_SETTINGS_KEY = 'licenseActivation'

interface LocalActivation {
  version: 1
  email: string
  licenseKey: string
  itemId: string
  deviceFingerprint: string
  deviceName: string
  issuedAt: string
  signature: string
}

function activationPayload(activation: Omit<LocalActivation, 'signature'>): string {
  return JSON.stringify(activation)
}

function signatureIsValid(activation: LocalActivation): boolean {
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

function getDeviceFingerprint(): string {
  const cpu = os.cpus()[0]?.model ?? ''
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.userInfo().username,
    cpu,
  ].join('|')

  return crypto.createHash('sha256').update(raw).digest('hex').toUpperCase()
}

function getDeviceName(): string {
  return `${os.hostname()} (${os.platform()}-${os.arch()})`
}

function getLicenseServerBaseUrl(): string {
  const fromEnv = process.env.BIZFLOW_LICENSE_API_BASE?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'https://bizflow.medhatjachour.tech'
}

function readActivation(): LocalActivation | null {
  const settings = readSettings() as Record<string, unknown>
  const raw = settings[ACTIVATION_SETTINGS_KEY]
  if (typeof raw !== 'string' || !safeStorage.isEncryptionAvailable()) return null

  let rec: Partial<LocalActivation>
  try {
    rec = JSON.parse(safeStorage.decryptString(Buffer.from(raw, 'base64'))) as Partial<LocalActivation>
  } catch {
    return null
  }

  if (rec.version !== 1 || !rec.email || !rec.licenseKey || !rec.deviceFingerprint || !rec.issuedAt || !rec.itemId || !rec.signature) return null

  return {
    version: 1,
    email: rec.email,
    licenseKey: rec.licenseKey,
    itemId: rec.itemId,
    deviceFingerprint: rec.deviceFingerprint,
    deviceName: rec.deviceName ?? 'Unknown device',
    issuedAt: rec.issuedAt,
    signature: rec.signature,
  }
}

function writeActivation(activation: LocalActivation): boolean {
  if (!safeStorage.isEncryptionAvailable() || !signatureIsValid(activation)) return false

  const settings = readSettings() as Record<string, unknown>
  settings[ACTIVATION_SETTINGS_KEY] = safeStorage.encryptString(JSON.stringify(activation)).toString('base64')
  writeSettings(settings)
  return true
}

function getActivationState() {
  const currentFingerprint = getDeviceFingerprint()
  const activation = readActivation()

  if (!activation) {
    return {
      activated: false,
      deviceFingerprint: currentFingerprint,
      deviceName: getDeviceName(),
    }
  }

  const signatureValid = signatureIsValid(activation)
  const boundToCurrentDevice = activation.deviceFingerprint === currentFingerprint

  return {
    activated: signatureValid && boundToCurrentDevice,
    signatureValid,
    boundToCurrentDevice,
    deviceFingerprint: currentFingerprint,
    deviceName: getDeviceName(),
    activation: {
      email: activation.email,
      licenseKey: activation.licenseKey,
      itemId: activation.itemId,
      deviceFingerprint: activation.deviceFingerprint,
      deviceName: activation.deviceName,
      issuedAt: activation.issuedAt,
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

  ipcMain.handle('license:getActivationState', async () => {
    return getActivationState()
  })

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
        const res = await fetch(`${baseUrl}/api/license/activate`, {
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
}
