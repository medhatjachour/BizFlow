/**
 * Role-based permission catalog — shared by main (enforcement) and renderer
 * (UI gating). Single source of truth for capability keys, labels and the
 * sensible per-role defaults applied before any admin customisation.
 */

export const CAPABILITIES = {
  view_profit:       { label: 'View profit, COGS & margins', group: 'Visibility' },
  view_finance:      { label: 'View finance & reports',      group: 'Visibility' },
  give_discount:     { label: 'Give discounts on sales',     group: 'Sales' },
  issue_refund:      { label: 'Issue refunds',               group: 'Sales' },
  void_sale:         { label: 'Void / delete sales',         group: 'Sales' },
  manage_inventory:  { label: 'Add / edit inventory & batches', group: 'Operations' },
  manage_purchasing: { label: 'Manage suppliers & purchase orders', group: 'Operations' },
  manage_customers:  { label: 'Manage customers & credit',   group: 'Operations' },
  manage_staff:      { label: 'Manage staff & salaries',     group: 'Administration' },
  manage_users:      { label: 'Manage user accounts',        group: 'Administration' },
  manage_settings:   { label: 'Manage settings & permissions', group: 'Administration' },
  export_data:       { label: 'Export / print reports',      group: 'Administration' },
} as const

export type Capability = keyof typeof CAPABILITIES

export const ALL_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[]

/**
 * Default capabilities per built-in role. `admin` is intentionally omitted —
 * it is treated as a wildcard (all capabilities) in code so it can never be
 * locked out of the very settings screen used to grant permissions.
 */
export const DEFAULT_ROLE_CAPABILITIES: Record<string, Capability[]> = {
  admin: [...ALL_CAPABILITIES], // wildcard, but list it for the settings UI
  manager: [
    'view_profit', 'view_finance', 'give_discount', 'issue_refund', 'void_sale',
    'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'export_data',
  ],
  finance: ['view_profit', 'view_finance', 'export_data'],
  inventory: ['manage_inventory', 'manage_purchasing'],
  sales: ['give_discount', 'manage_customers'],
  cashier: [],
}

/** Admin always has every capability — it can never be restricted. */
export function isWildcardRole(role: string | undefined | null): boolean {
  return role === 'admin'
}

/** Resolve the effective capability list for a role given stored overrides. */
export function resolveCapabilities(
  role: string | undefined | null,
  override?: Capability[] | null
): Capability[] {
  if (isWildcardRole(role)) return [...ALL_CAPABILITIES]
  if (override && override.length >= 0 && Array.isArray(override)) return override
  return DEFAULT_ROLE_CAPABILITIES[role ?? ''] ?? []
}

export function hasCapability(
  caps: Capability[] | undefined | null,
  role: string | undefined | null,
  cap: Capability
): boolean {
  if (isWildcardRole(role)) return true
  return !!caps && caps.includes(cap)
}
