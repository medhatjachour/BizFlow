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
 * Install once, before any handlers are registered.
 */

import { ipcMain } from 'electron'
import { requireCap } from './session'
import type { Capability } from '../../../shared/permissions'

const RULES: Array<{ test: RegExp; cap: Capability }> = [
  { test: /refund|return/i,            cap: 'issue_refund' },
  { test: /void|cancelsale|cancelorder/i, cap: 'void_sale' },
]

let installed = false

export function installPermissionGuard(): void {
  if (installed) return
  installed = true

  const original = ipcMain.handle.bind(ipcMain)
  ;(ipcMain as any).handle = (channel: string, listener: (...args: any[]) => any) => {
    const rule = typeof channel === 'string' ? RULES.find(r => r.test.test(channel)) : undefined
    if (!rule) return original(channel, listener)
    const guarded = async (...args: any[]) => {
      requireCap(rule.cap) // fails open until a user is bound, closed afterwards
      return listener(...args)
    }
    return original(channel, guarded)
  }
}
