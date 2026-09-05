/**
 * Permission model — single source of truth for main (enforcement), preload
 * and renderer (UI gating).
 *
 * Two rules govern the whole system:
 *
 *  1. Every capability belongs to exactly ONE scope: the kernel, or a single
 *     plugin. Plugin capabilities are namespaced `<plugin>_<entry>` so that
 *     granting "Inventory" in Bakery can never widen access in Clinic, Vet,
 *     Pharmacy or Warehouse. Cross-plugin leakage is structurally impossible.
 *
 *  2. Capabilities are declared once, here. Tab maps, permission catalogs,
 *     role defaults and the settings UI are all derived from that declaration
 *     rather than hand-maintained in parallel.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Kernel capabilities (cross-cutting — not owned by any plugin)
// ─────────────────────────────────────────────────────────────────────────────

export const KERNEL_CAPABILITIES = {
  view_dashboard:  { label: 'View the dashboard',            group: 'Core' },
  view_reports:    { label: 'View reports',                  group: 'Core' },
  view_finance:    { label: 'View finance',                  group: 'Core' },
  view_profit:     { label: 'View profit, COGS & margins',   group: 'Visibility' },
  manage_staff:    { label: 'Manage staff & salaries',       group: 'Administration' },
  manage_users:    { label: 'Manage user accounts',          group: 'Administration' },
  manage_settings: { label: 'Manage settings & permissions', group: 'Administration' },
  export_data:     { label: 'Export / print reports',        group: 'Administration' },
} as const

export type KernelCapability = keyof typeof KERNEL_CAPABILITIES

// ─────────────────────────────────────────────────────────────────────────────
// Plugin registry — pages, actions and the capabilities they require
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `id` on a page entry MUST equal the tab key used by that plugin's page
 * component: plugin indexes gate their tabs through pluginTabCapability().
 * `viewer: true` marks an entry as read-only enough for the Viewer preset.
 */
export const PLUGIN_REGISTRY = [
  {
    id: 'commerce',
    label: 'Commerce',
    access: 'access_commerce',
    entries: [
      { id: 'pos',          label: 'Point of Sale',       capability: 'commerce_pos',          kind: 'page' },
      { id: 'quicksale',    label: 'Quick Sale',          capability: 'commerce_quicksale',    kind: 'page' },
      { id: 'products',     label: 'Products',            capability: 'commerce_products',     kind: 'page' },
      { id: 'inventory',    label: 'Inventory',           capability: 'commerce_inventory',    kind: 'page' },
      { id: 'sales',        label: 'Sales history',       capability: 'commerce_sales',        kind: 'page', viewer: true },
      { id: 'customers',    label: 'Customers',           capability: 'commerce_customers',    kind: 'page' },
      { id: 'stores',       label: 'Stores',              capability: 'commerce_stores',       kind: 'page' },
      { id: 'suppliers',    label: 'Suppliers & purchase orders', capability: 'commerce_suppliers', kind: 'page' },
      { id: 'installments', label: 'Installments',        capability: 'commerce_installments', kind: 'page' },
      { id: 'expenses',     label: 'Expenses',            capability: 'commerce_expenses',     kind: 'page' },
      { id: 'discount',     label: 'Give discounts',      capability: 'commerce_discount',     kind: 'action', parentId: 'pos' },
      { id: 'refund',       label: 'Issue refunds',       capability: 'commerce_refund',       kind: 'action', parentId: 'sales' },
      { id: 'void-sale',    label: 'Void sales',          capability: 'commerce_void_sale',    kind: 'action', parentId: 'sales' },
    ],
  },
  {
    id: 'bakery',
    label: 'Bakery',
    access: 'access_bakery',
    entries: [
      { id: 'overview',   label: 'Overview',            capability: 'bakery_overview',   kind: 'page', viewer: true },
      { id: 'recipes',    label: 'Recipes',             capability: 'bakery_recipes',    kind: 'page' },
      { id: 'production', label: 'Production batches',  capability: 'bakery_production', kind: 'page' },
      { id: 'sales',      label: 'Sales',               capability: 'bakery_sales',      kind: 'page', viewer: true },
      { id: 'pantry',     label: 'Pantry',              capability: 'bakery_pantry',     kind: 'page' },
      { id: 'waste',      label: 'Waste',               capability: 'bakery_waste',      kind: 'page' },
      { id: 'schedule',   label: 'Production schedule', capability: 'bakery_schedule',   kind: 'page' },
      { id: 'pnl',        label: 'Profit and loss',     capability: 'bakery_pnl',        kind: 'page', viewer: true },
      { id: 'expenses',   label: 'Expenses',            capability: 'bakery_expenses',   kind: 'page' },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    access: 'access_restaurant',
    entries: [
      { id: 'overview',     label: 'Overview',       capability: 'restaurant_overview',     kind: 'page', viewer: true },
      { id: 'tables',       label: 'Tables',         capability: 'restaurant_tables',       kind: 'page' },
      { id: 'orders',       label: 'Orders and POS', capability: 'restaurant_orders',       kind: 'page' },
      { id: 'sales',        label: 'Sales history',  capability: 'restaurant_sales',        kind: 'page', viewer: true },
      { id: 'reservations', label: 'Reservations',   capability: 'restaurant_reservations', kind: 'page' },
      { id: 'menu',         label: 'Menu',           capability: 'restaurant_menu',         kind: 'page' },
      { id: 'inventory',    label: 'Inventory',      capability: 'restaurant_inventory',    kind: 'page' },
      { id: 'recipes',      label: 'Recipes',        capability: 'restaurant_recipes',      kind: 'page' },
      { id: 'shifts',       label: 'Shifts',         capability: 'restaurant_shifts',       kind: 'page' },
      { id: 'waste',        label: 'Waste',          capability: 'restaurant_waste',        kind: 'page' },
      { id: 'discount',     label: 'Apply order discounts', capability: 'restaurant_discount',   kind: 'action', parentId: 'orders' },
      { id: 'void-order',   label: 'Void or cancel orders', capability: 'restaurant_void_order', kind: 'action', parentId: 'orders' },
    ],
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    access: 'access_warehouse',
    entries: [
      { id: 'overview',   label: 'Overview',         capability: 'warehouse_overview',   kind: 'page', viewer: true },
      { id: 'operations', label: 'Operations board', capability: 'warehouse_operations', kind: 'page' },
      { id: 'locations',  label: 'Locations',        capability: 'warehouse_locations',  kind: 'page' },
      { id: 'inventory',  label: 'Inventory',        capability: 'warehouse_inventory',  kind: 'page' },
      { id: 'transfers',  label: 'Stock transfers',  capability: 'warehouse_transfers',  kind: 'page' },
    ],
  },
  {
    id: 'clinic',
    label: 'Clinic',
    access: 'access_clinic',
    entries: [
      { id: 'patients',     label: 'Patients',                   capability: 'clinic_patients',     kind: 'page' },
      { id: 'sessions',     label: 'Sessions and prescriptions', capability: 'clinic_sessions',     kind: 'page' },
      { id: 'appointments', label: 'Appointments',               capability: 'clinic_appointments', kind: 'page' },
      { id: 'followups',    label: 'Follow-ups',                 capability: 'clinic_followups',    kind: 'page' },
      { id: 'doctors',      label: 'Doctors and staff',          capability: 'clinic_doctors',      kind: 'page' },
      { id: 'materials',    label: 'Materials inventory',        capability: 'clinic_materials',    kind: 'page' },
      { id: 'stats',        label: 'Clinical statistics',        capability: 'clinic_stats',        kind: 'page', viewer: true },
      { id: 'expenses',     label: 'Expenses',                   capability: 'clinic_expenses',     kind: 'page' },
    ],
  },
  {
    id: 'vet',
    label: 'Vet Clinic',
    access: 'access_vet',
    entries: [
      { id: 'owners',       label: 'Owners and patients',      capability: 'vet_owners',        kind: 'page' },
      { id: 'sessions',     label: 'Visits and prescriptions', capability: 'vet_sessions',      kind: 'page' },
      { id: 'appointments', label: 'Appointments',             capability: 'vet_appointments',  kind: 'page' },
      { id: 'followups',    label: 'Follow-ups',               capability: 'vet_followups',     kind: 'page' },
      { id: 'medicines',    label: 'Medicine inventory',       capability: 'vet_medicines',     kind: 'page' },
      { id: 'vets',         label: 'Veterinarians and staff',  capability: 'vet_vets',          kind: 'page' },
      { id: 'sales',        label: 'Sales',                    capability: 'vet_sales',         kind: 'page' },
      { id: 'salesHistory', label: 'Sales history',            capability: 'vet_sales_history', kind: 'page', viewer: true },
      { id: 'stats',        label: 'Statistics',               capability: 'vet_stats',         kind: 'page', viewer: true },
      { id: 'expenses',     label: 'Expenses',                 capability: 'vet_expenses',      kind: 'page' },
      { id: 'discount',     label: 'Give discounts',           capability: 'vet_discount',      kind: 'action', parentId: 'sales' },
      { id: 'refund',       label: 'Issue refunds',            capability: 'vet_refund',        kind: 'action', parentId: 'salesHistory' },
    ],
  },
  {
    id: 'gym',
    label: 'Gym',
    access: 'access_gym',
    entries: [
      { id: 'attendance',    label: 'Attendance',        capability: 'gym_attendance',    kind: 'page', viewer: true },
      { id: 'trainees',      label: 'Trainees',          capability: 'gym_trainees',      kind: 'page' },
      { id: 'walkins',       label: 'Walk-ins',          capability: 'gym_walkins',       kind: 'page' },
      { id: 'coaches',       label: 'Coaches',           capability: 'gym_coaches',       kind: 'page' },
      { id: 'subscriptions', label: 'Subscriptions',     capability: 'gym_subscriptions', kind: 'page' },
      { id: 'plans',         label: 'Membership plans',  capability: 'gym_plans',         kind: 'page' },
      { id: 'lockers',       label: 'Lockers',           capability: 'gym_lockers',       kind: 'page' },
      { id: 'programs',      label: 'Training programs', capability: 'gym_programs',      kind: 'page' },
    ],
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    access: 'access_pharmacy',
    entries: [
      { id: 'dashboard', label: 'Dashboard',             capability: 'pharmacy_dashboard', kind: 'page', viewer: true },
      { id: 'pos',       label: 'Point of Sale',         capability: 'pharmacy_pos',       kind: 'page' },
      { id: 'products',  label: 'Products',              capability: 'pharmacy_products',  kind: 'page' },
      { id: 'inventory', label: 'Batches and inventory', capability: 'pharmacy_inventory', kind: 'page' },
      { id: 'sales',     label: 'Sales history',         capability: 'pharmacy_sales',     kind: 'page', viewer: true },
      { id: 'customers', label: 'Customers',             capability: 'pharmacy_customers', kind: 'page' },
      { id: 'suppliers', label: 'Suppliers',             capability: 'pharmacy_suppliers', kind: 'page' },
      { id: 'orders',    label: 'Purchase orders',       capability: 'pharmacy_orders',    kind: 'page' },
      { id: 'reports',   label: 'Reports and analytics', capability: 'pharmacy_reports',   kind: 'page', viewer: true },
      { id: 'discount',  label: 'Give discounts',        capability: 'pharmacy_discount',  kind: 'action', parentId: 'pos' },
      { id: 'refund',    label: 'Issue refunds',         capability: 'pharmacy_refund',    kind: 'action', parentId: 'sales' },
    ],
  },
  {
    id: 'coffee',
    label: 'Coffee Shop',
    access: 'access_coffee',
    entries: [
      { id: 'pos',       label: 'Point of Sale',  capability: 'coffee_pos',       kind: 'page' },
      { id: 'tables',    label: 'Tables',         capability: 'coffee_tables',    kind: 'page' },
      { id: 'products',  label: 'Products',       capability: 'coffee_products',  kind: 'page' },
      { id: 'inventory', label: 'Inventory',      capability: 'coffee_inventory', kind: 'page' },
      { id: 'incoming',  label: 'Incoming stock', capability: 'coffee_incoming',  kind: 'page' },
      { id: 'expenses',  label: 'Expenses',       capability: 'coffee_expenses',  kind: 'page' },
      { id: 'sales',     label: 'Sales',          capability: 'coffee_sales',     kind: 'page', viewer: true },
      { id: 'shifts',    label: 'Shifts',         capability: 'coffee_shifts',    kind: 'page' },
      { id: 'customers', label: 'Customers',      capability: 'coffee_customers', kind: 'page' },
      { id: 'reports',   label: 'Reports',        capability: 'coffee_reports',   kind: 'page', viewer: true },
      { id: 'finance',   label: 'Finance',        capability: 'coffee_finance',   kind: 'page' },
      { id: 'discount',  label: 'Give discounts', capability: 'coffee_discount',  kind: 'action', parentId: 'pos' },
      { id: 'void-sale', label: 'Void sales',     capability: 'coffee_void_sale', kind: 'action', parentId: 'pos' },
      { id: 'refund',    label: 'Issue refunds',  capability: 'coffee_refund',    kind: 'action', parentId: 'sales' },
    ],
  },
] as const

type RegistryPlugin = (typeof PLUGIN_REGISTRY)[number]

export type PluginId = RegistryPlugin['id']
export type PluginAccessCapability = RegistryPlugin['access']
export type PluginEntryCapability = RegistryPlugin['entries'][number]['capability']
export type Capability = KernelCapability | PluginAccessCapability | PluginEntryCapability
export type Scope = 'kernel' | PluginId

export type PluginRoleAssignments = Partial<Record<PluginId, string>>

export type PermissionCatalogEntry = {
  id: string
  label: string
  capability: Capability
  kind: 'page' | 'action'
  parentId?: string
  viewer?: boolean
}

export type PluginPermissionCatalog = {
  id: Scope
  label: string
  isPrimary: boolean
  accessCapability?: Capability
  entries: PermissionCatalogEntry[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived catalogs
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_PLUGIN_IDS = PLUGIN_REGISTRY.map(plugin => plugin.id)

export const PLUGIN_ACCESS_CAPABILITIES = Object.fromEntries(
  PLUGIN_REGISTRY.map(plugin => [plugin.id, plugin.access])
) as Record<PluginId, Capability>

/** Tab key → required capability, per plugin. Consumed by every plugin index. */
export const PLUGIN_TAB_CAPABILITIES = Object.fromEntries(
  PLUGIN_REGISTRY.map(plugin => [
    plugin.id,
    Object.fromEntries(
      plugin.entries.filter(entry => entry.kind === 'page').map(entry => [entry.id, entry.capability])
    ),
  ])
) as Record<PluginId, Record<string, Capability>>

/** Every capability with its label, display group and owning scope. */
export const CAPABILITIES = {
  ...Object.fromEntries(
    Object.entries(KERNEL_CAPABILITIES).map(([capability, meta]) => [capability, { ...meta, scope: 'kernel' }])
  ),
  ...Object.fromEntries(
    PLUGIN_REGISTRY.flatMap(plugin => [
      [plugin.access, { label: `Access the ${plugin.label} plugin`, group: 'Plugin Access', scope: plugin.id }],
      ...plugin.entries.map(entry => [entry.capability, { label: entry.label, group: plugin.label, scope: plugin.id }]),
    ])
  ),
} as Record<Capability, { label: string; group: string; scope: Scope }>

export const ALL_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[]

export const KERNEL_CAPABILITY_KEYS = Object.keys(KERNEL_CAPABILITIES) as Capability[]

export function isPluginId(value: string): value is PluginId {
  return (ALL_PLUGIN_IDS as readonly string[]).includes(value)
}

/** The only capabilities a role in this scope is allowed to hold. */
export function capabilitiesForScope(scope: Scope): Capability[] {
  return ALL_CAPABILITIES.filter(capability => CAPABILITIES[capability].scope === scope)
}

export const KERNEL_PERMISSION_CATALOG: PluginPermissionCatalog = {
  id: 'kernel',
  label: 'Core',
  isPrimary: true,
  entries: [
    { id: 'dashboard', label: 'Dashboard',           capability: 'view_dashboard',  kind: 'page', viewer: true },
    { id: 'reports',   label: 'Reports',             capability: 'view_reports',    kind: 'page', viewer: true },
    { id: 'finance',   label: 'Finance',             capability: 'view_finance',    kind: 'page' },
    { id: 'employees', label: 'Employees & payroll', capability: 'manage_staff',    kind: 'page' },
    { id: 'settings',  label: 'Settings',            capability: 'manage_settings', kind: 'page' },
    { id: 'users',     label: 'User management',     capability: 'manage_users',    kind: 'page' },
    { id: 'profit',    label: 'View profit, COGS & margins', capability: 'view_profit', kind: 'action', parentId: 'reports' },
    { id: 'export',    label: 'Export / print reports',      capability: 'export_data', kind: 'action', parentId: 'reports' },
  ],
}

export const PLUGIN_PERMISSION_CATALOG = Object.fromEntries(
  PLUGIN_REGISTRY.map(plugin => [
    plugin.id,
    {
      id: plugin.id,
      label: plugin.label,
      isPrimary: true,
      accessCapability: plugin.access,
      entries: plugin.entries.map(entry => ({ ...entry })),
    },
  ])
) as Record<PluginId, PluginPermissionCatalog>

export function catalogForScope(scope: Scope): PluginPermissionCatalog {
  return scope === 'kernel' ? KERNEL_PERMISSION_CATALOG : PLUGIN_PERMISSION_CATALOG[scope]
}

export function pluginTabCapability(pluginId: PluginId, tabId: string): Capability | undefined {
  return PLUGIN_TAB_CAPABILITIES[pluginId]?.[tabId]
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in roles
// ─────────────────────────────────────────────────────────────────────────────

export type RoleDefinition = {
  key: string
  label: string
  scope: Scope
  description?: string
  capabilities: Capability[]
  /** Ships with the app: may be customised, never deleted. */
  isBuiltIn: true
  /** Always full access; cannot be edited or deleted. */
  isSystem?: boolean
}

function pluginCaps(pluginId: PluginId, entryIds?: readonly string[]): Capability[] {
  const entries = PLUGIN_PERMISSION_CATALOG[pluginId].entries
  const picked = entryIds ? entries.filter(entry => entryIds.includes(entry.id)) : entries
  return [PLUGIN_ACCESS_CAPABILITIES[pluginId], ...picked.map(entry => entry.capability)]
}

/** Day-to-day pages only — no destructive actions, no finance-grade pages. */
const STAFF_ENTRIES: Record<PluginId, string[]> = {
  commerce:   ['pos', 'quicksale', 'sales', 'customers'],
  bakery:     ['overview', 'production', 'sales', 'pantry', 'waste'],
  restaurant: ['overview', 'tables', 'orders', 'sales', 'reservations'],
  warehouse:  ['overview', 'operations', 'inventory'],
  clinic:     ['patients', 'sessions', 'appointments', 'followups'],
  vet:        ['owners', 'sessions', 'appointments', 'followups', 'sales', 'salesHistory'],
  gym:        ['attendance', 'trainees', 'walkins', 'subscriptions'],
  pharmacy:   ['dashboard', 'pos', 'sales', 'customers'],
  coffee:     ['pos', 'tables', 'sales', 'customers'],
}

const EXTRA_PLUGIN_ROLES: Partial<Record<PluginId, Array<{ key: string; label: string; entries: string[] }>>> = {
  commerce: [
    { key: 'commerce_cashier',   label: 'Cashier',           entries: ['pos', 'quicksale', 'sales'] },
    { key: 'commerce_inventory', label: 'Inventory Manager', entries: ['products', 'inventory', 'suppliers'] },
    { key: 'commerce_finance',   label: 'Finance',           entries: ['sales', 'expenses', 'installments'] },
  ],
  coffee: [
    { key: 'coffee_cashier',           label: 'Cashier',           entries: STAFF_ENTRIES.coffee },
    { key: 'coffee_inventory_manager', label: 'Inventory Manager', entries: ['products', 'inventory', 'incoming'] },
    { key: 'coffee_shift_manager',     label: 'Shift Manager',     entries: [...STAFF_ENTRIES.coffee, 'shifts', 'expenses'] },
  ],
  pharmacy: [
    { key: 'pharmacy_cashier',           label: 'Cashier',           entries: ['dashboard', 'pos', 'sales'] },
    { key: 'pharmacy_inventory_manager', label: 'Inventory Manager', entries: ['products', 'inventory', 'suppliers', 'orders'] },
  ],
}

const PLUGIN_ROLE_DEFINITIONS: RoleDefinition[] = PLUGIN_REGISTRY.flatMap(plugin => [
  {
    key: `${plugin.id}_manager`,
    label: `${plugin.label} Manager`,
    scope: plugin.id as Scope,
    description: `Full access to every ${plugin.label} page and action.`,
    capabilities: pluginCaps(plugin.id),
    isBuiltIn: true as const,
  },
  {
    key: `${plugin.id}_staff`,
    label: `${plugin.label} Staff`,
    scope: plugin.id as Scope,
    description: `Day-to-day ${plugin.label} operations, without sensitive actions.`,
    capabilities: pluginCaps(plugin.id, STAFF_ENTRIES[plugin.id]),
    isBuiltIn: true as const,
  },
  ...(EXTRA_PLUGIN_ROLES[plugin.id] ?? []).map(role => ({
    key: role.key,
    label: role.label,
    scope: plugin.id as Scope,
    capabilities: pluginCaps(plugin.id, role.entries),
    isBuiltIn: true as const,
  })),
])

const KERNEL_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: 'admin',
    label: 'Admin',
    scope: 'kernel',
    description: 'Unrestricted access. Cannot be limited.',
    capabilities: [...ALL_CAPABILITIES],
    isBuiltIn: true,
    isSystem: true,
  },
  {
    key: 'manager',
    label: 'Manager',
    scope: 'kernel',
    description: 'Full access to core pages and every installed plugin.',
    capabilities: [...ALL_CAPABILITIES],
    isBuiltIn: true,
  },
  {
    key: 'member',
    label: 'Member',
    scope: 'kernel',
    description: 'Signs in with no access until a plugin role is assigned.',
    capabilities: ['view_dashboard'],
    isBuiltIn: true,
  },
  {
    key: 'finance',
    label: 'Finance',
    scope: 'kernel',
    description: 'Finance, reports and profit visibility.',
    capabilities: ['view_dashboard', 'view_reports', 'view_finance', 'view_profit', 'export_data'],
    isBuiltIn: true,
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    scope: 'kernel',
    description: 'Reports plus staff administration.',
    capabilities: ['view_dashboard', 'view_reports', 'manage_staff', 'export_data'],
    isBuiltIn: true,
  },
  // Retained so databases created before plugin-scoped roles keep working;
  // new installs should use the equivalent commerce_* plugin roles.
  {
    key: 'sales',
    label: 'Sales (legacy)',
    scope: 'kernel',
    description: 'Legacy commerce sales role.',
    capabilities: ['view_dashboard', ...pluginCaps('commerce', ['pos', 'quicksale', 'sales', 'customers'])],
    isBuiltIn: true,
  },
  {
    key: 'inventory',
    label: 'Inventory (legacy)',
    scope: 'kernel',
    description: 'Legacy commerce inventory role.',
    capabilities: ['view_dashboard', ...pluginCaps('commerce', ['products', 'inventory', 'suppliers'])],
    isBuiltIn: true,
  },
  {
    key: 'cashier',
    label: 'Cashier (legacy)',
    scope: 'kernel',
    description: 'Legacy commerce cashier role.',
    capabilities: ['view_dashboard', ...pluginCaps('commerce', ['pos', 'quicksale', 'sales'])],
    isBuiltIn: true,
  },
]

export const ROLE_DEFINITIONS: RoleDefinition[] = [...KERNEL_ROLE_DEFINITIONS, ...PLUGIN_ROLE_DEFINITIONS]

export const ROLE_DEFINITION_MAP: Record<string, RoleDefinition> = Object.fromEntries(
  ROLE_DEFINITIONS.map(role => [role.key, role])
)

export const KERNEL_ROLE_KEYS = KERNEL_ROLE_DEFINITIONS.map(role => role.key)

export const DEFAULT_ROLE_CAPABILITIES: Record<string, Capability[]> = Object.fromEntries(
  ROLE_DEFINITIONS.map(role => [role.key, role.capabilities])
)

export const PLUGIN_ROLE_DEFAULTS = Object.fromEntries(
  PLUGIN_REGISTRY.map(plugin => [
    plugin.id,
    Object.fromEntries(
      PLUGIN_ROLE_DEFINITIONS
        .filter(role => role.scope === plugin.id)
        .map(role => [role.key, role.capabilities])
    ),
  ])
) as Record<PluginId, Record<string, Capability[]>>

export function roleLabel(key: string): string {
  return ROLE_DEFINITION_MAP[key]?.label
    ?? key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export function scopeOfRole(role: string): Scope {
  const declared = ROLE_DEFINITION_MAP[role]
  if (declared) return declared.scope
  const owner = PLUGIN_REGISTRY.find(plugin => role.startsWith(`${plugin.id}_`))
  return owner ? owner.id : 'kernel'
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isWildcardRole(role: string | undefined | null): boolean {
  return role === 'admin'
}

/**
 * Constrain a role's capabilities to what its scope may hold.
 *
 * A plugin role is hard-limited to its own plugin — this is what makes
 * cross-plugin escalation impossible. The kernel scope is the global role
 * tier, so it may additionally carry plugin capabilities (that's how Manager
 * reaches every plugin); it is only filtered against unknown keys.
 */
export function sanitiseCapabilities(scope: Scope, capabilities: readonly string[]): Capability[] {
  const allowed = new Set<string>(scope === 'kernel' ? ALL_CAPABILITIES : capabilitiesForScope(scope))
  const next = new Set(capabilities.filter(capability => allowed.has(capability)) as Capability[])
  if (scope !== 'kernel' && next.size > 0) next.add(PLUGIN_ACCESS_CAPABILITIES[scope])
  return [...next]
}

export function getAvailableRolesForPlugin(
  pluginId: PluginId | null,
  existingRoles: Record<string, unknown>,
  kernelRoles: readonly string[] = KERNEL_ROLE_KEYS
): string[] {
  const scope: Scope = pluginId ?? 'kernel'
  const declared = ROLE_DEFINITIONS.filter(role => role.scope === scope).map(role => role.key)
  const custom = Object.keys(existingRoles).filter(
    role => !ROLE_DEFINITION_MAP[role] && (pluginId ? scopeOfRole(role) === pluginId : kernelRoles.includes(role))
  )
  return [...new Set([...declared, ...custom])]
}

export function resolveCapabilities(
  role: string | undefined | null,
  override?: readonly Capability[] | null
): Capability[] {
  if (isWildcardRole(role)) return [...ALL_CAPABILITIES]
  if (Array.isArray(override)) return [...override]
  return DEFAULT_ROLE_CAPABILITIES[role ?? ''] ?? []
}

export function resolvePluginRoleCapabilities(
  assignments: PluginRoleAssignments | null | undefined
): Capability[] {
  if (!assignments) return []
  return Object.entries(assignments).flatMap(([pluginId, role]) =>
    PLUGIN_ROLE_DEFAULTS[pluginId as PluginId]?.[role ?? ''] ?? []
  )
}

export function hasCapability(
  caps: readonly Capability[] | undefined | null,
  role: string | undefined | null,
  cap: Capability
): boolean {
  if (isWildcardRole(role)) return true
  return !!caps && caps.includes(cap)
}

export type PermissionPreset = 'none' | 'viewer' | 'editor' | 'admin'

/** Capability set a preset produces within a scope. */
export function presetCapabilities(scope: Scope, preset: PermissionPreset): Capability[] {
  const catalog = catalogForScope(scope)
  const pages = catalog.entries.filter(entry => entry.kind === 'page')
  const actions = catalog.entries.filter(entry => entry.kind === 'action')
  const access = scope === 'kernel' ? [] : [PLUGIN_ACCESS_CAPABILITIES[scope]]

  switch (preset) {
    case 'none':
      return []
    case 'viewer':
      return [...access, ...pages.filter(page => page.viewer).map(page => page.capability)]
    case 'editor':
      return [...access, ...pages.map(page => page.capability)]
    case 'admin':
      return [...access, ...pages.map(page => page.capability), ...actions.map(action => action.capability)]
  }
}