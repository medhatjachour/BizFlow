import { describe, it, expect } from 'vitest'
import { effectiveCapabilities, countRoleUsers } from '@renderer/pages/Settings/permissionsUtils'
import { ALL_CAPABILITIES } from '@/shared/permissions'
import type { RolesMap } from '@renderer/pages/Settings/RolePermissionsSettings'
import type { User } from '@renderer/pages/Settings/userMangement/types'

const makeRoles = (partial: Partial<RolesMap>): RolesMap => partial as RolesMap

describe('effectiveCapabilities', () => {
  it('gives an admin every capability regardless of stored defaults', () => {
    const caps = effectiveCapabilities({ role: 'admin', pluginRoles: {} }, null)
    expect(caps).toContain('manage_users')
    expect(caps).toContain('access_bakery')
    expect(caps).toHaveLength(ALL_CAPABILITIES.length)
  })

  it('member without plugin roles has nothing', () => {
    expect(effectiveCapabilities({ role: 'member', pluginRoles: {} }, null)).toEqual([])
  })

  it('member with a plugin role gains that plugin’s capabilities', () => {
    const caps = effectiveCapabilities({ role: 'member', pluginRoles: { bakery: 'bakery_staff' } }, null)
    expect(caps).toContain('access_bakery')
    expect(caps).not.toContain('manage_inventory')
    expect(caps).not.toContain('access_coffee')
  })

  it('plugin roles do not cross plugin boundaries', () => {
    const caps = effectiveCapabilities({ role: 'member', pluginRoles: { clinic: 'clinic_manager' } }, null)
    expect(caps).toContain('access_clinic')
    expect(caps).not.toContain('access_bakery')
  })

  it('honours a customised override for the kernel role', () => {
    const roles = makeRoles({
      member: { capabilities: ['access_pharmacy'], isDefault: false, isWildcard: false },
    })
    const caps = effectiveCapabilities({ role: 'member', pluginRoles: {} }, roles)
    expect(caps).toEqual(['access_pharmacy'])
  })

  it('falls back to role defaults when the override is marked default', () => {
    const roles = makeRoles({
      sales: { capabilities: ['access_bakery'], isDefault: true, isWildcard: false },
    })
    const caps = effectiveCapabilities({ role: 'sales', pluginRoles: {} }, roles)
    expect(caps).toEqual(expect.arrayContaining(['access_commerce', 'give_discount', 'manage_customers']))
    expect(caps).not.toContain('access_bakery')
  })
})

describe('countRoleUsers', () => {
  const users = [
    { id: '1', username: 'a', fullName: null, email: null, phone: null, role: 'member', isActive: true, createdAt: '', lastLogin: null, pluginRoles: { bakery: 'bakery_staff' } },
    { id: '2', username: 'b', fullName: null, email: null, phone: null, role: 'member', isActive: true, createdAt: '', lastLogin: null, pluginRoles: { bakery: 'bakery_manager' } },
    { id: '3', username: 'c', fullName: null, email: null, phone: null, role: 'admin', isActive: true, createdAt: '', lastLogin: null, pluginRoles: {} },
    { id: '4', username: 'd', fullName: null, email: null, phone: null, role: 'finance', isActive: true, createdAt: '', lastLogin: null, pluginRoles: {} },
  ] as User[]

  it('counts by kernel role when no plugin scope', () => {
    expect(countRoleUsers(users, 'admin', null)).toBe(1)
    expect(countRoleUsers(users, 'finance', null)).toBe(1)
    expect(countRoleUsers(users, 'bakery_staff', null)).toBe(0)
  })

  it('counts by plugin assignment within a plugin scope', () => {
    expect(countRoleUsers(users, 'bakery_staff', 'bakery')).toBe(1)
    expect(countRoleUsers(users, 'bakery_manager', 'bakery')).toBe(1)
    expect(countRoleUsers(users, 'admin', 'bakery')).toBe(0)
  })

  it('handles a missing/empty list', () => {
    expect(countRoleUsers([] as User[], 'admin', null)).toBe(0)
    expect(countRoleUsers(undefined as unknown as User[], 'admin', null)).toBe(0)
  })
})
