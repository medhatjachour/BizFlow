/**
 * Role-based permission catalog — shared by main (enforcement) and renderer
 * (UI gating). Single source of truth for capability keys, labels and the
 * sensible per-role defaults applied before any admin customisation.
 */

export const CAPABILITIES = {
  access_commerce:   { label: 'Access the Commerce plugin', group: 'Plugin Access' },
  access_bakery:     { label: 'Access the Bakery plugin', group: 'Plugin Access' },
  access_restaurant: { label: 'Access the Restaurant plugin', group: 'Plugin Access' },
  access_warehouse:  { label: 'Access the Warehouse plugin', group: 'Plugin Access' },
  access_clinic:     { label: 'Access the Clinic plugin', group: 'Plugin Access' },
  access_vet:        { label: 'Access the Vet Clinic plugin', group: 'Plugin Access' },
  access_gym:        { label: 'Access the Gym plugin', group: 'Plugin Access' },
  access_pharmacy:   { label: 'Access the Pharmacy plugin', group: 'Plugin Access' },
  access_coffee:     { label: 'Access the Coffee Shop plugin', group: 'Coffee Shop' },
  coffee_pos:        { label: 'Use the Coffee Shop POS', group: 'Coffee Shop' },
  coffee_tables:     { label: 'Manage Coffee Shop tables', group: 'Coffee Shop' },
  coffee_products:   { label: 'Manage Coffee Shop products', group: 'Coffee Shop' },
  coffee_inventory:  { label: 'Manage Coffee Shop inventory', group: 'Coffee Shop' },
  coffee_incoming:   { label: 'Manage Coffee Shop incoming stock', group: 'Coffee Shop' },
  coffee_expenses:   { label: 'Manage Coffee Shop expenses', group: 'Coffee Shop' },
  coffee_sales:      { label: 'View Coffee Shop sales', group: 'Coffee Shop' },
  coffee_shifts:     { label: 'Manage Coffee Shop shifts', group: 'Coffee Shop' },
  coffee_customers:  { label: 'Manage Coffee Shop customers', group: 'Coffee Shop' },
  coffee_reports:    { label: 'View Coffee Shop reports', group: 'Coffee Shop' },
  coffee_finance:    { label: 'View Coffee Shop finance', group: 'Coffee Shop' },
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
export type PluginId = 'commerce' | 'bakery' | 'restaurant' | 'warehouse' | 'clinic' | 'vet' | 'gym' | 'pharmacy' | 'coffee'
export type PluginRoleAssignments = Partial<Record<PluginId, string>>

export type PermissionCatalogEntry = {
  id: string
  label: string
  capability: Capability
  kind: 'page' | 'tab' | 'action'
  parentId?: string
}

export type PluginPermissionCatalog = {
  id: PluginId
  label: string
  isPrimary: boolean
  entries: PermissionCatalogEntry[]
}

export const ALL_CAPABILITIES = Object.keys(CAPABILITIES) as Capability[]

/**
 * Default capabilities per built-in role. `admin` is intentionally omitted —
 * it is treated as a wildcard (all capabilities) in code so it can never be
 * locked out of the very settings screen used to grant permissions.
 */
export const DEFAULT_ROLE_CAPABILITIES: Record<string, Capability[]> = {
  admin: [...ALL_CAPABILITIES], // wildcard, but list it for the settings UI
  manager: [...ALL_CAPABILITIES],
  member: [],
  finance: ['access_commerce', 'view_profit', 'view_finance', 'export_data'],
  inventory: ['access_commerce', 'manage_inventory', 'manage_purchasing'],
  sales: ['access_commerce', 'give_discount', 'manage_customers'],
  cashier: ['access_commerce'],
  coffee_staff: [
    'access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales',
  ],
  coffee_cashier: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales'],
  coffee_inventory_manager: ['access_coffee', 'coffee_products', 'coffee_inventory', 'coffee_incoming'],
  coffee_shift_manager: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales', 'coffee_shifts', 'coffee_expenses'],
  coffee_manager: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_products', 'coffee_inventory', 'coffee_incoming', 'coffee_expenses', 'coffee_sales', 'coffee_shifts', 'coffee_customers', 'coffee_reports', 'coffee_finance'],
  bakery_staff: ['access_bakery'],
  restaurant_staff: ['access_restaurant'],
  warehouse_staff: ['access_warehouse'],
  clinic_staff: ['access_clinic'],
  vet_staff: ['access_vet'],
  gym_staff: ['access_gym'],
  pharmacy_staff: ['access_pharmacy'],
}

export const PLUGIN_ACCESS_CAPABILITIES: Record<PluginId, Capability> = {
  commerce: 'access_commerce',
  bakery: 'access_bakery',
  restaurant: 'access_restaurant',
  warehouse: 'access_warehouse',
  clinic: 'access_clinic',
  vet: 'access_vet',
  gym: 'access_gym',
  pharmacy: 'access_pharmacy',
  coffee: 'access_coffee',
}

export const PLUGIN_ROLE_DEFAULTS: Record<PluginId, Record<string, Capability[]>> = {
  commerce: {
    sales: ['access_commerce', 'give_discount', 'manage_customers'],
    inventory: ['access_commerce', 'manage_inventory', 'manage_purchasing'],
    finance: ['access_commerce', 'view_profit', 'view_finance', 'export_data'],
  },
  bakery: { bakery_staff: ['access_bakery'] },
  restaurant: { restaurant_staff: ['access_restaurant'] },
  warehouse: { warehouse_staff: ['access_warehouse'] },
  clinic: { clinic_staff: ['access_clinic'] },
  vet: { vet_staff: ['access_vet'] },
  gym: { gym_staff: ['access_gym'] },
  pharmacy: { pharmacy_staff: ['access_pharmacy'] },
  coffee: {
    coffee_cashier: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales'],
    coffee_inventory_manager: ['access_coffee', 'coffee_products', 'coffee_inventory', 'coffee_incoming'],
    coffee_shift_manager: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales', 'coffee_shifts', 'coffee_expenses'],
    coffee_manager: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_products', 'coffee_inventory', 'coffee_incoming', 'coffee_expenses', 'coffee_sales', 'coffee_shifts', 'coffee_customers', 'coffee_reports', 'coffee_finance'],
    // Legacy assignment kept so existing users retain their operational access.
    coffee_staff: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales'],
  },
}

export const PLUGIN_TAB_CAPABILITIES: Record<PluginId, Record<string, Capability>> = {
  commerce: {
    stores: 'manage_settings', products: 'manage_inventory', pos: 'access_commerce',
    inventory: 'manage_inventory', sales: 'access_commerce',
  },
  bakery: {
    overview: 'access_bakery', recipes: 'manage_inventory', production: 'manage_inventory',
    sales: 'access_bakery', pantry: 'manage_inventory', waste: 'manage_inventory',
    schedule: 'manage_inventory', pnl: 'view_profit', expenses: 'view_finance',
  },
  restaurant: {
    overview: 'access_restaurant', tables: 'access_restaurant', reservations: 'manage_customers',
    menu: 'manage_inventory', orders: 'access_restaurant',
  },
  warehouse: {
    overview: 'access_warehouse', operations: 'access_warehouse', locations: 'manage_inventory',
    inventory: 'manage_inventory', transfers: 'manage_inventory',
  },
  clinic: {
    patients: 'access_clinic', sessions: 'access_clinic', stats: 'view_finance',
    appointments: 'manage_customers', followups: 'manage_customers', doctors: 'manage_staff',
    expenses: 'view_finance', materials: 'manage_inventory',
  },
  vet: {
    owners: 'access_vet', vets: 'manage_staff', sessions: 'access_vet',
    appointments: 'manage_customers', followups: 'manage_customers', medicines: 'manage_inventory',
    sales: 'access_vet', salesHistory: 'access_vet', stats: 'view_finance', expenses: 'view_finance',
  },
  gym: {
    attendance: 'access_gym', trainees: 'access_gym', coaches: 'manage_staff',
    subscriptions: 'manage_customers', walkins: 'access_gym', plans: 'manage_settings',
    lockers: 'access_gym', programs: 'access_gym',
  },
  pharmacy: {
    dashboard: 'access_pharmacy', pos: 'access_pharmacy', products: 'manage_inventory',
    inventory: 'manage_inventory', sales: 'access_pharmacy', customers: 'manage_customers',
    suppliers: 'manage_purchasing', orders: 'manage_purchasing', reports: 'view_finance',
  },
  coffee: {
    pos: 'coffee_pos', tables: 'coffee_tables', products: 'coffee_products',
    inventory: 'coffee_inventory', incoming: 'coffee_incoming', expenses: 'coffee_expenses',
    sales: 'coffee_sales', shifts: 'coffee_shifts', customers: 'coffee_customers',
    reports: 'coffee_reports', finance: 'coffee_finance',
  },
}

/**
 * Registered permission blueprints exposed over IPC. Plugins own their entries;
 * the RBAC UI only renders the selected plugin's blueprint.
 */
export const PLUGIN_PERMISSION_CATALOG: Partial<Record<PluginId, PluginPermissionCatalog>> = {
  coffee: {
    id: 'coffee',
    label: 'Coffee Shop',
    isPrimary: true,
    entries: [
      { id: 'pos', label: 'Point of Sale', capability: 'coffee_pos', kind: 'page' },
      { id: 'tables', label: 'Tables', capability: 'coffee_tables', kind: 'page' },
      { id: 'products', label: 'Products', capability: 'coffee_products', kind: 'page' },
      { id: 'inventory', label: 'Inventory', capability: 'coffee_inventory', kind: 'page' },
      { id: 'incoming', label: 'Incoming Stock', capability: 'coffee_incoming', kind: 'page' },
      { id: 'expenses', label: 'Expenses', capability: 'coffee_expenses', kind: 'page' },
      { id: 'sales', label: 'Sales', capability: 'coffee_sales', kind: 'page' },
      { id: 'shifts', label: 'Shifts', capability: 'coffee_shifts', kind: 'page' },
      { id: 'customers', label: 'Customers', capability: 'coffee_customers', kind: 'page' },
      { id: 'reports', label: 'Reports', capability: 'coffee_reports', kind: 'page' },
      { id: 'finance', label: 'Finance', capability: 'coffee_finance', kind: 'page' },
      { id: 'void-sale', label: 'Void sales', capability: 'void_sale', kind: 'action', parentId: 'pos' },
      { id: 'refund', label: 'Issue refunds', capability: 'issue_refund', kind: 'action', parentId: 'sales' },
      { id: 'discount', label: 'Give discounts', capability: 'give_discount', kind: 'action', parentId: 'pos' },
    ],
  },
}

export function pluginTabCapability(pluginId: PluginId, tabId: string): Capability | undefined {
  return PLUGIN_TAB_CAPABILITIES[pluginId][tabId]
}

export function resolvePluginRoleCapabilities(
  assignments: PluginRoleAssignments | null | undefined
): Capability[] {
  if (!assignments) return []
  return Object.entries(assignments).flatMap(([pluginId, role]) =>
    PLUGIN_ROLE_DEFAULTS[pluginId as PluginId]?.[role ?? ''] ?? []
  )
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
