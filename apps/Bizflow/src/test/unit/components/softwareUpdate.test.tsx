import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import GeneralSettings from '../../../renderer/src/pages/Settings/GeneralSettings'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { translate } from '../../../renderer/src/i18n/translations'

// The licence panel has its own suite; it is stubbed so a failure here always
// points at the update card.
vi.mock('../../../renderer/src/pages/Settings/LicenseActivation', () => ({
  default: () => null
}))

/**
 * The Settings → General "Software update" card.
 *
 * Two behaviours here were broken by design rather than by typo. A background
 * download takes minutes, so progress has to be visible instead of implied by a
 * percentage in a sentence; and the "downloaded" event fires once, so the offer
 * to restart must survive the manual checks the user runs afterwards — otherwise
 * anyone who answered "Later" to the modal was left with no way to install.
 */

type EventName = 'available' | 'progress' | 'downloaded' | 'none' | 'error'
type Listener = (payload?: { version?: string; percent?: number; message?: string }) => void

interface UpdaterStub {
  getVersion: ReturnType<typeof vi.fn>
  check: ReturnType<typeof vi.fn>
  install: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  /** Fires an event on every live subscription. */
  emit: (event: EventName, payload?: { version?: string; percent?: number; message?: string }) => void
}

function stubApi(): UpdaterStub {
  const listeners = new Map<EventName, Set<Listener>>()
  const updater: UpdaterStub = {
    getVersion: vi.fn().mockResolvedValue('1.0.0'),
    check: vi.fn().mockResolvedValue({ status: 'checking', version: '1.0.0' }),
    install: vi.fn().mockResolvedValue({ ok: true }),
    on: vi.fn((event: EventName, cb: Listener) => {
      const set = listeners.get(event) ?? new Set<Listener>()
      set.add(cb)
      listeners.set(event, set)
      return () => set.delete(cb)
    }),
    emit: (event, payload) => {
      listeners.get(event)?.forEach((cb) => cb(payload))
    }
  }
  ;(window as unknown as { api: unknown }).api = {
    updater,
    license: {
      getState: vi.fn().mockResolvedValue({ status: 'none', activated: false }),
      onStateChanged: vi.fn().mockReturnValue(() => {})
    },
    modules: { getEnabled: vi.fn().mockResolvedValue([]) },
    language: { get: vi.fn().mockResolvedValue('en'), set: vi.fn().mockResolvedValue('en') }
  }
  return updater
}

function renderSettings() {
  return render(
    <LanguageProvider>
      <GeneralSettings
        theme="system"
        onThemeChange={() => {}}
        actualTheme="light"
        language="en"
        onLanguageChange={() => {}}
      />
    </LanguageProvider>
  )
}

const en = (key: string, params?: Record<string, string | number>): string =>
  translate('en', key, params)

/** Fires a main-process event the way the preload bridge does, inside `act`. */
const emit = (
  event: EventName,
  payload?: { version?: string; percent?: number; message?: string }
): void => {
  act(() => updater.emit(event, payload))
}

let updater: UpdaterStub

beforeEach(() => {
  localStorage.setItem('language', 'en')
  updater = stubApi()
})

async function renderReady() {
  const view = renderSettings()
  await waitFor(() => expect(updater.getVersion).toHaveBeenCalled())
  return view
}

describe('SoftwareUpdate card', () => {
  it('labels the installed version in Latin digits regardless of UI direction', async () => {
    await renderReady()
    const label = await screen.findByText('BizFlow v1.0.0')
    // The version is a Latin string inside an Arabic-first UI; the surrounding
    // direction must not be allowed to reorder it.
    expect(label.getAttribute('dir')).toBe('ltr')
  })

  it('starts idle and announces status changes politely', async () => {
    await renderReady()
    const status = await screen.findByRole('status')
    expect(status.textContent).toBe(en('updIdle'))
    expect(status.getAttribute('aria-live')).toBe('polite')
  })

  it('draws a real progress bar while the download runs', async () => {
    await renderReady()
    emit('available', { version: '1.1.0' })
    emit('progress', { version: '1.1.0', percent: 42 })

    const bar = await screen.findByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('42')
    expect(bar.firstElementChild?.getAttribute('style')).toContain('width: 42%')
    expect(screen.getByRole('status').textContent).toBe(en('updDownloading', { percent: 42 }))
  })

  it('clamps an out-of-range percentage rather than overflowing the track', async () => {
    await renderReady()
    emit('progress', { percent: 140 })
    const bar = await screen.findByRole('progressbar')
    expect(bar.firstElementChild?.getAttribute('style')).toContain('width: 100%')
  })

  it('replaces the progress bar with a restart offer once downloaded', async () => {
    await renderReady()
    emit('progress', { percent: 90 })
    emit('downloaded', { version: '1.1.0' })

    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull())
    const restart = await screen.findByRole('button', { name: en('updRestartButton') })
    expect(screen.getByRole('status').textContent).toBe(en('updDownloaded', { version: '1.1.0' }))

    await act(async () => {
      fireEvent.click(restart)
    })
    expect(updater.install).toHaveBeenCalledTimes(1)
  })

  it('keeps the restart offer when a later manual check reports "up to date"', async () => {
    await renderReady()
    emit('downloaded', { version: '1.1.0' })
    await screen.findByRole('button', { name: en('updRestartButton') })

    updater.check.mockResolvedValueOnce({ status: 'checking', version: '1.0.0' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en('updCheckButton') }))
    })
    emit('none')

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(en('updUpToDate')))
    expect(screen.getByRole('button', { name: en('updRestartButton') })).toBeTruthy()
  })

  it('colours the status by meaning so an error is not mistaken for progress', async () => {
    await renderReady()
    emit('error', { message: 'offline' })

    const status = await screen.findByRole('status')
    expect(status.textContent).toBe(en('updError', { message: 'offline' }))
    expect(status.className).toContain('rose')

    emit('none')
    await waitFor(() => expect(status.className).toContain('emerald'))
  })

  it('falls back to translated copy when a check fails without a message', async () => {
    await renderReady()
    updater.check.mockResolvedValueOnce({ status: 'error' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en('updCheckButton') }))
    })
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        en('updError', { message: en('updUnknownError') })
      )
    )
  })

  it('says so when running from source instead of failing silently', async () => {
    await renderReady()
    updater.check.mockResolvedValueOnce({ status: 'dev' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en('updCheckButton') }))
    })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(en('updDevOnly')))
  })

  it('reports a refused install instead of pretending the app will restart', async () => {
    await renderReady()
    emit('downloaded', { version: '1.1.0' })
    updater.install.mockResolvedValueOnce({ ok: false, reason: 'dev' })

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: en('updRestartButton') }))
    })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(en('updDevOnly')))
  })

  it('renders every status string in Arabic too', async () => {
    localStorage.setItem('language', 'ar')
    const view = renderSettings()
    await waitFor(() => expect(updater.getVersion).toHaveBeenCalled())

    emit('progress', { percent: 7 })
    expect((await screen.findByRole('status')).textContent).toBe(
      translate('ar', 'updDownloading', { percent: 7 })
    )

    emit('downloaded', { version: '1.1.0' })
    await screen.findByRole('button', { name: translate('ar', 'updRestartButton') })
    expect(view.container.textContent).toContain(translate('ar', 'updCheckButton'))
    expect(view.container.textContent).toContain(translate('ar', 'updInstalledVersion'))
  })
})
