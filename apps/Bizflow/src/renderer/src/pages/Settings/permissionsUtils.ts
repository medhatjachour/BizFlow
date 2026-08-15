import {
  ALL_CAPABILITIES,
  isWildcardRole,
  resolveCapabilities,
  type Capability,
} from '../../../../shared/permissions'
import type { RolesMap } from './RolePermissionsSettings'
import type { User } from './userMangement/types'

/**
 * Effective capabilities for a user — union of their kernel role and every
 * assigned plugin role, honouring any stored per-role overrides.
 */
export function effectiveCapabilities(user: Pick<User, 'role' | 'pluginRoles'>, rolesMap: RolesMap | null): Capability[] {
  if (isWildcardRole(user.role)) return [...ALL_CAPABILITIES]
  const override = rolesMap?.[user.role]
  const kernel = resolveCapabilities(user.role, override && !override.isDefault ? override.capabilities : null)
  const plugin = Object.values(user.pluginRoles ?? {}).map(role => {
    const o = rolesMap?.[role]
    return resolveCapabilities(role, o && !o.isDefault ? o.capabilities : null)
  }).flat()
  return [...new Set([...kernel, ...plugin])]
}

/** Count of users (in the current scope) whose effective role matches `role`. */
export function countRoleUsers(
  users: User[],
  role: string,
  pluginScope: string | null
): number {
  if (!Array.isArray(users)) return 0
  if (pluginScope) return users.filter(u => u.pluginRoles?.[pluginScope] === role).length
  return users.filter(u => u.role === role).length
}
