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
import {
  PLUGIN_REGISTRY,
  PLUGIN_ACCESS_CAPABILITIES,
  ALL_CAPABILITIES,
  type Capability,
} from '../../../shared/permissions'

type Rule = { test: RegExp; cap: Capability }

function capIfDeclared(candidate: string): Capability | undefined {
  return ALL_CAPABILITIES.includes(candidate as Capability) ? (candidate as Capability) : undefined
}

/**
 * Ordered most-specific first: a plugin's sensitive actions resolve to that
 * plugin's own capability, and anything else under its channel prefix falls
 * back to plugin access. Commerce ships unprefixed channels, so it also backs
 * the generic tail rules.
 */
function buildRules(): Rule[] {
  const rules: Rule[] = [
    { test: /^users:/i, cap: 'manage_users' },
    { test: /^auth:create$/i, cap: 'manage_users' },
    // Reading roles is needed to assign them in user management; only the
    // mutating channels require settings access.
    { test: /^roles:(create|update|delete|reset)$/i, cap: 'manage_settings' },
  ]

  for (const plugin of PLUGIN_REGISTRY) {
    const scoped = (suffix: string) => capIfDeclared(`${plugin.id}_${suffix}`)
    const refund = scoped('refund')
    const voided = scoped('void_sale') ?? scoped('void_order')

    if (refund) rules.push({ test: new RegExp(`^${plugin.id}:.*(refund|return)`, 'i'), cap: refund })
    if (voided) rules.push({ test: new RegExp(`^${plugin.id}:.*(void|cancelsale|cancelorder)`, 'i'), cap: voided })
    rules.push({ test: new RegExp(`^${plugin.id}:`, 'i'), cap: PLUGIN_ACCESS_CAPABILITIES[plugin.id] })
  }

  rules.push(
    { test: /refund|return/i, cap: 'commerce_refund' },
    { test: /void|cancelsale|cancelorder/i, cap: 'commerce_void_sale' }
  )
  return rules
}

const RULES = buildRules()


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
