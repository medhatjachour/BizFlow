/**
 * Role store — the single place the main process reads and writes roles.
 *
 * Roles live in the `Role` table. On first use the store bootstraps that table,
 * seeds the built-in definitions from src/shared/permissions.ts and imports any
 * legacy `RolePermission` overrides so upgrades keep their customisations.
 *
 * Every write is scope-sanitised: a role may only ever hold capabilities that
 * belong to its own scope, which is what stops one plugin's settings screen
 * from silently widening access in another plugin.
 */

import {
  ROLE_DEFINITIONS,
  ALL_CAPABILITIES,
  capabilitiesForScope,
  sanitiseCapabilities,
  presetCapabilities,
  scopeOfRole,
  isWildcardRole,
  isPluginId,
  roleLabel,
  type Capability,
  type Scope,
} from '../../shared/permissions'
import { createLogger } from '../utils/logger'

const log = createLogger('RoleStore')

export type StoredRole = {
  key: string
  label: string
  scope: Scope
  description: string | null
  capabilities: Capability[]
  isBuiltIn: boolean
  isSystem: boolean
  /** True when the role still matches its shipped default capability set. */
  isDefault: boolean
  isWildcard: boolean
}

let bootstrapped = false

function parseCapabilities(raw: unknown): Capability[] {
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((c: unknown) => ALL_CAPABILITIES.includes(c as Capability)) : []
  } catch {
    return []
  }
}

function normaliseScope(raw: unknown): Scope {
  return typeof raw === 'string' && (raw === 'kernel' || isPluginId(raw)) ? raw : 'kernel'
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every(value => set.has(value))
}

function toStoredRole(row: any): StoredRole {
  const scope = normaliseScope(row.scope)
  const capabilities = parseCapabilities(row.capabilities)
  const shipped = ROLE_DEFINITIONS.find(role => role.key === row.key)
  return {
    key: row.key,
    label: row.label || roleLabel(row.key),
    scope,
    description: row.description ?? null,
    capabilities,
    isBuiltIn: Boolean(row.isBuiltIn),
    isSystem: Boolean(row.isSystem),
    isDefault: shipped ? sameSet(shipped.capabilities, capabilities) : false,
    isWildcard: isWildcardRole(row.key),
  }
}

/**
 * Create the table when it is missing. Installed databases run migrations at
 * startup, but seeding must not explode if this runs first.
 */
async function ensureTable(prisma: any): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Role" (
      "key"          TEXT PRIMARY KEY NOT NULL,
      "label"        TEXT NOT NULL,
      "scope"        TEXT NOT NULL DEFAULT 'kernel',
      "description"  TEXT,
      "capabilities" TEXT NOT NULL DEFAULT '[]',
      "isBuiltIn"    BOOLEAN NOT NULL DEFAULT false,
      "isSystem"     BOOLEAN NOT NULL DEFAULT false,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Role_scope_idx" ON "Role"("scope")`)
}

/** Pull overrides from the pre-Role schema so upgrades don't lose customisation. */
async function importLegacyOverrides(prisma: any): Promise<Record<string, Capability[]>> {
  try {
    const rows = await prisma.rolePermission.findMany()
    return Object.fromEntries(rows.map((row: any) => [row.role, parseCapabilities(row.capabilities)]))
  } catch {
    return {}
  }
}

export async function bootstrapRoles(prisma: any, force = false): Promise<void> {
  if (bootstrapped && !force) return
  try {
    await ensureTable(prisma)
    const legacy = await importLegacyOverrides(prisma)
    const existing = await prisma.role.findMany({ select: { key: true } })
    const known = new Set(existing.map((row: any) => row.key))

    for (const definition of ROLE_DEFINITIONS) {
      if (known.has(definition.key)) continue
      const override = legacy[definition.key]
      const capabilities = override?.length
        ? sanitiseCapabilities(definition.scope, override)
        : definition.capabilities
      await prisma.role.create({
        data: {
          key: definition.key,
          label: definition.label,
          scope: definition.scope,
          description: definition.description ?? null,
          capabilities: JSON.stringify(definition.isSystem ? ALL_CAPABILITIES : capabilities),
          isBuiltIn: true,
          isSystem: Boolean(definition.isSystem),
        },
      })
    }

    // Legacy custom roles that were never shipped as definitions.
    for (const [key, capabilities] of Object.entries(legacy)) {
      if (known.has(key) || ROLE_DEFINITIONS.some(role => role.key === key)) continue
      const scope = scopeOfRole(key)
      await prisma.role.create({
        data: {
          key,
          label: roleLabel(key),
          scope,
          capabilities: JSON.stringify(sanitiseCapabilities(scope, capabilities)),
          isBuiltIn: false,
          isSystem: false,
        },
      })
      known.add(key)
    }

    // Safety net: any role string still referenced by a user must exist as a
    // row, otherwise that account would resolve to zero capabilities and be
    // locked out after upgrading.
    for (const key of await referencedRoleKeys(prisma)) {
      if (known.has(key) || ROLE_DEFINITIONS.some(role => role.key === key)) continue
      const scope = scopeOfRole(key)
      await prisma.role.create({
        data: {
          key,
          label: roleLabel(key),
          scope,
          description: 'Imported from an existing user account.',
          capabilities: JSON.stringify(sanitiseCapabilities(scope, presetCapabilities(scope, 'viewer'))),
          isBuiltIn: false,
          isSystem: false,
        },
      })
      known.add(key)
    }

    bootstrapped = true
  } catch (err) {
    log.error('bootstrap failed', err)
  }
}

/** Every role key referenced by a user, globally or as a plugin assignment. */
async function referencedRoleKeys(prisma: any): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({ select: { role: true, pluginRoles: true } })
    const keys = new Set<string>()
    for (const user of users) {
      if (user.role) keys.add(user.role)
      try {
        Object.values(JSON.parse(user.pluginRoles || '{}') as Record<string, string>)
          .forEach(role => role && keys.add(role))
      } catch { /* malformed assignment blob */ }
    }
    return [...keys]
  } catch {
    return []
  }
}

export async function listRoles(prisma: any, scope?: Scope): Promise<StoredRole[]> {
  await bootstrapRoles(prisma)
  const rows = await prisma.role.findMany({
    where: scope ? { scope } : undefined,
    orderBy: [{ scope: 'asc' }, { key: 'asc' }],
  })
  return rows.map(toStoredRole)
}

export async function getRole(prisma: any, key: string): Promise<StoredRole | null> {
  await bootstrapRoles(prisma)
  const row = await prisma.role.findUnique({ where: { key } })
  return row ? toStoredRole(row) : null
}

/** Effective capabilities for a role key. Admin is always unrestricted. */
export async function roleCapabilities(prisma: any, key: string): Promise<Capability[]> {
  if (isWildcardRole(key)) return [...ALL_CAPABILITIES]
  const role = await getRole(prisma, key).catch(() => null)
  if (role) return role.capabilities
  const shipped = ROLE_DEFINITIONS.find(definition => definition.key === key)
  return shipped ? [...shipped.capabilities] : []
}

export type RoleInput = {
  key: string
  label: string
  scope: Scope
  description?: string | null
  capabilities: readonly string[]
}

const KEY_PATTERN = /^[a-z][a-z0-9_]{1,48}$/

export function normaliseRoleKey(scope: Scope, label: string, requested?: string): string {
  const base = (requested || label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const prefixed = scope !== 'kernel' && !base.startsWith(`${scope}_`) ? `${scope}_${base}` : base
  return prefixed.slice(0, 48)
}

export async function createRole(prisma: any, input: RoleInput): Promise<StoredRole> {
  await bootstrapRoles(prisma)
  const label = input.label?.trim()
  if (!label) throw new Error('A role name is required.')

  const key = normaliseRoleKey(input.scope, label, input.key)
  if (!KEY_PATTERN.test(key)) {
    throw new Error('Role name must contain at least two letters or numbers.')
  }
  if (await prisma.role.findUnique({ where: { key } })) {
    throw new Error(`A role named "${label}" already exists.`)
  }

  const row = await prisma.role.create({
    data: {
      key,
      label,
      scope: input.scope,
      description: input.description ?? null,
      capabilities: JSON.stringify(sanitiseCapabilities(input.scope, input.capabilities)),
      isBuiltIn: false,
      isSystem: false,
    },
  })
  return toStoredRole(row)
}

export async function updateRole(
  prisma: any,
  key: string,
  patch: { label?: string; description?: string | null; capabilities?: readonly string[] }
): Promise<StoredRole> {
  await bootstrapRoles(prisma)
  const current = await prisma.role.findUnique({ where: { key } })
  if (!current) throw new Error(`Role "${key}" no longer exists.`)
  if (current.isSystem) throw new Error('The Admin role always has full access and cannot be edited.')

  const scope = normaliseScope(current.scope)
  const data: Record<string, unknown> = {}
  if (patch.label !== undefined) {
    const label = patch.label.trim()
    if (!label) throw new Error('A role name is required.')
    data.label = label
  }
  if (patch.description !== undefined) data.description = patch.description
  if (patch.capabilities !== undefined) {
    data.capabilities = JSON.stringify(sanitiseCapabilities(scope, patch.capabilities))
  }

  const row = await prisma.role.update({ where: { key }, data })
  return toStoredRole(row)
}

export async function deleteRole(prisma: any, key: string): Promise<{ success: true }> {
  await bootstrapRoles(prisma)
  const role = await prisma.role.findUnique({ where: { key } })
  if (!role) return { success: true }
  if (role.isSystem) throw new Error('The Admin role cannot be deleted.')
  if (role.isBuiltIn) throw new Error('Built-in roles cannot be deleted — clear their permissions instead.')

  const inUse = await countRoleUsage(prisma, key)
  if (inUse > 0) {
    throw new Error(`${inUse} user${inUse === 1 ? ' is' : 's are'} still assigned this role.`)
  }

  await prisma.role.delete({ where: { key } })
  return { success: true }
}

/** How many users hold this role, either globally or as a plugin assignment. */
export async function countRoleUsage(prisma: any, key: string): Promise<number> {
  const direct = await prisma.user.count({ where: { role: key } })
  const scope = scopeOfRole(key)
  if (scope === 'kernel') return direct

  const candidates = await prisma.user.findMany({ select: { pluginRoles: true } })
  const assigned = candidates.filter((user: any) => {
    try {
      return JSON.parse(user.pluginRoles || '{}')?.[scope] === key
    } catch {
      return false
    }
  }).length
  return direct + assigned
}

/** Reset a built-in role back to its shipped capability set. */
export async function resetRole(prisma: any, key: string): Promise<StoredRole> {
  const definition = ROLE_DEFINITIONS.find(role => role.key === key)
  if (!definition) throw new Error('Only built-in roles can be reset to defaults.')
  return updateRole(prisma, key, { capabilities: definition.capabilities })
}

export { capabilitiesForScope }
