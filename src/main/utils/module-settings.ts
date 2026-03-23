/**
 * module-settings.ts
 *
 * Reads the list of enabled module IDs from the persistent settings file
 * (<userData>/bizflow-settings.json).
 *
 * Used by the main process at startup to decide which module handlers to
 * register.  Renderer-side feature flags are handled separately via the
 * settings IPC channel.
 */

import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { createLogger } from './logger'

const log = createLogger('ModuleSettings')

const SETTINGS_FILENAME = 'bizflow-settings.json'

interface BizFlowSettings {
  enabledModules?: string[]
  [key: string]: unknown
}

function getSettingsPath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, SETTINGS_FILENAME)
}

/** Read the full settings object from disk (returns {} on missing/corrupt file). */
export function readSettings(): BizFlowSettings {
  const filePath = getSettingsPath()
  try {
    if (!fs.existsSync(filePath)) return {}
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as BizFlowSettings
  } catch (err) {
    log.warn('Could not read settings file:', err)
    return {}
  }
}

/** Persist the full settings object to disk. */
export function writeSettings(settings: BizFlowSettings): void {
  const filePath = getSettingsPath()
  try {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8')
  } catch (err) {
    log.error('Could not write settings file:', err)
  }
}

/** Returns the list of currently enabled module IDs (default: all enabled). */
export function getEnabledModuleIds(): string[] {
  const settings = readSettings()
  // If no key exists yet, default to enabling the bakery module
  return settings.enabledModules ?? []
}

/** Enable or disable a module by ID. */
export function setModuleEnabled(moduleId: string, enabled: boolean): void {
  const settings = readSettings()
  const current = new Set(settings.enabledModules ?? ['bakery'])
  if (enabled) {
    current.add(moduleId)
  } else {
    current.delete(moduleId)
  }
  writeSettings({ ...settings, enabledModules: Array.from(current) })
}
