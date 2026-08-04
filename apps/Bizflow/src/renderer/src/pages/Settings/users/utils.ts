    // features/settings/users-roles/utils.ts

import type {
  User, UserFilters, UserStats, RoleId, Capability, DeleteCheckResult,
} from './types'
import {
  DEFAULT_ROLE_CAPABILITIES, isWildcardRole, getRoleMeta,
  CAPABILITIES, getRelevantCapabilities, CAPABILITY_GROUPS,
} from './constants'

/* Validation */
export function validatePassword(pw: string): string | null {
  if (!pw) return 'Password is required'
  if (pw.length < 6) return 'Password must be at least 6 characters'
  if (pw.length > 128) return 'Password is too long'
  return null
}

export function validateUsername(name: string): string | null {
  if (!name) return 'Username is required'
  if (name.length < 3) return 'Username must be at least 3 characters'
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return 'Only letters, numbers, _ . - allowed'
  return null
}

export function validateEmail(email: string): string | null {
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format'
  return null
}

export function validateRoleId(id: string): string | null {
  if (!id) return 'Role ID is required'
  if (id.length < 2) return 'Role ID must be at least 2 characters'
  if (!/^[a-z][a-z0-9_]*$/.test(id)) return 'Role ID must be lowercase, start with letter, only _ and numbers allowed'
  return null
}

/* Filtering */
export function filterUsers(users: User[], filters: UserFilters): User[] {
  const term = filters.search.trim().toLowerCase()
  return users.filter(u => {
    if (filters.role !== 'all' && u.role !== filters.role) return false
    if (filters.status === 'active' && !u.isActive) return false
    if (filters.status === 'inactive' && u.isActive) return false
    if (!term) return true
    const haystack = [
      u.username, u.fullName ?? '', u.email ?? '', u.phone ?? '', u.role,
    ].join(' ').toLowerCase()
    return haystack.includes(term)
  })
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

/* Stats */
export function computeUserStats(users: User[]): UserStats {
  const stats: UserStats = { total: users.length, active: 0, inactive: 0, byRole: {} }
  for (const u of users) {
    if (u.isActive) stats.active++ ;else stats.inactive++
    stats.byRole[u.role] = (stats.byRole[u.role] ?? 0) + 1
  }
  return stats
}

/* Capabilities */
export function resolveCapabilities(
  role: RoleId | undefined | null,
  override?: Capability[] | null,
): Capability[] {
  if (isWildcardRole(role)) return [...getRelevantCapabilities()]
  if (override && Array.isArray(override)) return override
  return DEFAULT_ROLE_CAPABILITIES[role ?? ''] ?? []
}

export function hasCapability(
  caps: Capability[] | undefined | null,
  role: RoleId | undefined | null,
  cap: Capability,
): boolean {
  if (isWildcardRole(role)) return true
  return !!caps && caps.includes(cap)
}

export function diffFromDefault(role: RoleId, caps: Capability[]): {
  added: Capability[]; removed: Capability[]; isModified: boolean
} {
  const def = new Set(DEFAULT_ROLE_CAPABILITIES[role] ?? [])
  const cur = new Set(caps)
  const added = [...cur].filter(c => !def.has(c))
  const removed = [...def].filter(c => !cur.has(c))
  return { added, removed, isModified: added.length > 0 || removed.length > 0 }
}

export function groupCapabilities(caps: Capability[]): Record<string, Capability[]> {
  const grouped: Record<string, Capability[]> = {}
  for (const cap of caps) {
    const g = CAPABILITIES[cap]?.group ?? 'Other'
    ;(grouped[g] ??= []).push(cap)
  }
  const ordered: Record<string, Capability[]> = {}
  for (const g of CAPABILITY_GROUPS) if (grouped[g]) ordered[g] = grouped[g]
  return ordered
}

/* Formatting */
export function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export function initialsOf(user: User): string {
  const base = user.fullName?.trim() || user.username
  return base.slice(0, 2).toUpperCase()
}

export function summarizeDeleteCheck(check: DeleteCheckResult): string {
  const dependencies = check.dependencies ?? {}
  const relatedItems = [
    dependencies.transactions ? `${dependencies.transactions} transaction(s)` : null,
    dependencies.sales ? `${dependencies.sales} sale(s)` : null,
    dependencies.stock ? `${dependencies.stock} stock item(s)` : null,
    dependencies.refunds ? `${dependencies.refunds} refund(s)` : null,
    dependencies.variants ? `${dependencies.variants} variant(s)` : null,
  ].filter(Boolean)

  if (check.canDelete && relatedItems.length === 0) {
    return 'This user has no related records and can be safely deleted.'
  }
  return `This user is referenced by ${relatedItems.join(', ') || 'no entities'}.`
}

/* Misc */
export function isRoleAvailable(
  roleId: RoleId,
  availableRoles: RoleId[],
  customRoleIds: RoleId[] = [],
): boolean {
  return availableRoles.includes(roleId) || customRoleIds.includes(roleId)
}

export function roleColorClasses(roleId: RoleId): string {
  return getRoleMeta(roleId).color
}

export function capabilityCountLabel(count: number, total: number): string {
  if (count === total) return 'Full access'
  if (count === 0) return 'No access'
  return `${count} of ${total}`
}
