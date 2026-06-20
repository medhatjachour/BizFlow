/**
 * Role permissions IPC handlers.
 *   permissions:getRoles   – effective capabilities per role (defaults + overrides)
 *   permissions:setRole     – admin-only: store a role's capability override
 *   permissions:bindSession – bind the acting user + return resolved capabilities
 */

import { ipcMain } from 'electron'
import {
  ALL_CAPABILITIES,
  DEFAULT_ROLE_CAPABILITIES,
  resolveCapabilities,
  isWildcardRole,
} from '../../../shared/permissions'
import {
  setCurrentUser,
  loadRoleOverride,
  resolveUserCapabilities,
  bindUser,
  userCan,
} from './session'
import { createLogger } from '../../utils/logger'

const log = createLogger('Permissions')

export function registerPermissionsHandlers(prisma: any): void {
  ipcMain.handle('permissions:getRoles', async () => {
    try {
      const roles = new Set<string>(Object.keys(DEFAULT_ROLE_CAPABILITIES))
      try {
        const userRoles = await prisma.user.findMany({ select: { role: true }, distinct: ['role'] })
        userRoles.forEach((u: any) => u.role && roles.add(u.role))
        const stored = await prisma.rolePermission.findMany({ select: { role: true } })
        stored.forEach((r: any) => roles.add(r.role))
      } catch { /* table may be empty */ }

      const out: Record<string, { capabilities: string[]; isDefault: boolean; isWildcard: boolean }> = {}
      for (const role of roles) {
        const override = await loadRoleOverride(prisma, role)
        out[role] = {
          capabilities: resolveCapabilities(role, override),
          isDefault: override === null,
          isWildcard: isWildcardRole(role),
        }
      }
      return out
    } catch (err) { log.error('getRoles', err); throw err }
  })

  ipcMain.handle('permissions:setRole', async (_e, role: string, caps: string[]) => {
    try {
      if (!userCan('manage_settings')) {
        const e: any = new Error('Permission denied — requires "manage_settings".'); e.code = 'EPERM_CAP'; throw e
      }
      if (isWildcardRole(role)) throw new Error('The admin role always has full access and cannot be edited.')
      const clean = Array.isArray(caps) ? caps.filter(c => ALL_CAPABILITIES.includes(c as any)) : []
      const json = JSON.stringify(clean)
      await prisma.rolePermission.upsert({
        where: { role },
        update: { capabilities: json },
        create: { role, capabilities: json },
      })
      // If the acting user shares this role, refresh their live capabilities.
      const { getCurrentUser } = await import('./session')
      const cur = getCurrentUser()
      if (cur && cur.role === role) setCurrentUser({ ...cur, capabilities: clean as any })
      return { success: true, capabilities: clean }
    } catch (err) { log.error('setRole', err); throw err }
  })

  ipcMain.handle('permissions:bindSession', async (_e, u: { id: string; username: string; role: string } | null) => {
    try {
      if (!u?.role) { setCurrentUser(null); return { capabilities: [], isWildcard: false } }
      const capabilities = await bindUser(prisma, u)
      return { capabilities, isWildcard: isWildcardRole(u.role) }
    } catch (err) {
      log.error('bindSession', err)
      // Fail open so a binding error never blocks the app; just return defaults.
      const capabilities = u?.role ? await resolveUserCapabilities(prisma, u.role).catch(() => []) : []
      return { capabilities, isWildcard: isWildcardRole(u?.role) }
    }
  })
}
