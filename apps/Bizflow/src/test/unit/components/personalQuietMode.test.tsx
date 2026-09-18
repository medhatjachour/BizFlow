/**
 * Quiet mode in the renderer (spec section 3, "Do Not Disturb trigger").
 *
 * The rules pinned here are the ones a UI test cannot see by looking at the
 * screen:
 *
 *  1. the settings survive a corrupt or hand-edited `localStorage` entry, and a
 *     stored command is capped the same way the main process caps it;
 *  2. a quiet session holds back routine messages but never a failure, and it
 *     reports what it held back instead of dropping it;
 *  3. the operator's commands run on the *edges* of a session — a slow poll
 *     would otherwise re-run them every tick — and a hook that could not run is
 *     surfaced rather than swallowed.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { ToastProvider } from '../../../renderer/src/contexts/ToastContext'
import QuietModePanel from '../../../renderer/src/plugins/personal/pages/focus/QuietModePanel'
import {
  EMPTY_QUIET_MODE,
  QUIET_COMMAND_MAX_LENGTH,
  QUIET_MODE_STORAGE_KEY,
  hasQuietHook,
  normalizeQuietMode,
  quietReasonKey,
  readQuietMode,
  writeQuietMode
} from '../../../renderer/src/plugins/personal/pages/hooks/useQuietMode'
import {
  addMutedToast,
  applyQuietSession,
  getQuietState,
  isQuietActive,
  resetQuietRuntime,
  runQuietHook,
  setQuietReporter,
  shouldMuteToast,
  syncQuietEnabled,
  takeMutedCount,
  wrapQuietToast
} from '../../../renderer/src/plugins/personal/pages/hooks/useQuietRuntime'
import { translations } from '../../../renderer/src/i18n/translations'

const en = translations.en

const wrap = (ui: React.ReactElement) =>
  render(
    <LanguageProvider>
      <ToastProvider>{ui}</ToastProvider>
    </LanguageProvider>
  )

/** `FormInput` renders a bare `<label>`, so the control is reached from it. */
function fieldInput(label: string): HTMLInputElement {
  const labelNode = screen.getAllByText(label)[0]
  const input = labelNode.parentElement?.querySelector('input')
  if (!input) throw new Error(`No input found for the field labelled "${label}"`)
  return input
}

/** `window.api` is installed by the shared setup as a writable property. */
function mountQuietApi(hookResult: unknown = { ok: true }) {
  const quietHook = vi.fn().mockResolvedValue(hookResult)
  const getActive = vi.fn().mockResolvedValue(null)
  ;(window as unknown as { api: unknown }).api = { personal: { focus: { quietHook, getActive } } }
  return { quietHook, getActive }
}

function storeQuietMode(settings: { enabled: boolean; enterCommand?: string; exitCommand?: string }): void {
  writeQuietMode({
    enabled: settings.enabled,
    enterCommand: settings.enterCommand ?? '',
    exitCommand: settings.exitCommand ?? ''
  })
}

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('language', 'en')
  vi.clearAllMocks()
  resetQuietRuntime()
  setQuietReporter(null)
})

describe('quiet-mode settings', () => {
  it('falls back to the empty settings for anything unrecognisable', () => {
    expect(normalizeQuietMode(null)).toEqual(EMPTY_QUIET_MODE)
    expect(normalizeQuietMode('  focus-on  ')).toEqual(EMPTY_QUIET_MODE)
    expect(normalizeQuietMode({ enabled: 'yes', enterCommand: 7 })).toEqual(EMPTY_QUIET_MODE)
  })

  it('trims the commands and caps them at the main-process limit', () => {
    const long = 'x'.repeat(QUIET_COMMAND_MAX_LENGTH + 50)
    const clean = normalizeQuietMode({ enabled: true, enterCommand: `  ${long}  `, exitCommand: 'off.exe' })

    expect(clean.enabled).toBe(true)
    expect(clean.enterCommand).toHaveLength(QUIET_COMMAND_MAX_LENGTH)
    expect(clean.exitCommand).toBe('off.exe')
  })

  it('survives a corrupt entry instead of breaking a focus session', () => {
    window.localStorage.setItem(QUIET_MODE_STORAGE_KEY, '{not json')
    expect(readQuietMode()).toEqual(EMPTY_QUIET_MODE)

    storeQuietMode({ enabled: true, enterCommand: 'focus-on.exe' })
    expect(readQuietMode()).toEqual({ enabled: true, enterCommand: 'focus-on.exe', exitCommand: '' })
  })

  it('knows when there is actually something to run', () => {
    expect(hasQuietHook(EMPTY_QUIET_MODE)).toBe(false)
    expect(hasQuietHook({ ...EMPTY_QUIET_MODE, exitCommand: 'focus-off.exe' })).toBe(true)
  })

  it('maps every main-process reason to copy, and an unknown one to a fallback', () => {
    expect(quietReasonKey('unsafe_characters')).toBe('pwQuietReason_unsafe_characters')
    expect(quietReasonKey('desktop_only')).toBe('pwQuietReason_desktop_only')
    expect(quietReasonKey('something_new')).toBe('pwQuietReason_unknown')
    expect(quietReasonKey(undefined)).toBe('pwQuietReason_unknown')
    // The keys are real translations, so the fallback path is not dead copy.
    for (const key of ['pwQuietReason_unsafe_characters', 'pwQuietReason_unknown', 'pwQuietReason_timeout']) {
      expect(en[key as keyof typeof en]).toBeTruthy()
    }
  })
})

describe('quiet-mode toast gate', () => {
  const spyToast = () => ({
    showToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })

  it('never holds back an error', () => {
    expect(shouldMuteToast('error', true)).toBe(false)
    expect(shouldMuteToast('success', true)).toBe(true)
    expect(shouldMuteToast('warning', true)).toBe(true)
    expect(shouldMuteToast('info', true)).toBe(true)
    // With quiet mode off nothing is held back at all.
    expect(shouldMuteToast('info', false)).toBe(false)
  })

  it('counts the held-back messages instead of showing them', () => {
    const toast = spyToast()
    const onMuted = vi.fn()
    const quiet = wrapQuietToast(toast, () => true, onMuted)

    quiet.success('saved')
    quiet.warning('careful')
    quiet.info('fyi')
    quiet.showToast('info', 'also fyi')
    quiet.error('failed')

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.warning).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
    expect(onMuted).toHaveBeenCalledTimes(4)
    expect(toast.error).toHaveBeenCalledWith('failed', undefined)
  })

  it('passes everything through when the session ends', () => {
    const toast = spyToast()
    const quiet = wrapQuietToast(toast, () => false, vi.fn())

    quiet.info('fyi')
    expect(toast.info).toHaveBeenCalledWith('fyi', undefined)
  })

  it('reads and clears the counter', () => {
    addMutedToast()
    addMutedToast(2)
    expect(getQuietState().mutedCount).toBe(3)
    expect(takeMutedCount()).toBe(3)
    expect(takeMutedCount()).toBe(0)
  })
})

describe('quiet-mode session edges', () => {
  it('runs the enter command once per session and the exit command on the way out', async () => {
    const { quietHook } = mountQuietApi()
    storeQuietMode({ enabled: true, enterCommand: 'focus-on.exe', exitCommand: 'focus-off.exe' })

    await applyQuietSession({ id: 'session-1' })
    expect(quietHook).toHaveBeenCalledTimes(1)
    expect(quietHook).toHaveBeenLastCalledWith('focus-on.exe')
    expect(isQuietActive()).toBe(true)

    // A poll that sees the same session must not re-run the command.
    await applyQuietSession({ id: 'session-1' })
    expect(quietHook).toHaveBeenCalledTimes(1)

    await applyQuietSession(null)
    expect(quietHook).toHaveBeenCalledTimes(2)
    expect(quietHook).toHaveBeenLastCalledWith('focus-off.exe')
    expect(isQuietActive()).toBe(false)
  })

  it('changes nothing on the machine while the feature is off', async () => {
    const { quietHook } = mountQuietApi()
    storeQuietMode({ enabled: false, enterCommand: 'focus-on.exe' })

    await applyQuietSession({ id: 'session-1' })
    await applyQuietSession(null)

    expect(quietHook).not.toHaveBeenCalled()
    expect(getQuietState().active).toBe(false)
  })

  it('follows a toggle made in the panel without a restart', async () => {
    mountQuietApi()
    storeQuietMode({ enabled: true, enterCommand: 'focus-on.exe' })

    await applyQuietSession({ id: 'session-1' })
    expect(getQuietState().enabled).toBe(true)

    storeQuietMode({ enabled: false, enterCommand: 'focus-on.exe' })
    syncQuietEnabled()
    expect(getQuietState().enabled).toBe(false)
  })

  it('reports a hook that could not run, and one the bridge never reached', async () => {
    const onHookFailed = vi.fn()
    setQuietReporter({ onHookFailed, onMutedSummary: vi.fn() })
    mountQuietApi({ ok: false, reason: 'timeout' })
    storeQuietMode({ enabled: true, enterCommand: 'focus-on.exe', exitCommand: 'focus-off.exe' })

    await applyQuietSession({ id: 'session-1' })
    expect(onHookFailed).toHaveBeenCalledWith('timeout', 'enter')

    ;(window as unknown as { api: unknown }).api = {}
    await applyQuietSession(null)
    expect(onHookFailed).toHaveBeenLastCalledWith('desktop_only', 'exit')
  })

  it('announces the held-back messages once the session ends', async () => {
    const onMutedSummary = vi.fn()
    setQuietReporter({ onHookFailed: vi.fn(), onMutedSummary })
    mountQuietApi()
    storeQuietMode({ enabled: true })

    await applyQuietSession({ id: 'session-1' })
    addMutedToast()
    addMutedToast()
    expect(onMutedSummary).not.toHaveBeenCalled()

    await applyQuietSession(null)
    expect(onMutedSummary).toHaveBeenCalledWith(2)
    expect(getQuietState().mutedCount).toBe(0)

    // A second session with nothing held back stays silent.
    await applyQuietSession({ id: 'session-2' })
    await applyQuietSession(null)
    expect(onMutedSummary).toHaveBeenCalledTimes(1)
  })

  it('answers a missing bridge without throwing', async () => {
    ;(window as unknown as { api: unknown }).api = {}
    await expect(runQuietHook('focus-on.exe')).resolves.toEqual({ ok: false, reason: 'desktop_only' })
  })
})

describe('QuietModePanel', () => {
  it('starts switched off and persists a toggle', async () => {
    mountQuietApi()
    wrap(<QuietModePanel />)

    const toggle = screen.getByRole('checkbox')
    expect(toggle).not.toBeChecked()

    fireEvent.click(toggle)

    await waitFor(() => expect(readQuietMode().enabled).toBe(true))
    expect(getQuietState().enabled).toBe(true)
    expect(screen.getByText(en.pwQuietStateIdle)).toBeInTheDocument()
  })

  it('keeps the commands capped and stored', async () => {
    mountQuietApi()
    wrap(<QuietModePanel />)

    const enter = fieldInput(en.pwQuietEnterCommand)
    expect(enter).toHaveAttribute('maxlength', String(QUIET_COMMAND_MAX_LENGTH))

    fireEvent.change(enter, { target: { value: 'focus-on.exe --quiet' } })
    await waitFor(() => expect(readQuietMode().enterCommand).toBe('focus-on.exe --quiet'))

    fireEvent.change(fieldInput(en.pwQuietExitCommand), { target: { value: 'focus-off.exe' } })
    await waitFor(() => expect(readQuietMode().exitCommand).toBe('focus-off.exe'))
    // Editing a command must not switch the feature on behind the operator.
    expect(readQuietMode().enabled).toBe(false)
  })

  it('asks for a command before it will test one', async () => {
    const { quietHook } = mountQuietApi()
    wrap(<QuietModePanel />)

    fireEvent.click(screen.getByRole('button', { name: en.pwQuietTestEnter }))

    expect(await screen.findByText(en.pwQuietNoCommand)).toBeInTheDocument()
    expect(quietHook).not.toHaveBeenCalled()
  })

  it('runs the stored command and reports the verdict', async () => {
    const { quietHook } = mountQuietApi()
    storeQuietMode({ enabled: true, enterCommand: 'focus-on.exe' })
    wrap(<QuietModePanel />)

    fireEvent.click(screen.getByRole('button', { name: en.pwQuietTestEnter }))

    expect(await screen.findByText(en.pwQuietHookOk)).toBeInTheDocument()
    expect(quietHook).toHaveBeenCalledWith('focus-on.exe')
  })

  it('names the reason the main process refused a command', async () => {
    const { quietHook } = mountQuietApi({ ok: false, reason: 'unsafe_characters' })
    storeQuietMode({ enabled: true, enterCommand: 'focus-on.exe; rm -rf /' })
    wrap(<QuietModePanel />)

    fireEvent.click(screen.getByRole('button', { name: en.pwQuietTestEnter }))

    expect(await screen.findByText(`${en.pwQuietHookFailed} · ${en.pwQuietReason_unsafe_characters}`)).toBeInTheDocument()
    expect(quietHook).toHaveBeenCalledWith('focus-on.exe; rm -rf /')
  })
})
