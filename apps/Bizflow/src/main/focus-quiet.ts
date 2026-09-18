/**
 * Do Not Disturb trigger for the Personal work OS (spec section 3): while a
 * deep-work session runs, ask the machine to go quiet.
 *
 * BizFlow cannot toggle another application's focus mode by itself, so the
 * operator points a command at their own shortcut (a macOS Shortcuts name, a
 * Windows `.lnk`, a launcher script) and the renderer calls this module on the
 * edges of a session. Only the accelerator of the feature lives here - the
 * settings UI is renderer code.
 *
 * Nothing here is a general-purpose command runner:
 *   - the string is tokenised by us and never handed to a shell, so `;`, `|`,
 *     `&`, `>`, `<`, `$` and backticks are refused outright;
 *   - programs that re-parse their own argument list (shells, `wscript`,
 *     `mshta`, `rundll32`, `open`, `wsl`, ...) are refused as well, because they
 *     would undo the metacharacter rule;
 *   - a runaway hook is killed after a few seconds;
 *   - the channel is registered from the Electron main process only, so the
 *     bundled web bridge can never reach it, and a non-desktop runtime refuses
 *     to spawn at all.
 */
import { spawn } from 'node:child_process'
import { ipcMain } from 'electron'
import { getEnabledModuleIds } from './utils/module-settings'
import { createLogger } from './utils/logger'

const log = createLogger('QuietMode')

/** Renderer -> main: run one quiet-mode hook command. */
export const QUIET_HOOK_CHANNEL = 'personal:focus:quietHook'

export const QUIET_COMMAND_MAX_LENGTH = 300
export const QUIET_HOOK_TIMEOUT_MS = 5000

/** Rejected before tokenising: these would only matter to a shell. */
const UNSAFE_CHARACTERS = /[;&|<>$`\r\n]/

/**
 * Programs that either re-interpret their arguments or open an arbitrary
 * target, which defeats the no-shell tokenisation above. Matched on the base
 * name, with and without a `.exe` suffix.
 */
const BLOCKED_PROGRAMS = new Set([
  'cmd',
  'powershell',
  'pwsh',
  'sh',
  'bash',
  'zsh',
  'ksh',
  'wscript',
  'cscript',
  'mshta',
  'rundll32',
  'regsvr32',
  'conhost',
  'wsl',
  'start',
  'explorer',
  'open',
  'xdg-open',
  'osascript'
])

/** Script files are re-parsed by their host, so they are refused as the program. */
const BLOCKED_EXTENSIONS = new Set(['.bat', '.cmd', '.ps1', '.vbs', '.vbe', '.wsf', '.sh'])

export type QuietRejection =
  | 'empty'
  | 'too_long'
  | 'unsafe_characters'
  | 'unbalanced_quotes'
  | 'blocked_program'
  | 'blocked_extension'

export type QuietRunFailure = QuietRejection | 'desktop_only' | 'spawn_failed' | 'timeout' | 'exit_code'

export type QuietParseResult = { ok: true; file: string; args: string[] } | { ok: false; reason: QuietRejection }

export type QuietRunResult = { ok: true } | { ok: false; reason: QuietRunFailure }

const baseName = (value: string): string => value.split(/[\\/]/).pop() ?? ''

const extensionOf = (value: string): string => {
  const dot = value.lastIndexOf('.')
  return dot > 0 ? value.slice(dot).toLowerCase() : ''
}

/**
 * Splits on whitespace while honouring single and double quotes, so a path with
 * spaces survives. Returns `null` for an unterminated quote.
 */
function tokenize(input: string): string[] | null {
  const tokens: string[] = []
  let current = ''
  let quoted = false
  let quote: '"' | "'" | null = null

  for (const char of input) {
    if (quote) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      quoted = true
      continue
    }
    if (char === ' ' || char === '\t') {
      if (quoted || current) {
        tokens.push(current)
        current = ''
        quoted = false
      }
      continue
    }
    current += char
  }

  if (quote) return null
  if (quoted || current) tokens.push(current)
  return tokens
}

/** Pure: decides whether a stored command may be spawned, and as what. */
export function parseQuietCommand(raw: unknown): QuietParseResult {
  if (typeof raw !== 'string') return { ok: false, reason: 'empty' }

  const input = raw.trim()
  if (!input) return { ok: false, reason: 'empty' }
  if (input.length > QUIET_COMMAND_MAX_LENGTH) return { ok: false, reason: 'too_long' }
  if (UNSAFE_CHARACTERS.test(input)) return { ok: false, reason: 'unsafe_characters' }

  const tokens = tokenize(input)
  if (!tokens) return { ok: false, reason: 'unbalanced_quotes' }

  const [file, ...args] = tokens
  if (!file) return { ok: false, reason: 'empty' }

  const program = baseName(file).toLowerCase()
  if (BLOCKED_PROGRAMS.has(program) || BLOCKED_PROGRAMS.has(program.replace(/\.exe$/, ''))) {
    return { ok: false, reason: 'blocked_program' }
  }
  if (BLOCKED_EXTENSIONS.has(extensionOf(program))) {
    return { ok: false, reason: 'blocked_extension' }
  }

  return { ok: true, file, args }
}

/**
 * False under Vitest and inside the bundled web bridge, where there is no
 * Electron runtime to spawn from. `process.versions` is plain and writable, so
 * the spawn paths stay testable.
 */
export function isDesktopRuntime(): boolean {
  return Boolean(process.versions?.electron)
}

/**
 * Runs one hook. Never throws and never rejects: the caller tracks a timer, not
 * the exit of a helper script, so every outcome is a value.
 */
export function runQuietCommand(raw: unknown): Promise<QuietRunResult> {
  const parsed = parseQuietCommand(raw)
  if (!parsed.ok) return Promise.resolve({ ok: false, reason: parsed.reason })
  if (!isDesktopRuntime()) return Promise.resolve({ ok: false, reason: 'desktop_only' })

  return new Promise<QuietRunResult>((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const finish = (result: QuietRunResult): void => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolve(result)
    }

    let child: ReturnType<typeof spawn>
    try {
      child = spawn(parsed.file, parsed.args, {
        shell: false,
        windowsHide: true,
        stdio: 'ignore'
      })
    } catch (error) {
      log.error(`Failed to spawn the quiet-mode hook: ${String(error)}`)
      resolve({ ok: false, reason: 'spawn_failed' })
      return
    }

    timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        // The process may already have exited; the timeout verdict stands.
      }
      finish({ ok: false, reason: 'timeout' })
    }, QUIET_HOOK_TIMEOUT_MS)

    child.on('error', (error) => {
      log.warn(`Quiet-mode hook could not start: ${String(error)}`)
      finish({ ok: false, reason: 'spawn_failed' })
    })

    child.on('close', (code) => {
      if (code === 0) finish({ ok: true })
      else finish({ ok: false, reason: 'exit_code' })
    })
  })
}

const personalModuleActive = (): boolean =>
  typeof __PLUGIN_PERSONAL__ !== 'undefined' &&
  __PLUGIN_PERSONAL__ &&
  getEnabledModuleIds().includes('personal')

let registered = false

/**
 * Registers the hook channel. Silently does nothing when the personal module is
 * off, so an installation without the plugin never exposes it.
 */
export function setupQuietHook(): void {
  if (!personalModuleActive()) {
    log.info('Quiet-mode hook skipped: the personal module is not enabled.')
    return
  }
  if (registered) return

  try {
    ipcMain.handle(QUIET_HOOK_CHANNEL, async (_event, payload?: { command?: unknown }) => {
      const result = await runQuietCommand(payload?.command)
      if (!result.ok) log.warn(`Quiet-mode hook refused: ${result.reason}`)
      return result
    })
    registered = true
    log.info(`Quiet-mode hook registered: ${QUIET_HOOK_CHANNEL}`)
  } catch (error) {
    log.error('Failed to register the quiet-mode hook channel:', error)
  }
}

/** Releases the handler, so a reloading main process cannot double-register. */
export function teardownQuietHook(): void {
  if (!registered) return
  try {
    ipcMain.removeHandler(QUIET_HOOK_CHANNEL)
  } catch (error) {
    log.warn('Failed to release the quiet-mode hook channel:', error)
  }
  registered = false
}
