import { useCallback, useState } from 'react'

/**
 * Quiet-mode settings for the deep-work timer (spec section 3).
 *
 * The operator's own do-not-disturb command is machine-local, not a business
 * record, so it lives in `localStorage` instead of earning a schema migration.
 * The parse/write helpers are exported apart from the hook so the storage
 * contract stays unit-testable without rendering anything.
 *
 * The command itself is executed by the Electron main process, which validates
 * it again - this module only keeps the field tidy.
 */

export interface QuietModeSettings {
  enabled: boolean
  enterCommand: string
  exitCommand: string
}

export const QUIET_MODE_STORAGE_KEY = 'personal:quietMode'

/** Mirrors the cap the main process enforces on the stored command. */
export const QUIET_COMMAND_MAX_LENGTH = 300

export const EMPTY_QUIET_MODE: QuietModeSettings = {
  enabled: false,
  enterCommand: '',
  exitCommand: ''
}

function shortCommand(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, QUIET_COMMAND_MAX_LENGTH) : ''
}

/** Collapses whitespace, caps length and refuses unknown keys. */
export function normalizeQuietMode(input: unknown): QuietModeSettings {
  if (!input || typeof input !== 'object') return EMPTY_QUIET_MODE
  const source = input as Record<string, unknown>
  return {
    enabled: source.enabled === true,
    enterCommand: shortCommand(source.enterCommand),
    exitCommand: shortCommand(source.exitCommand)
  }
}

/** True when at least one hook would actually run. */
export function hasQuietHook(settings: QuietModeSettings): boolean {
  return settings.enterCommand.length > 0 || settings.exitCommand.length > 0
}

/**
 * Main-process verdicts, mapped to copy. Kept as literal key strings (never
 * `t()` calls) so a reason the main process adds later degrades to `unknown`
 * instead of breaking the translation gates.
 */
const REASON_KEYS: Record<string, string> = {
  empty: 'pwQuietReason_empty',
  too_long: 'pwQuietReason_too_long',
  unsafe_characters: 'pwQuietReason_unsafe_characters',
  unbalanced_quotes: 'pwQuietReason_unbalanced_quotes',
  blocked_program: 'pwQuietReason_blocked_program',
  blocked_extension: 'pwQuietReason_blocked_extension',
  desktop_only: 'pwQuietReason_desktop_only',
  spawn_failed: 'pwQuietReason_spawn_failed',
  timeout: 'pwQuietReason_timeout',
  exit_code: 'pwQuietReason_exit_code'
}

export function quietReasonKey(reason?: string): string {
  return (reason && REASON_KEYS[reason]) || 'pwQuietReason_unknown'
}

/** A corrupt or hand-edited entry must never break a focus session. */
export function readQuietMode(): QuietModeSettings {
  try {
    const raw = window.localStorage.getItem(QUIET_MODE_STORAGE_KEY)
    if (!raw) return EMPTY_QUIET_MODE
    return normalizeQuietMode(JSON.parse(raw))
  } catch {
    return EMPTY_QUIET_MODE
  }
}

export function writeQuietMode(settings: QuietModeSettings): void {
  try {
    window.localStorage.setItem(QUIET_MODE_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private mode): the settings simply stop persisting.
  }
}

export function useQuietMode() {
  const [settings, setSettings] = useState<QuietModeSettings>(() => readQuietMode())

  const save = useCallback((next: QuietModeSettings) => {
    const clean = normalizeQuietMode(next)
    setSettings(clean)
    writeQuietMode(clean)
    return clean
  }, [])

  const setEnabled = useCallback(
    (enabled: boolean) => save({ ...readQuietMode(), enabled }),
    [save]
  )
  const setEnterCommand = useCallback(
    (enterCommand: string) => save({ ...readQuietMode(), enterCommand }),
    [save]
  )
  const setExitCommand = useCallback(
    (exitCommand: string) => save({ ...readQuietMode(), exitCommand }),
    [save]
  )

  return { settings, save, setEnabled, setEnterCommand, setExitCommand }
}
