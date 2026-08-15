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
 * Capabilities editable in the "System roles" (kernel) scope of the Team &
 * Permissions page. Coffee-specific page capabilities (coffee_pos, coffee_sales,
 * …) belong to the Coffee plugin roles and are edited under that plugin scope;
 * only the kernel-level `access_coffee` toggle stays editable here.
 */
export const SYSTEM_SCOPE_CAPABILITIES: Capability[] = ALL_CAPABILITIES.filter(
  cap => !cap.startsWith('coffee_')
)

export function isSystemScopeCapability(cap: Capability): boolean {
  return SYSTEM_SCOPE_CAPABILITIES.includes(cap)
}

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
    coffee_manager: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_products', 'coffee_inventory', 'coffee_incoming', 'coffee_expenses', 'coffee_sales', 'coffee_shifts', 'coffee_customers', 'coffee_reports', 'coffee_finance', 'give_discount', 'issue_refund', 'void_sale'],
  bakery_staff: ['access_bakery'],
  bakery_manager: ['access_bakery', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
  restaurant_staff: ['access_restaurant'],
  restaurant_manager: ['access_restaurant', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
  warehouse_staff: ['access_warehouse'],
  warehouse_manager: ['access_warehouse', 'manage_inventory', 'manage_purchasing', 'manage_staff', 'manage_settings', 'view_profit', 'view_finance', 'export_data'],
  clinic_staff: ['access_clinic'],
  clinic_manager: ['access_clinic', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'view_profit', 'view_finance', 'export_data'],
  vet_staff: ['access_vet'],
  vet_manager: ['access_vet', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
  gym_staff: ['access_gym'],
  gym_manager: ['access_gym', 'manage_customers', 'manage_staff', 'manage_settings', 'view_profit', 'view_finance', 'export_data'],
  pharmacy_staff: ['access_pharmacy'],
  pharmacy_manager: ['access_pharmacy', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
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
  bakery: {
    bakery_staff: ['access_bakery'],
    bakery_manager: ['access_bakery', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
  },
  restaurant: {
    restaurant_staff: ['access_restaurant'],
    restaurant_manager: ['access_restaurant', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
  },
  warehouse: {
    warehouse_staff: ['access_warehouse'],
    warehouse_manager: ['access_warehouse', 'manage_inventory', 'manage_purchasing', 'manage_staff', 'manage_settings', 'view_profit', 'view_finance', 'export_data'],
  },
  clinic: {
    clinic_staff: ['access_clinic'],
    clinic_manager: ['access_clinic', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'view_profit', 'view_finance', 'export_data'],
  },
  vet: {
    vet_staff: ['access_vet'],
    vet_manager: ['access_vet', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
  },
  gym: {
    gym_staff: ['access_gym'],
    gym_manager: ['access_gym', 'manage_customers', 'manage_staff', 'manage_settings', 'view_profit', 'view_finance', 'export_data'],
  },
  pharmacy: {
    pharmacy_staff: ['access_pharmacy'],
    pharmacy_manager: ['access_pharmacy', 'manage_inventory', 'manage_purchasing', 'manage_customers', 'manage_staff', 'manage_settings', 'give_discount', 'issue_refund', 'void_sale', 'view_profit', 'view_finance', 'export_data'],
  },
  coffee: {
    coffee_cashier: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales'],
    coffee_inventory_manager: ['access_coffee', 'coffee_products', 'coffee_inventory', 'coffee_incoming'],
    coffee_shift_manager: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales', 'coffee_shifts', 'coffee_expenses'],
  coffee_manager: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_products', 'coffee_inventory', 'coffee_incoming', 'coffee_expenses', 'coffee_sales', 'coffee_shifts', 'coffee_customers', 'coffee_reports', 'coffee_finance', 'give_discount', 'issue_refund', 'void_sale'],
    // Legacy assignment kept so existing users retain their operational access.
    coffee_staff: ['access_coffee', 'coffee_pos', 'coffee_tables', 'coffee_customers', 'coffee_sales'],
  },
}

/** Human-readable labels for every built-in plugin role. */
export const PLUGIN_ROLE_LABELS: Record<string, string> = {
  bakery_staff: 'Bakery Staff',
  bakery_manager: 'Bakery Manager',
  restaurant_staff: 'Restaurant Staff',
  restaurant_manager: 'Restaurant Manager',
  warehouse_staff: 'Warehouse Staff',
  warehouse_manager: 'Warehouse Manager',
  clinic_staff: 'Clinic Staff',
  clinic_manager: 'Clinic Manager',
  vet_staff: 'Vet Staff',
  vet_manager: 'Vet Manager',
  gym_staff: 'Gym Staff',
  gym_manager: 'Gym Manager',
  pharmacy_staff: 'Pharmacy Staff',
  pharmacy_manager: 'Pharmacy Manager',
  coffee_cashier: 'Cashier',
  coffee_inventory_manager: 'Inventory Manager',
  coffee_shift_manager: 'Shift Manager',
  coffee_manager: 'Coffee Manager',
  coffee_staff: 'Coffee Shop Staff',
  sales: 'Sales',
  inventory: 'Inventory',
  finance: 'Finance',
}

/** Resolve a friendly label for a kernel or plugin role key. */
export function pluginRoleLabel(role: string): string {
  return PLUGIN_ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1)
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
 * Registered permission blueprints exposed over IPC. Every plugin owns its
 * entries — one per page/tab plus the sensitive actions available on them —
 * so the RBAC UI can show a precise matrix for any plugin, and the app can
 * scope itself to a single plugin (only that plugin's page + tabs matter).
 */
export const PLUGIN_PERMISSION_CATALOG: Record<PluginId, PluginPermissionCatalog> = {
  commerce: {
    id: 'commerce',
    label: 'Commerce',
    isPrimary: true,
    entries: [
      { id: 'stores', label: 'Stores', capability: 'manage_settings', kind: 'page' },
      { id: 'products', label: 'Products', capability: 'manage_inventory', kind: 'page' },
      { id: 'pos', label: 'Point of Sale', capability: 'access_commerce', kind: 'page' },
      { id: 'inventory', label: 'Inventory', capability: 'manage_inventory', kind: 'page' },
      { id: 'sales', label: 'Sales', capability: 'access_commerce', kind: 'page' },
      { id: 'installments', label: 'Installments', capability: 'access_commerce', kind: 'page' },
      { id: 'discount', label: 'Give discounts', capability: 'give_discount', kind: 'action', parentId: 'pos' },
      { id: 'void-sale', label: 'Void sales', capability: 'void_sale', kind: 'action', parentId: 'pos' },
      { id: 'refund', label: 'Issue refunds', capability: 'issue_refund', kind: 'action', parentId: 'sales' },
      { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'inventory' },
    ],
  },
  bakery: {
    id: 'bakery',
    label: 'Bakery',
    isPrimary: true,
    entries: [
      { id: 'overview', label: 'Overview', capability: 'access_bakery', kind: 'page' },
      { id: 'recipes', label: 'Recipes', capability: 'manage_inventory', kind: 'page' },
      { id: 'production', label: 'Production', capability: 'manage_inventory', kind: 'page' },
      { id: 'sales', label: 'Sales', capability: 'access_bakery', kind: 'page' },
      { id: 'pantry', label: 'Pantry', capability: 'manage_inventory', kind: 'page' },
      { id: 'waste', label: 'Waste', capability: 'manage_inventory', kind: 'page' },
      { id: 'schedule', label: 'Schedule', capability: 'manage_inventory', kind: 'page' },
      { id: 'pnl', label: 'Profit & Loss', capability: 'view_profit', kind: 'page' },
      { id: 'expenses', label: 'Expenses', capability: 'view_finance', kind: 'page' },
      { id: 'discount', label: 'Give discounts', capability: 'give_discount', kind: 'action', parentId: 'sales' },
      { id: 'void-sale', label: 'Void sales', capability: 'void_sale', kind: 'action', parentId: 'sales' },
      { id: 'refund', label: 'Issue refunds', capability: 'issue_refund', kind: 'action', parentId: 'sales' },
      { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'pnl' },
    ],
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    isPrimary: true,
    entries: [
      { id: 'overview', label: 'Overview', capability: 'access_restaurant', kind: 'page' },
      { id: 'tables', label: 'Tables', capability: 'access_restaurant', kind: 'page' },
      { id: 'reservations', label: 'Reservations', capability: 'manage_customers', kind: 'page' },
      { id: 'menu', label: 'Menu', capability: 'manage_inventory', kind: 'page' },
      { id: 'orders', label: 'Orders', capability: 'access_restaurant', kind: 'page' },
      { id: 'discount', label: 'Give discounts', capability: 'give_discount', kind: 'action', parentId: 'orders' },
      { id: 'void-order', label: 'Void / cancel orders', capability: 'void_sale', kind: 'action', parentId: 'orders' },
      { id: 'refund', label: 'Issue refunds', capability: 'issue_refund', kind: 'action', parentId: 'orders' },
    ],
  },
  warehouse: {
    id: 'warehouse',
    label: 'Warehouse',
    isPrimary: true,
    entries: [
      { id: 'overview', label: 'Overview', capability: 'access_warehouse', kind: 'page' },
      { id: 'operations', label: 'Operations', capability: 'access_warehouse', kind: 'page' },
      { id: 'locations', label: 'Locations', capability: 'manage_inventory', kind: 'page' },
      { id: 'inventory', label: 'Inventory', capability: 'manage_inventory', kind: 'page' },
      { id: 'transfers', label: 'Transfers', capability: 'manage_inventory', kind: 'page' },
      { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'inventory' },
    ],
  },
  clinic: {
    id: 'clinic',
    label: 'Clinic',
    isPrimary: true,
    entries: [
      { id: 'patients', label: 'Patients', capability: 'access_clinic', kind: 'page' },
      { id: 'sessions', label: 'Sessions', capability: 'access_clinic', kind: 'page' },
      { id: 'appointments', label: 'Appointments', capability: 'manage_customers', kind: 'page' },
      { id: 'followups', label: 'Follow-ups', capability: 'manage_customers', kind: 'page' },
      { id: 'doctors', label: 'Doctors', capability: 'manage_staff', kind: 'page' },
      { id: 'materials', label: 'Materials', capability: 'manage_inventory', kind: 'page' },
      { id: 'stats', label: 'Statistics', capability: 'view_finance', kind: 'page' },
      { id: 'expenses', label: 'Expenses', capability: 'view_finance', kind: 'page' },
      { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'stats' },
    ],
  },
  vet: {
    id: 'vet',
    label: 'Vet Clinic',
    isPrimary: true,
    entries: [
      { id: 'owners', label: 'Pet Owners', capability: 'access_vet', kind: 'page' },
      { id: 'vets', label: 'Veterinarians', capability: 'manage_staff', kind: 'page' },
      { id: 'sessions', label: 'Sessions', capability: 'access_vet', kind: 'page' },
      { id: 'appointments', label: 'Appointments', capability: 'manage_customers', kind: 'page' },
      { id: 'followups', label: 'Follow-ups', capability: 'manage_customers', kind: 'page' },
      { id: 'medicines', label: 'Medicines', capability: 'manage_inventory', kind: 'page' },
      { id: 'sales', label: 'Sales', capability: 'access_vet', kind: 'page' },
      { id: 'salesHistory', label: 'Sales History', capability: 'access_vet', kind: 'page' },
      { id: 'stats', label: 'Statistics', capability: 'view_finance', kind: 'page' },
      { id: 'expenses', label: 'Expenses', capability: 'view_finance', kind: 'page' },
      { id: 'refund', label: 'Issue refunds', capability: 'issue_refund', kind: 'action', parentId: 'sales' },
      { id: 'void-sale', label: 'Void sales', capability: 'void_sale', kind: 'action', parentId: 'sales' },
      { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'stats' },
    ],
  },
  gym: {
    id: 'gym',
    label: 'Gym',
    isPrimary: true,
    entries: [
      { id: 'attendance', label: 'Attendance', capability: 'access_gym', kind: 'page' },
      { id: 'trainees', label: 'Trainees', capability: 'access_gym', kind: 'page' },
      { id: 'coaches', label: 'Coaches', capability: 'manage_staff', kind: 'page' },
      { id: 'subscriptions', label: 'Subscriptions', capability: 'manage_customers', kind: 'page' },
      { id: 'walkins', label: 'Walk-ins', capability: 'access_gym', kind: 'page' },
      { id: 'plans', label: 'Plans', capability: 'manage_settings', kind: 'page' },
      { id: 'lockers', label: 'Lockers', capability: 'access_gym', kind: 'page' },
      { id: 'programs', label: 'Programs', capability: 'access_gym', kind: 'page' },
      { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'attendance' },
    ],
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Pharmacy',
    isPrimary: true,
    entries: [
      { id: 'dashboard', label: 'Dashboard', capability: 'access_pharmacy', kind: 'page' },
      { id: 'pos', label: 'Point of Sale', capability: 'access_pharmacy', kind: 'page' },
      { id: 'products', label: 'Products', capability: 'manage_inventory', kind: 'page' },
      { id: 'inventory', label: 'Inventory', capability: 'manage_inventory', kind: 'page' },
      { id: 'sales', label: 'Sales', capability: 'access_pharmacy', kind: 'page' },
      { id: 'customers', label: 'Customers', capability: 'manage_customers', kind: 'page' },
      { id: 'suppliers', label: 'Suppliers', capability: 'manage_purchasing', kind: 'page' },
      { id: 'orders', label: 'Purchase Orders', capability: 'manage_purchasing', kind: 'page' },
      { id: 'reports', label: 'Reports', capability: 'view_finance', kind: 'page' },
      { id: 'discount', label: 'Give discounts', capability: 'give_discount', kind: 'action', parentId: 'pos' },
      { id: 'void-sale', label: 'Void sales', capability: 'void_sale', kind: 'action', parentId: 'pos' },
      { id: 'refund', label: 'Issue refunds', capability: 'issue_refund', kind: 'action', parentId: 'sales' },
      { id: 'export', label: 'Export / print reports', capability: 'export_data', kind: 'action', parentId: 'reports' },
    ],
  },
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
