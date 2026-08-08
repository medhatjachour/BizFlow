import { app, ipcMain } from 'electron'
import crypto from 'node:crypto'
import os from 'node:os'

import { createLogger } from '../../utils/logger'
import { readSettings, writeSettings } from '../../utils/module-settings'

const log = createLogger('License')
const ACTIVATION_SETTINGS_KEY = 'licenseActivation'

interface LocalActivation {
  email: string
  licenseKey: string
  itemId: string
  deviceFingerprint: string
  deviceName: string
  activatedAt: string
  checksum: string
}

function checksumFor(data: Omit<LocalActivation, 'checksum'>): string {
  return crypto
    .createHash('sha256')
    .update(
      [
        data.email.trim().toLowerCase(),
        data.licenseKey.trim().toUpperCase(),
        data.itemId,
        data.deviceFingerprint,
        data.deviceName,
        data.activatedAt,
        'bizflow-license-activation-v1',
      ].join('|')
    )
    .digest('hex')
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
  if (!raw || typeof raw !== 'object') return null

  const rec = raw as Partial<LocalActivation>
  if (!rec.email || !rec.licenseKey || !rec.deviceFingerprint || !rec.activatedAt || !rec.itemId || !rec.checksum) {
    return null
  }

  return {
    email: rec.email,
    licenseKey: rec.licenseKey,
    itemId: rec.itemId,
    deviceFingerprint: rec.deviceFingerprint,
    deviceName: rec.deviceName ?? 'Unknown device',
    activatedAt: rec.activatedAt,
    checksum: rec.checksum,
  }
}

function writeActivation(activation: Omit<LocalActivation, 'checksum'>): void {
  const full: LocalActivation = {
    ...activation,
    checksum: checksumFor(activation),
  }

  const settings = readSettings() as Record<string, unknown>
  settings[ACTIVATION_SETTINGS_KEY] = full
  writeSettings(settings)
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

  const expectedChecksum = checksumFor({
    email: activation.email,
    licenseKey: activation.licenseKey,
    itemId: activation.itemId,
    deviceFingerprint: activation.deviceFingerprint,
    deviceName: activation.deviceName,
    activatedAt: activation.activatedAt,
  })

  const checksumValid = activation.checksum === expectedChecksum
  const boundToCurrentDevice = activation.deviceFingerprint === currentFingerprint

  return {
    activated: checksumValid && boundToCurrentDevice,
    checksumValid,
    boundToCurrentDevice,
    deviceFingerprint: currentFingerprint,
    deviceName: getDeviceName(),
    activation: {
      email: activation.email,
      licenseKey: activation.licenseKey,
      itemId: activation.itemId,
      deviceFingerprint: activation.deviceFingerprint,
      deviceName: activation.deviceName,
      activatedAt: activation.activatedAt,
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
          activation?: {
            itemId: string
            activatedAt: string
          }
          error?: string
          code?: string
        }

        if (!res.ok || !data.activation) {
          return {
            ok: false,
            error: data.error ?? 'Activation failed',
            code: data.code,
          }
        }

        writeActivation({
          email,
          licenseKey,
          itemId: data.activation.itemId,
          deviceFingerprint,
          deviceName,
          activatedAt: data.activation.activatedAt,
        })

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
