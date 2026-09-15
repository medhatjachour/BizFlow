/**
 * Main-process i18n tests.
 *
 * The native dialogs (update ready, backup on close, database migration) are
 * drawn by the OS, so their copy lives in `src/main/i18n.ts` rather than in the
 * renderer dictionary. These tests pin the language resolution, the
 * interpolation and the Arabic button mirroring.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hoisted = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => hoisted.userData },
  ipcMain: { handle: vi.fn() }
}))

vi.mock('../../main/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))

import {
  MAIN_STRINGS,
  dialogButtons,
  getLanguage,
  loadLanguage,
  mainT,
  registerLanguageIpc,
  setLanguage
} from '../../main/i18n'

describe('main-process dialog i18n', () => {
  beforeEach(() => {
    hoisted.userData = mkdtempSync(join(tmpdir(), 'bizflow-lang-'))
  })

  afterEach(() => {
    setLanguage('ar')
    rmSync(hoisted.userData, { recursive: true, force: true })
  })

  it('defaults to Arabic, matching the renderer default', () => {
    expect(getLanguage()).toBe('ar')
  })

  it('keeps both tables in step', () => {
    const keys = Object.keys(MAIN_STRINGS.en)
    expect(Object.keys(MAIN_STRINGS.ar).sort()).toEqual([...keys].sort())
    for (const key of keys) {
      expect(MAIN_STRINGS.en[key as keyof typeof MAIN_STRINGS.en].length).toBeGreaterThan(0)
      expect(MAIN_STRINGS.ar[key as keyof typeof MAIN_STRINGS.ar].length).toBeGreaterThan(0)
    }
    // No Arabic entry may fall back to the English copy.
    for (const key of keys) {
      expect(MAIN_STRINGS.ar[key as keyof typeof MAIN_STRINGS.ar]).not.toBe(
        MAIN_STRINGS.en[key as keyof typeof MAIN_STRINGS.en]
      )
    }
  })

  describe('mainT', () => {
    it('translates to Arabic by default', () => {
      expect(mainT('updReadyTitle')).toBe('التحديث جاهز')
      expect(mainT('updReadyNow')).toBe('إعادة التشغيل الآن')
      expect(mainT('migOk')).toBe('حسناً')
    })

    it('translates to English once the renderer reports it', () => {
      setLanguage('en')
      expect(mainT('updReadyTitle')).toBe('Update ready')
      expect(mainT('backupQuitYes')).toBe('Back up & Quit')
    })

    it('interpolates every named parameter', () => {
      setLanguage('en')
      expect(mainT('updReadyMessage', { version: '1.2.3' })).toBe(
        'BizFlow 1.2.3 has been downloaded.'
      )
      expect(mainT('migRequiredDetail', { path: 'C:\\backups\\db.sqlite' })).toContain(
        'C:\\backups\\db.sqlite'
      )
      expect(
        mainT('migCriticalDetail', { error: 'boom', restoreError: 'bang', path: '/tmp/x' })
      ).toContain('Original error: boom')
    })

    it('leaves unknown placeholders untouched', () => {
      setLanguage('en')
      expect(mainT('migRequiredDetail', {})).toContain('{path}')
    })
  })

  describe('language persistence', () => {
    it('writes the choice to userData', () => {
      setLanguage('en')
      const file = join(hoisted.userData, 'ui-language.json')
      expect(existsSync(file)).toBe(true)
      expect(JSON.parse(readFileSync(file, 'utf-8'))).toEqual({ language: 'en' })
    })

    it('reads the saved choice back on startup', () => {
      writeFileSync(join(hoisted.userData, 'ui-language.json'), '{"language":"en"}', 'utf-8')
      loadLanguage()
      expect(getLanguage()).toBe('en')
    })

    it('ignores junk and unsupported values', () => {
      setLanguage('en')
      expect(setLanguage('de')).toBe('en')
      expect(getLanguage()).toBe('en')

      writeFileSync(join(hoisted.userData, 'ui-language.json'), '{ not json', 'utf-8')
      expect(() => loadLanguage()).not.toThrow()
      expect(getLanguage()).toBe('en')
    })
  })

  describe('dialogButtons', () => {
    it('preserves order for English', () => {
      setLanguage('en')
      const buttons = dialogButtons(['Back up & Quit', 'Quit without backup', 'Cancel'], {
        defaultIndex: 0,
        cancelIndex: 2
      })
      expect(buttons.buttons).toEqual(['Back up & Quit', 'Quit without backup', 'Cancel'])
      expect(buttons.defaultId).toBe(0)
      expect(buttons.cancelId).toBe(2)
      expect(buttons.indexOf(0)).toBe(0)
    })

    it('mirrors for Arabic and maps the response back to the caller index', () => {
      setLanguage('ar')
      const buttons = dialogButtons(['نسخ احتياطي وإغلاق', 'إغلاق بدون نسخ احتياطي', 'إلغاء'], {
        defaultIndex: 0,
        cancelIndex: 2
      })
      expect(buttons.buttons).toEqual(['إلغاء', 'إغلاق بدون نسخ احتياطي', 'نسخ احتياطي وإغلاق'])
      // The default action stays the rightmost button on screen.
      expect(buttons.defaultId).toBe(2)
      expect(buttons.cancelId).toBe(0)
      // What the dialog returns is a screen index; indexOf gives back the caller's order.
      expect(buttons.indexOf(buttons.defaultId)).toBe(0)
      expect(buttons.indexOf(buttons.cancelId)).toBe(2)
    })

    it('does not mutate the caller array', () => {
      const labels = ['Update Now', 'Exit']
      setLanguage('ar')
      dialogButtons(labels)
      expect(labels).toEqual(['Update Now', 'Exit'])
    })
  })

  describe('registerLanguageIpc', () => {
    it('registers the language channels once', async () => {
      const { ipcMain } = await import('electron')
      registerLanguageIpc()
      registerLanguageIpc()
      expect(ipcMain.handle).toHaveBeenCalledWith('app:getLanguage', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('app:setLanguage', expect.any(Function))
      expect(vi.mocked(ipcMain.handle).mock.calls).toHaveLength(2)
    })

    it('accepts a language from the renderer and rejects anything else', async () => {
      registerLanguageIpc()
      const { ipcMain } = await import('electron')
      const setHandler = vi
        .mocked(ipcMain.handle)
        .mock.calls.find(([channel]) => channel === 'app:setLanguage')?.[1] as (
        event: unknown,
        value: unknown
      ) => unknown

      expect(setHandler(null, 'en')).toBe('en')
      expect(getLanguage()).toBe('en')
      expect(setHandler(null, 42)).toBe('en')
      expect(getLanguage()).toBe('en')
    })
  })
})

/**
 * A native dialog is the one place where a missed translation is invisible to
 * every renderer test: the copy never passes through `t()`. These dialogs used to
 * be English-only in an Arabic-first app, so the next one added must fail here.
 */
describe('native dialogs draw from the main-process dictionary', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const mainSrc = join(here, '..', '..', 'main')
  const files = ['index.ts', 'updater.ts', join('services', 'MigrationManager.ts')]

  /** The options object of every `dialog.showMessageBox*()` call in a file. */
  const optionBlocks = (source: string): string[] => {
    const blocks: string[] = []
    const call = /showMessageBox(?:Sync)?\(/g
    let match: RegExpExecArray | null
    while ((match = call.exec(source))) {
      const rest = source.slice(match.index)
      const end = rest.search(/\n\s*\}\)/)
      blocks.push(end === -1 ? rest : rest.slice(0, end))
    }
    return blocks
  }

  const scanned = files.map(relative => {
    const source = readFileSync(join(mainSrc, relative), 'utf8')
    return { relative, blocks: optionBlocks(source) }
  })

  it('finds the dialogs it is supposed to police', () => {
    expect(scanned.flatMap(file => file.blocks)).toHaveLength(8)
  })

  it('translates every title, message and detail', () => {
    const offenders: string[] = []
    for (const { relative, blocks } of scanned) {
      blocks.forEach((block, index) => {
        for (const field of ['title', 'message', 'detail']) {
          const value = block.match(new RegExp(`\\b${field}:\\s*([^,]+)`))?.[1]?.trim()
          if (value && !value.startsWith('mainT(')) {
            offenders.push(`${relative} dialog ${index + 1} ${field}: ${value}`)
          }
        }
      })
    }
    expect(offenders).toEqual([])
  })

  it('passes every button through dialogButtons so Arabic mirrors correctly', () => {
    const offenders: string[] = []
    for (const { relative, blocks } of scanned) {
      blocks.forEach((block, index) => {
        const value = block.match(/buttons:\s*(\[[^\]]*\]|[A-Za-z_$][\w.$]*)/)?.[1]
        // A lone acknowledgement button has no order to mirror; anything with a
        // choice must come from dialogButtons.
        if (value && !value.endsWith('.buttons') && !value.startsWith('[mainT(')) {
          offenders.push(`${relative} dialog ${index + 1} buttons: ${value}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })
})
