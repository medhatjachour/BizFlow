/**
 * Auto-update IPC tests.
 *
 * Only two things in `src/main/updater.ts` are reachable without an Electron
 * runtime: the manual check and the on-request install. Both are pinned here
 * because a wrong argument to `quitAndInstall` fails quietly — the app would
 * install the update on the *next* launch instead of restarting now, which is
 * exactly the confusion this handler exists to remove.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const hoisted = vi.hoisted(() => ({
  handlers: new Map<string, () => unknown>(),
  packaged: false,
  quitAndInstall: vi.fn(),
  checkForUpdates: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    // Read at handler-call time so a test can flip it after wiring.
    get isPackaged() {
      return hoisted.packaged
    },
    getVersion: () => '1.0.0',
    getPath: () => process.cwd()
  },
  ipcMain: {
    handle: (channel: string, handler: () => unknown) => hoisted.handlers.set(channel, handler)
  },
  dialog: { showMessageBox: vi.fn(), showMessageBoxSync: vi.fn() },
  BrowserWindow: class {}
}))

vi.mock('electron-updater', () => ({
  default: {
    autoUpdater: {
      checkForUpdates: hoisted.checkForUpdates,
      quitAndInstall: hoisted.quitAndInstall,
      on: vi.fn(),
      logger: undefined,
      autoDownload: false,
      autoInstallOnAppQuit: false
    }
  }
}))

vi.mock('../../main/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))

import { setupAutoUpdater } from '../../main/updater'

/** The updater takes a window only to push events to it; `send` is never used here. */
const fakeWindow = {
  isDestroyed: () => false,
  webContents: { send: vi.fn() }
} as unknown as Parameters<typeof setupAutoUpdater>[0]

/**
 * `setupAutoUpdater` is idempotent (the `wired` guard), so wiring happens once and
 * each test just flips the packaging flag the handlers read at call time.
 */
function handlers(packaged: boolean): {
  check: () => Promise<unknown>
  install: () => Promise<{ ok: boolean; reason?: string }>
} {
  hoisted.packaged = packaged
  return {
    check: hoisted.handlers.get('update:check') as () => Promise<unknown>,
    install: hoisted.handlers.get('update:install') as () => Promise<{
      ok: boolean
      reason?: string
    }>
  }
}

beforeEach(() => {
  hoisted.packaged = false
  hoisted.quitAndInstall.mockClear()
  hoisted.checkForUpdates.mockReset().mockResolvedValue({})
  setupAutoUpdater(fakeWindow)
})

describe('update IPC', () => {
  it('registers both update channels, even in development', () => {
    expect(typeof hoisted.handlers.get('update:check')).toBe('function')
    expect(typeof hoisted.handlers.get('update:install')).toBe('function')
  })

  it('refuses to install from source instead of quitting the developer app', async () => {
    const { install } = handlers(false)
    expect(install()).toEqual({ ok: false, reason: 'dev' })
    expect(hoisted.quitAndInstall).not.toHaveBeenCalled()
  })

  it('installs silently-then-restarts: quitAndInstall(false, true)', async () => {
    const { install } = handlers(true)
    expect(install()).toEqual({ ok: true })
    // false → do not open the installer UI, true → relaunch after installing.
    expect(hoisted.quitAndInstall).toHaveBeenCalledWith(false, true)
  })

  it('reports the running version on a dev check rather than claiming an update', async () => {
    const { check } = handlers(false)
    await expect(check()).resolves.toEqual({ status: 'dev', version: '1.0.0' })
    expect(hoisted.checkForUpdates).not.toHaveBeenCalled()
  })

  it('surfaces a failed check as an error with its message, not as a rejection', async () => {
    hoisted.checkForUpdates.mockRejectedValueOnce(new Error('offline'))
    const { check } = handlers(true)
    await expect(check()).resolves.toMatchObject({ status: 'error', message: 'offline' })
  })
})
