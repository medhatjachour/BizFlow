/**
 * Current-user session (main process).
 *
 * BizFlow desktop runs one logged-in user per window, so we keep the acting
 * user (and their resolved capabilities) in a module singleton. The renderer
 * binds it on login and on reload (auth:bindSession), and sensitive handlers
 * enforce against it via requireCap().
 */

import {
  ALL_CAPABILITIES,
  resolveCapabilities,
  isWildcardRole,
  type PluginRoleAssignments,
  type Capability,
} from '../../../shared/permissions'

export interface CurrentUser {
  id: string
  username: string
  role: string
  capabilities: Capability[]
  pluginRoles: PluginRoleAssignments
}

let currentUser: CurrentUser | null = null

export function setCurrentUser(u: CurrentUser | null): void {
  currentUser = u
}

export function getCurrentUser(): CurrentUser | null {
  return currentUser
}

/** Read a role's stored override (JSON array) or null when using defaults. */
export async function loadRoleOverride(prisma: any, role: string): Promise<Capability[] | null> {
  try {
    const row = await prisma?.rolePermission?.findUnique({ where: { role } })
    if (!row) return null
    const arr = JSON.parse(row.capabilities)
    return Array.isArray(arr) ? arr.filter((c: any) => ALL_CAPABILITIES.includes(c)) : null
  } catch {
    return null
  }
}

/** Effective capabilities for a role (admin = all; else override or defaults). */
export async function resolveUserCapabilities(prisma: any, role: string): Promise<Capability[]> {
  if (isWildcardRole(role)) return [...ALL_CAPABILITIES]
  const override = await loadRoleOverride(prisma, role)
  return resolveCapabilities(role, override)
}

/** Bind the acting user and return their resolved capabilities. */
export async function bindUser(
  prisma: any,
  u: { id: string; username: string; role: string; pluginRoles?: PluginRoleAssignments | null }
): Promise<Capability[]> {
  const globalCapabilities = await resolveUserCapabilities(prisma, u.role)
  const pluginCapabilities = (await Promise.all(
    Object.values(u.pluginRoles ?? {}).map(pluginRole => resolveUserCapabilities(prisma, pluginRole))
  )).flat()
  const capabilities = [...new Set([...globalCapabilities, ...pluginCapabilities])]
  setCurrentUser({
    id: u.id,
    username: u.username,
    role: u.role,
    capabilities,
    pluginRoles: u.pluginRoles ?? {},
  })
  return capabilities
}

export function userCan(cap: Capability): boolean {
  if (!currentUser) return false
  if (isWildcardRole(currentUser.role)) return true
  return currentUser.capabilities.includes(cap)
}

/**
 * Throw when the acting user lacks a capability.
 * Fails OPEN only when no user is bound yet (e.g. before first login / mock
 * mode) so flows are never bricked; fails CLOSED once a user is present.
 */
export function requireCap(cap: Capability): void {
  if (!currentUser) return
  if (isWildcardRole(currentUser.role)) return
  if (!currentUser.capabilities.includes(cap)) {
    const err: any = new Error(`Permission denied — this action requires the "${cap}" permission.`)
    err.code = 'EPERM_CAP'
    err.capability = cap
    throw err
  }
}
