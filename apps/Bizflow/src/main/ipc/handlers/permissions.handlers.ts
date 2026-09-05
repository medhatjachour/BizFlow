/**
 * Roles & permissions IPC.
 *
 *   roles:list      – roles in a scope (kernel or a plugin), with usage counts
 *   roles:create    – add a custom role inside a scope
 *   roles:update    – rename a role / replace its capabilities
 *   roles:delete    – remove an unused custom role
 *   roles:reset     – restore a built-in role's shipped capabilities
 *   permissions:bindSession – bind the acting user, return resolved capabilities
 *   plugins:getCatalog      – permission catalog per scope, for the settings UI
 *
 * Every mutating channel requires 'manage_settings', and every capability write
 * is sanitised to the role's own scope inside the role store.
 */

import { ipcMain } from 'electron'
import {
  KERNEL_PERMISSION_CATALOG,
  PLUGIN_PERMISSION_CATALOG,
  isPluginId,
  isWildcardRole,
  type Scope,
} from '../../../shared/permissions'
import {
  bootstrapRoles,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  resetRole,
  countRoleUsage,
} from '../../services/roleStore'
import {
  setCurrentUser,
  resolveUserCapabilities,
  refreshCurrentUser,
  bindUser,
  userCan,
} from './session'
import { createLogger } from '../../utils/logger'

const log = createLogger('Permissions')

function requireSettingsAccess(): void {
  if (userCan('manage_settings')) return
  const error: any = new Error('Permission denied — requires "manage_settings".')
  error.code = 'EPERM_CAP'
  throw error
}

function toScope(raw: unknown): Scope {
  return typeof raw === 'string' && (raw === 'kernel' || isPluginId(raw)) ? raw : 'kernel'
}

function parsePluginRoles(raw: unknown): Record<string, string> {
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function registerPermissionsHandlers(prisma: any): void {
  void bootstrapRoles(prisma)

  ipcMain.handle('plugins:getCatalog', async () => [
    KERNEL_PERMISSION_CATALOG,
    ...Object.values(PLUGIN_PERMISSION_CATALOG),
  ])

  ipcMain.handle('roles:list', async (_e, scope?: string) => {
    try {
      const roles = await listRoles(prisma, scope === undefined ? undefined : toScope(scope))
      return await Promise.all(
        roles.map(async role => ({ ...role, userCount: await countRoleUsage(prisma, role.key) }))
      )
    } catch (err) { log.error('roles:list', err); throw err }
  })

  ipcMain.handle('roles:create', async (_e, input: { key?: string; label: string; scope: string; description?: string; capabilities?: string[] }) => {
    try {
      requireSettingsAccess()
      return await createRole(prisma, {
        key: input?.key ?? '',
        label: input?.label ?? '',
        scope: toScope(input?.scope),
        description: input?.description ?? null,
        capabilities: input?.capabilities ?? [],
      })
    } catch (err) { log.error('roles:create', err); throw err }
  })

  ipcMain.handle('roles:update', async (_e, key: string, patch: { label?: string; description?: string | null; capabilities?: string[] }) => {
    try {
      requireSettingsAccess()
      const role = await updateRole(prisma, key, patch ?? {})
      await refreshCurrentUser(prisma)
      return role
    } catch (err) { log.error('roles:update', err); throw err }
  })

  ipcMain.handle('roles:delete', async (_e, key: string) => {
    try {
      requireSettingsAccess()
      return await deleteRole(prisma, key)
    } catch (err) { log.error('roles:delete', err); throw err }
  })

  ipcMain.handle('roles:reset', async (_e, key: string) => {
    try {
      requireSettingsAccess()
      const role = await resetRole(prisma, key)
      await refreshCurrentUser(prisma)
      return role
    } catch (err) { log.error('roles:reset', err); throw err }
  })

  ipcMain.handle('permissions:bindSession', async (_e, u: { id: string; username: string; role: string; pluginRoles?: Record<string, string> } | null) => {
    try {
      if (!u?.role) { setCurrentUser(null); return { capabilities: [], isWildcard: false } }
      const capabilities = await bindUser(prisma, u)
      return { capabilities, isWildcard: isWildcardRole(u.role) }
    } catch (err) {
      log.error('bindSession', err)
      // Fail open so a binding error never bricks the app; just return defaults.
      const capabilities = u?.role ? await resolveUserCapabilities(prisma, u.role).catch(() => []) : []
      return { capabilities, isWildcard: isWildcardRole(u?.role) }
    }
  })

  ipcMain.handle('rbac:resolveUserPermissions', async (_e, userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, pluginRoles: true },
    })
    if (!user) throw new Error('User not found')

    const pluginRoles = parsePluginRoles(user.pluginRoles)
    const capabilities = [...new Set([
      ...await resolveUserCapabilities(prisma, user.role),
      ...(await Promise.all(Object.values(pluginRoles).map(role => resolveUserCapabilities(prisma, role)))).flat(),
    ])]

    return {
      capabilities,
      allowed: Object.fromEntries(
        [KERNEL_PERMISSION_CATALOG, ...Object.values(PLUGIN_PERMISSION_CATALOG)].map(catalog => [
          catalog.id,
          catalog.entries.filter(entry => capabilities.includes(entry.capability)).map(entry => entry.id),
        ])
      ),
    }
  })

  // ── Legacy channels, kept so older renderer bundles keep working ──────────
  ipcMain.handle('permissions:getRoles', async () => {
    try {
      const roles = await listRoles(prisma)
      return Object.fromEntries(roles.map(role => [role.key, {
        capabilities: role.capabilities,
        isDefault: role.isDefault,
        isWildcard: role.isWildcard,
      }]))
    } catch (err) { log.error('permissions:getRoles', err); throw err }
  })

  ipcMain.handle('permissions:setRole', async (_e, role: string, caps: string[]) => {
    try {
      requireSettingsAccess()
      const updated = await updateRole(prisma, role, { capabilities: Array.isArray(caps) ? caps : [] })
      await refreshCurrentUser(prisma)
      return { success: true, capabilities: updated.capabilities }
    } catch (err) { log.error('permissions:setRole', err); throw err }
  })
}

