import { ALL_ROLE_META, CORE_ROLES, PLUGIN_ROLE_OPTIONS } from './constants'
import type { PluginId } from '../../../../../shared/permissions'
import type { RoleMeta, User } from './types'

export function getAvailableRoles(): string[] {
  return CORE_ROLES
}

export function getDefaultRole(): string {
  return 'member'
}

export function getRoleMeta(role: string): RoleMeta {
  return ALL_ROLE_META[role] ?? {
    label: role,
    description: 'Custom role',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  }
}

export function getScopedPlugin(pluginScope: PluginId | null) {
  return pluginScope ? PLUGIN_ROLE_OPTIONS.find(plugin => plugin.id === pluginScope) : null
}

export function getPluginRoleLabel(account: User, pluginScope: PluginId | null): string {
  if (!pluginScope) return getRoleMeta(account.role).label
  if (account.role === 'admin') return 'Owner access'
  const scopedPlugin = getScopedPlugin(pluginScope)
  const role = scopedPlugin?.roles.find(item => item.key === account.pluginRoles[pluginScope])
  return role?.label ?? 'No plugin access'
}
