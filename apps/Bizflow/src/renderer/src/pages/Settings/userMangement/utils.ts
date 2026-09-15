import { ALL_ROLE_META, CORE_ROLES, PLUGIN_ROLE_OPTIONS } from './constants'
import type { PluginId } from '../../../../../shared/permissions'
import { pluginNameAr, roleDescriptionAr, roleLabelAr } from '../../../../../shared/permissionsAr'
import { translate, type Language } from '../../../i18n/translations'
import type { RoleMeta, User } from './types'

export function getAvailableRoles(): string[] {
  return CORE_ROLES
}

export function getDefaultRole(): string {
  return 'member'
}

/**
 * Role labels and descriptions live in the permission model (English) and, for
 * custom roles, in the database. When Arabic is active each built-in key is
 * looked up in `permissionsAr`; anything the user invented keeps its own name.
 * The few generic labels this module owns come from the shared dictionary so
 * there is a single source of truth for both languages.
 */
export function getRoleMeta(role: string, language: Language = 'ar'): RoleMeta {
  const isAr = language === 'ar'
  const known = ALL_ROLE_META[role]
  if (!known) {
    return {
      label: role,
      description: translate(language, 'umRoleCustom'),
      color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
    }
  }
  if (!isAr) return known

  return {
    ...known,
    label: roleLabelAr(role, known.label),
    description: roleDescriptionAr(role, known.description)
  }
}

export function getScopedPlugin(pluginScope: PluginId | null) {
  return pluginScope ? PLUGIN_ROLE_OPTIONS.find(plugin => plugin.id === pluginScope) : null
}

/** Plugin name for the scoped screens ("Commerce" / "المتجر"). */
export function getScopedPluginLabel(pluginScope: PluginId | null, language: Language): string {
  const plugin = getScopedPlugin(pluginScope)
  if (!plugin) return ''
  return language === 'ar' ? pluginNameAr(plugin.id, plugin.label) : plugin.label
}

export function getPluginRoleLabel(
  account: User,
  pluginScope: PluginId | null,
  language: Language = 'ar'
): string {
  const isAr = language === 'ar'
  if (!pluginScope) return getRoleMeta(account.role, language).label
  if (account.role === 'admin') return translate(language, 'umRoleOwnerAccess')

  const scopedPlugin = getScopedPlugin(pluginScope)
  const role = scopedPlugin?.roles.find(item => item.key === account.pluginRoles[pluginScope])
  if (!role) return translate(language, 'umNoPluginAccess')

  return isAr ? roleLabelAr(role.key, role.label) : role.label
}
