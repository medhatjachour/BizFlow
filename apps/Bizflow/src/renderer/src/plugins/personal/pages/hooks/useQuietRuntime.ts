import { useMemo, useSyncExternalStore } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { readQuietMode } from './useQuietMode'

/**
 * Quiet-mode runtime (spec section 3): what a running deep-work session does to
 * the app and to the machine.
 *
 * Three things happen while a session is open, and all three hang off the same
 * state:
 *   1. non-error toasts are held back, so a focus block is not interrupted by
 *      background chatter; errors always get through, and the held-back count is
 *      announced once the session ends;
 *   2. the operator's own "go quiet" command runs on the start edge, and their
 *      "come back" command on the stop edge (only when the feature is enabled);
 *   3. the focus screens show that quiet mode is on.
 *
 * The state lives in a module store rather than in React context because the
 * focus screens that start and stop sessions sit several levels below the shell
 * that reports problems. `readQuietMode()` stays the single source of truth for
 * the settings; the store only mirrors the `enabled` flag for display and for
 * the toast gate, and re-reads it on every poll, so a toggle in the panel cannot
 * drift from what the screens show.
 */

export interface QuietRuntimeState {
  /** A focus session is open. */
  active: boolean
  /** The feature is switched on in the settings. */
  enabled: boolean
  /** Toasts suppressed since the current session started. */
  mutedCount: number
}

export type QuietReporter = {
  onHookFailed: (reason: string, phase: 'enter' | 'exit') => void
  onMutedSummary: (count: number) => void
}

export type QuietToastKind = 'success' | 'error' | 'warning' | 'info'

export type QuietToast = {
  showToast: (type: QuietToastKind, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

/** Errors are never held back: a failed save must not look like a success. */
export function shouldMuteToast(kind: QuietToastKind, quiet: boolean): boolean {
  return quiet && kind !== 'error'
}

let state: QuietRuntimeState = { active: false, enabled: false, mutedCount: 0 }
const listeners = new Set<() => void>()
let reporter: QuietReporter | null = null

function setState(next: Partial<QuietRuntimeState>): void {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getState(): QuietRuntimeState {
  return state
}

export function getQuietState(): QuietRuntimeState {
  return state
}

export function useQuietState(): QuietRuntimeState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/** The shell registers how quiet-mode problems are surfaced. */
export function setQuietReporter(next: QuietReporter | null): void {
  reporter = next
}

/** Quiet mode is on only when the feature is enabled *and* a session runs. */
export function isQuietActive(): boolean {
  return state.active && state.enabled
}

/**
 * Re-reads the setting. The panel calls this after a toggle so the pill, the
 * toast gate and the next edge all follow the switch immediately, without a
 * second copy of the settings to keep in sync.
 */
export function syncQuietEnabled(): void {
  const enabled = readQuietMode().enabled
  if (enabled !== state.enabled) setState({ enabled })
}

export function addMutedToast(count = 1): void {
  setState({ mutedCount: state.mutedCount + count })
}

/** Reads and clears the suppressed-toast count. */
export function takeMutedCount(): number {
  const count = state.mutedCount
  if (count > 0) setState({ mutedCount: 0 })
  return count
}

/** Test seam: the store outlives a single mounted component. */
export function resetQuietRuntime(): void {
  setState({ active: false, enabled: false, mutedCount: 0 })
}

/**
 * Wraps a toast API so that non-error messages are counted instead of shown
 * while quiet mode is on. Pure - the quiet check and the counter are injected.
 */
export function wrapQuietToast(
  toast: QuietToast,
  isQuiet: () => boolean,
  onMuted: () => void
): QuietToast {
  const wrap =
    (kind: QuietToastKind, run: (message: string, duration?: number) => void) =>
    (message: string, duration?: number): void => {
      if (shouldMuteToast(kind, isQuiet())) {
        onMuted()
        return
      }
      run(message, duration)
    }

  return {
    showToast: (kind, message, duration) => {
      if (shouldMuteToast(kind, isQuiet())) {
        onMuted()
        return
      }
      toast.showToast(kind, message, duration)
    },
    success: wrap('success', toast.success),
    error: wrap('error', toast.error),
    warning: wrap('warning', toast.warning),
    info: wrap('info', toast.info)
  }
}

/**
 * Every personal screen takes its toasts from here, so quiet mode is enforced in
 * one place instead of at each of the ~90 call sites.
 */
export function useQuietToast(): QuietToast {
  const toast = useToast()
  return useMemo(() => wrapQuietToast(toast, isQuietActive, () => addMutedToast()), [toast])
}

/**
 * Runs one command through the main process. Missing bridge (browser build,
 * older preload) reads as `desktop_only` rather than throwing.
 */
export async function runQuietHook(command: string): Promise<{ ok: boolean; reason?: string }> {
  const bridge = window.api?.personal?.focus?.quietHook
  if (typeof bridge !== 'function') return { ok: false, reason: 'desktop_only' }
  try {
    const result = await bridge(command)
    return result && typeof result === 'object' ? result : { ok: false, reason: 'spawn_failed' }
  } catch {
    return { ok: false, reason: 'spawn_failed' }
  }
}

/**
 * Applies a session state to the store and fires the edge that changed. Only the
 * edges matter: the poll below runs on a timer, and the operator's command must
 * run once per session, not once per tick.
 */
export async function applyQuietSession(session: unknown): Promise<void> {
  const nextActive = Boolean(session)
  const settings = readQuietMode()

  if (settings.enabled !== state.enabled) setState({ enabled: settings.enabled })
  if (nextActive === state.active) return

  setState({ active: nextActive })

  if (settings.enabled) {
    const command = (nextActive ? settings.enterCommand : settings.exitCommand).trim()
    if (command) {
      const result = await runQuietHook(command)
      if (!result.ok)
        reporter?.onHookFailed(result.reason ?? 'spawn_failed', nextActive ? 'enter' : 'exit')
    }
  }

  if (!nextActive) {
    const muted = takeMutedCount()
    if (muted > 0) reporter?.onMutedSummary(muted)
  }
}

/**
 * Re-reads the running session. The shell polls this, and the focus screens call
 * it straight after starting or stopping a timer so the machine reacts in the
 * same click instead of waiting for the next tick.
 */
export async function refreshQuietRuntime(): Promise<void> {
  const bridge = window.api?.personal?.focus?.getActive
  if (typeof bridge !== 'function') return
  try {
    await applyQuietSession(await bridge())
  } catch {
    // Keep the previous state: a failed poll is not evidence that the timer stopped.
  }
}
