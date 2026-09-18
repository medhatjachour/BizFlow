/**
 * The quiet-mode command runner (spec section 3, "Do Not Disturb trigger").
 *
 * This module is the only place in the plugin that starts a process, so the
 * rules it enforces are the whole security story of the feature: the command is
 * tokenised by us and never handed to a shell, programs that would re-parse
 * their own arguments are refused, a hook that never finishes is killed, and the
 * channel only exists inside the Electron main process. Each of those is pinned
 * below, because every one of them is invisible from the UI - a weaker rule
 * would still look like it works.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, payload?: { command?: unknown }) => Promise<unknown>>(),
  handled: [] as string[],
  removed: [] as string[],
  spawn: vi.fn(),
  modules: ['personal'] as string[]
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, payload?: { command?: unknown }) => Promise<unknown>) => {
      hoisted.handlers.set(channel, handler)
      hoisted.handled.push(channel)
    },
    removeHandler: (channel: string) => {
      hoisted.removed.push(channel)
      hoisted.handlers.delete(channel)
    }
  }
}))

vi.mock('node:child_process', () => ({ spawn: hoisted.spawn, default: { spawn: hoisted.spawn } }))

vi.mock('../../main/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))

vi.mock('../../main/utils/module-settings', () => ({
  getEnabledModuleIds: () => hoisted.modules
}))

import {
  QUIET_COMMAND_MAX_LENGTH,
  QUIET_HOOK_CHANNEL,
  QUIET_HOOK_TIMEOUT_MS,
  isDesktopRuntime,
  parseQuietCommand,
  runQuietCommand,
  setupQuietHook,
  teardownQuietHook
} from '../../main/focus-quiet'

interface FakeChild {
  on: (event: string, callback: (arg?: unknown) => void) => FakeChild
  kill: ReturnType<typeof vi.fn>
  emit: (event: string, arg?: unknown) => void
}

/** A child process stand-in whose events the test fires by hand. */
function fakeChild(): FakeChild {
  const handlers = new Map<string, (arg?: unknown) => void>()
  const child: FakeChild = {
    on: (event, callback) => {
      handlers.set(event, callback)
      return child
    },
    kill: vi.fn(),
    emit: (event, arg) => handlers.get(event)?.(arg)
  }
  return child
}

/** Vitest runs without an Electron runtime; the spawn paths need one. */
function pretendDesktop(): void {
  Object.defineProperty(process.versions, 'electron', {
    value: '30.0.0',
    configurable: true,
    writable: true
  })
}

beforeEach(() => {
  hoisted.handlers.clear()
  hoisted.handled.length = 0
  hoisted.removed.length = 0
  hoisted.modules = ['personal']
  hoisted.spawn.mockReset()
  vi.unstubAllGlobals()
  teardownQuietHook()
})

afterEach(() => {
  vi.useRealTimers()
  delete (process.versions as { electron?: string }).electron
})

describe('parseQuietCommand', () => {
  it('refuses anything that is not a usable command', () => {
    expect(parseQuietCommand(undefined)).toEqual({ ok: false, reason: 'empty' })
    expect(parseQuietCommand(42)).toEqual({ ok: false, reason: 'empty' })
    expect(parseQuietCommand('')).toEqual({ ok: false, reason: 'empty' })
    expect(parseQuietCommand('    ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('refuses a command longer than the cap', () => {
    const tooLong = `focus-on.exe ${'x'.repeat(QUIET_COMMAND_MAX_LENGTH)}`
    expect(parseQuietCommand(tooLong)).toEqual({ ok: false, reason: 'too_long' })

    // One character shorter than the cap is still accepted.
    const justFits = 'x'.repeat(QUIET_COMMAND_MAX_LENGTH)
    expect(parseQuietCommand(justFits).ok).toBe(true)
  })

  it('refuses shell metacharacters instead of trying to escape them', () => {
    for (const command of [
      'focus-on.exe; rm -rf /',
      'focus-on.exe && focus-off.exe',
      'focus-on.exe | tee log',
      'focus-on.exe > out.txt',
      'focus-on.exe < in.txt',
      'focus-on.exe $(whoami)',
      'focus-on.exe `whoami`'
    ]) {
      expect(parseQuietCommand(command)).toEqual({ ok: false, reason: 'unsafe_characters' })
    }
  })

  it('refuses an unterminated quote rather than guessing', () => {
    expect(parseQuietCommand('"C:\\Program Files\\Focus\\focus.exe')).toEqual({
      ok: false,
      reason: 'unbalanced_quotes'
    })
  })

  it('refuses programs that re-parse their own arguments', () => {
    for (const command of [
      'powershell -Command Start-Focus',
      'pwsh -File ./focus.ps1',
      'cmd /c focus-on',
      'C:\\Windows\\System32\\CMD.EXE /c focus-on',
      'wscript.exe focus.vbs',
      'mshta focus.hta',
      'rundll32.exe user32.dll,LockWorkStation',
      'osascript -e "tell app Focus"',
      'open -a Focus',
      'explorer.exe shell:AppsFolder',
      'wsl focus-on'
    ]) {
      expect(parseQuietCommand(command)).toEqual({ ok: false, reason: 'blocked_program' })
    }
  })

  it('refuses script files, which their host would interpret for us', () => {
    for (const command of ['C:\\Tools\\focus-on.bat', 'C:\\Tools\\focus-on.cmd', 'C:\\Tools\\focus-on.ps1']) {
      expect(parseQuietCommand(command)).toEqual({ ok: false, reason: 'blocked_extension' })
    }
  })

  it('keeps a quoted path with spaces in one piece', () => {
    expect(parseQuietCommand('  "C:\\Program Files\\Focus\\focus.exe" --on  ')).toEqual({
      ok: true,
      file: 'C:\\Program Files\\Focus\\focus.exe',
      args: ['--on']
    })
  })

  it('accepts a quoted shortcut, which is the Windows mechanism this is for', () => {
    expect(parseQuietCommand('"C:\\Users\\me\\Focus On.lnk"')).toEqual({
      ok: true,
      file: 'C:\\Users\\me\\Focus On.lnk',
      args: []
    })
  })

  it('accepts a plain executable with no arguments', () => {
    expect(parseQuietCommand('/usr/bin/focus-on')).toEqual({ ok: true, file: '/usr/bin/focus-on', args: [] })
  })
})

describe('runQuietCommand', () => {
  it('reports the parse verdict without spawning anything', async () => {
    await expect(runQuietCommand('powershell -c x')).resolves.toEqual({ ok: false, reason: 'blocked_program' })
    expect(hoisted.spawn).not.toHaveBeenCalled()
  })

  it('refuses to spawn outside the desktop app', async () => {
    expect(isDesktopRuntime()).toBe(false)
    await expect(runQuietCommand('focus-on.exe')).resolves.toEqual({ ok: false, reason: 'desktop_only' })
    expect(hoisted.spawn).not.toHaveBeenCalled()
  })

  it('spawns the program directly, with no shell', async () => {
    pretendDesktop()
    const child = fakeChild()
    hoisted.spawn.mockReturnValue(child)

    const pending = runQuietCommand('"C:\\Tools\\focus-on.exe" --quiet')
    expect(hoisted.spawn).toHaveBeenCalledWith('C:\\Tools\\focus-on.exe', ['--quiet'], {
      shell: false,
      windowsHide: true,
      stdio: 'ignore'
    })

    child.emit('close', 0)
    await expect(pending).resolves.toEqual({ ok: true })
  })

  it('treats a non-zero exit as a failure', async () => {
    pretendDesktop()
    const child = fakeChild()
    hoisted.spawn.mockReturnValue(child)

    const pending = runQuietCommand('focus-on.exe')
    child.emit('close', 3)

    await expect(pending).resolves.toEqual({ ok: false, reason: 'exit_code' })
  })

  it('never rejects when the process cannot start', async () => {
    pretendDesktop()
    const child = fakeChild()
    hoisted.spawn.mockReturnValue(child)

    const pending = runQuietCommand('focus-on.exe')
    child.emit('error', new Error('ENOENT'))

    await expect(pending).resolves.toEqual({ ok: false, reason: 'spawn_failed' })
  })

  it('never rejects when spawn throws synchronously', async () => {
    pretendDesktop()
    hoisted.spawn.mockImplementation(() => {
      throw new Error('EPERM')
    })

    await expect(runQuietCommand('focus-on.exe')).resolves.toEqual({ ok: false, reason: 'spawn_failed' })
  })

  it('kills a hook that never finishes', async () => {
    pretendDesktop()
    vi.useFakeTimers()
    const child = fakeChild()
    hoisted.spawn.mockReturnValue(child)

    const pending = runQuietCommand('focus-on.exe')
    await vi.advanceTimersByTimeAsync(QUIET_HOOK_TIMEOUT_MS)

    await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' })
    expect(child.kill).toHaveBeenCalled()
  })

  it('ignores a late exit once the hook has already been killed', async () => {
    pretendDesktop()
    vi.useFakeTimers()
    const child = fakeChild()
    hoisted.spawn.mockReturnValue(child)

    const pending = runQuietCommand('focus-on.exe')
    await vi.advanceTimersByTimeAsync(QUIET_HOOK_TIMEOUT_MS)
    child.emit('close', 0)

    await expect(pending).resolves.toEqual({ ok: false, reason: 'timeout' })
  })
})

describe('setupQuietHook', () => {
  it('stays closed while the personal module is off', () => {
    hoisted.modules = []
    setupQuietHook()
    expect(hoisted.handled).toEqual([])
  })

  it('stays closed when the plugin was never bundled in', () => {
    setupQuietHook()
    expect(hoisted.handled).toEqual([])
  })

  it('registers once and releases on teardown', async () => {
    vi.stubGlobal('__PLUGIN_PERSONAL__', true)
    setupQuietHook()
    setupQuietHook()

    expect(hoisted.handled).toEqual([QUIET_HOOK_CHANNEL])
    const handler = hoisted.handlers.get(QUIET_HOOK_CHANNEL)
    expect(handler).toBeTypeOf('function')

    // The handler is the renderer's only way in, so it reports the same verdict
    // the runner would, including for a rejected command.
    await expect(handler!({}, { command: 'cmd.exe /c x' })).resolves.toEqual({
      ok: false,
      reason: 'blocked_program'
    })

    teardownQuietHook()
    expect(hoisted.removed).toEqual([QUIET_HOOK_CHANNEL])

    // Tearing down twice must not remove a handler someone else owns.
    teardownQuietHook()
    expect(hoisted.removed).toEqual([QUIET_HOOK_CHANNEL])
  })
})
