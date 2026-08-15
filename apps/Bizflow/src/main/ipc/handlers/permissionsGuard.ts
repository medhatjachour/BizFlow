/**
 * Universal permission guard.
 *
 * Wraps ipcMain.handle so that any channel whose name matches a sensitive
 * pattern is automatically permission-checked — across EVERY plugin and the
 * kernel — without editing each handler. This covers the universal cases
 * (refunds / returns / voids) by naming convention. Param-specific cases that
 * cannot be detected from the channel name (e.g. "a sale that carries a
 * discount") are enforced inline in the relevant handlers via requireCap().
 *
 * ALL matching rules are enforced (AND semantics): a plugin void channel such
 * as `coffee:orders:void` must satisfy BOTH its plugin-access rule AND the
 * fine-grained `/void/` rule, so sensitive actions never slip through just
 * because their channel is prefixed by a plugin name.
 *
 * Install once, before any handlers are registered.
 */

import { ipcMain } from 'electron'
import { requireCap } from './session'
import type { Capability } from '../../../shared/permissions'

const RULES: Array<{ test: RegExp; cap: Capability }> = [
  { test: /^users:/i,                   cap: 'manage_users' },
  { test: /^auth:create$/i,             cap: 'manage_users' },
  { test: /^bakery:/i,                  cap: 'access_bakery' },
  { test: /^restaurant:/i,              cap: 'access_restaurant' },
  { test: /^warehouse:/i,               cap: 'access_warehouse' },
  { test: /^clinic:/i,                  cap: 'access_clinic' },
  { test: /^vet:/i,                     cap: 'access_vet' },
  { test: /^gym:/i,                     cap: 'access_gym' },
  { test: /^pharmacy:/i,                cap: 'access_pharmacy' },
  { test: /^coffee:/i,                  cap: 'access_coffee' },
  { test: /refund|return/i,            cap: 'issue_refund' },
  { test: /void|cancelsale|cancelorder/i, cap: 'void_sale' },
]

let installed = false

export function installPermissionGuard(): void {
  if (installed) return
  installed = true

  const original = ipcMain.handle.bind(ipcMain)
  ;(ipcMain as any).handle = (channel: string, listener: (...args: any[]) => any) => {
    if (typeof channel !== 'string') return original(channel, listener)
    const rules = RULES.filter(r => r.test.test(channel))
    if (rules.length === 0) return original(channel, listener)
    const guarded = async (...args: any[]) => {
      rules.forEach(rule => requireCap(rule.cap)) // fails open until a user is bound, closed afterwards
      return listener(...args)
    }
    return original(channel, guarded)
  }
}
