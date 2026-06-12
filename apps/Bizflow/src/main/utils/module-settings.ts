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

/** Returns the list of currently enabled module IDs.
 *
 * Priority:
 *  1. ENABLED_MODULES env var (set by dev:commerce, dev:clinic, etc.)
 *  2. Persistent settings file (user-toggled via Settings UI)
 *  3. Default fallback: ['commerce']
 */
export function getEnabledModuleIds(): string[] {
  // When running via a targeted dev/build script (e.g. npm run dev:commerce),
  // ENABLED_MODULES is set by cross-env and takes priority over stored settings
  // so the Finance / Reports / Expenses pages only show the compiled-in plugin.
  const envModules = process.env.ENABLED_MODULES
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (envModules && envModules.length > 0) {
    return envModules
  }
  const settings = readSettings()
  if (settings.enabledModules) return settings.enabledModules
  // No settings file yet — default to whichever plugin was compiled in
  const defaults: string[] = []
  if (__PLUGIN_COMMERCE__)   defaults.push('commerce')
  if (__PLUGIN_BAKERY__)     defaults.push('bakery')
  if (__PLUGIN_RESTAURANT__) defaults.push('restaurant')
  if (__PLUGIN_WAREHOUSE__)  defaults.push('warehouse')
  if (__PLUGIN_CLINIC__)     defaults.push('clinic')
  if (__PLUGIN_VET__)        defaults.push('vet')
  if (__PLUGIN_GYM__)        defaults.push('gym')
  return defaults.length > 0 ? defaults : ['commerce']
}

/** Enable or disable a module by ID. */
export function setModuleEnabled(moduleId: string, enabled: boolean): void {
  const settings = readSettings()
  const current = new Set(settings.enabledModules ?? getEnabledModuleIds())
  if (enabled) {
    current.add(moduleId)
  } else {
    current.delete(moduleId)
  }
  writeSettings({ ...settings, enabledModules: Array.from(current) })
}
