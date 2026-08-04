// features/settings/users-roles/constants.ts

import type {
  PluginId, RoleId, RoleMeta, CapabilityMeta,
  Capability, CapabilityGroup,
} from './types'

/* Plugin flags detection */
interface PluginEntry {
  id: PluginId
  flag: boolean
  label: string
  icon: string
  accent: string
  roles: RoleId[]
}

/* eslint-disable no-undef */
const FLAGS: Record<PluginId, boolean> = {
  commerce:   typeof __PLUGIN_COMMERCE__   !== 'undefined' && __PLUGIN_COMMERCE__,
  bakery:     typeof __PLUGIN_BAKERY__     !== 'undefined' && __PLUGIN_BAKERY__,
  restaurant: typeof __PLUGIN_RESTAURANT__ !== 'undefined' && __PLUGIN_RESTAURANT__,
  warehouse:  typeof __PLUGIN_WAREHOUSE__  !== 'undefined' && __PLUGIN_WAREHOUSE__,
  clinic:     typeof __PLUGIN_CLINIC__     !== 'undefined' && __PLUGIN_CLINIC__,
  vet:        typeof __PLUGIN_VET__        !== 'undefined' && __PLUGIN_VET__,
  coffee:     typeof __PLUGIN_COFFEE__     !== 'undefined' && __PLUGIN_COFFEE__,
  pharmacy:   typeof __PLUGIN_PHARMACY__   !== 'undefined' && __PLUGIN_PHARMACY__,
}
/* eslint-enable no-undef */

export const PLUGIN_REGISTRY: PluginEntry[] = [
  { id: 'commerce',   flag: FLAGS.commerce,   label: 'Commerce',   icon: '🛒', accent: 'text-blue-600',    roles: ['sales', 'inventory', 'finance'] },
  { id: 'bakery',     flag: FLAGS.bakery,     label: 'Bakery',     icon: '🥖', accent: 'text-orange-600',  roles: ['bakery_staff'] },
  { id: 'restaurant', flag: FLAGS.restaurant, label: 'Restaurant', icon: '🍽️', accent: 'text-rose-600',    roles: ['restaurant_staff'] },
  { id: 'warehouse',  flag: FLAGS.warehouse,  label: 'Warehouse',  icon: '📦', accent: 'text-cyan-600',    roles: ['warehouse_staff'] },
  { id: 'clinic',     flag: FLAGS.clinic,     label: 'Clinic',     icon: '🏥', accent: 'text-teal-600',    roles: ['clinic_staff'] },
  { id: 'vet',        flag: FLAGS.vet,        label: 'Veterinary', icon: '🐾', accent: 'text-violet-600',  roles: ['vet_staff'] },
  { id: 'coffee',     flag: FLAGS.coffee,     label: 'Coffee',     icon: '☕', accent: 'text-amber-700',   roles: ['coffee_staff'] },
  { id: 'pharmacy',   flag: FLAGS.pharmacy,   label: 'Pharmacy',   icon: '💊', accent: 'text-emerald-600', roles: ['pharmacy_staff'] },
]

export function isPluginEnabled(id: PluginId): boolean {
  return PLUGIN_REGISTRY.find(p => p.id === id)?.flag ?? false
}

export function enabledPlugins(): PluginEntry[] {
  return PLUGIN_REGISTRY.filter(p => p.flag)
}

/* Role metadata */
export const CORE_ROLE_IDS: RoleId[] = ['admin', 'manager']

export const ROLE_META: Record<RoleId, RoleMeta> = {
  admin: {
    id: 'admin', label: 'Admin',
    description: 'Full system access — cannot be restricted.',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
    isWildcard: true,
  },
  manager: {
    id: 'manager', label: 'Manager',
    description: 'Cross-module operations and reporting.',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  },
  sales:     { id: 'sales',     label: 'Sales',     description: 'POS and sales pages.',         color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',     plugin: 'commerce' },
  inventory: { id: 'inventory', label: 'Inventory', description: 'Inventory and stock control.',  color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200', plugin: 'commerce' },
  finance:   { id: 'finance',   label: 'Finance',   description: 'Financial review and reports.', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', plugin: 'commerce' },
  clinic_staff:     { id: 'clinic_staff',     label: 'Clinic Staff',     description: 'Patients, sessions, appointments.', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',     plugin: 'clinic' },
  vet_staff:        { id: 'vet_staff',        label: 'Vet Staff',        description: 'Veterinary clinical operations.',    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200', plugin: 'vet' },
  bakery_staff:     { id: 'bakery_staff',     label: 'Bakery Staff',     description: 'Production, recipes, waste.',        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200', plugin: 'bakery' },
  restaurant_staff: { id: 'restaurant_staff', label: 'Restaurant Staff', description: 'Tables, reservations, dine-in.',     color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',     plugin: 'restaurant' },
  warehouse_staff:  { id: 'warehouse_staff',  label: 'Warehouse Staff',  description: 'Transfers and location stock.',     color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',     plugin: 'warehouse' },
  coffee_staff:     { id: 'coffee_staff',     label: 'Coffee Staff',     description: 'Coffee shop POS and orders.',        color: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100', plugin: 'coffee' },
  pharmacy_staff:   { id: 'pharmacy_staff',   label: 'Pharmacy Staff',   description: 'Pharmacy dispensing and inventory.', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', plugin: 'pharmacy' },
}

export const FALLBACK_ROLE_META: RoleMeta = {
  id: '__unknown__',
  label: 'Unknown',
  description: 'Custom or legacy role.',
  color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
}

export function getRoleMeta(id: RoleId): RoleMeta {
  return ROLE_META[id] ?? { ...FALLBACK_ROLE_META, id, label: id, isCustom: true }
}

export function getAvailableBuiltinRoles(): RoleId[] {
  const roles: RoleId[] = [...CORE_ROLE_IDS]
  for (const plugin of PLUGIN_REGISTRY) {
    if (plugin.flag) roles.push(...plugin.roles)
  }
  return roles
}

export function getDefaultNewUserRole(): RoleId {
  const available = getAvailableBuiltinRoles()
  if (available.includes('sales')) return 'sales'
  if (available.includes('coffee_staff')) return 'coffee_staff'
  if (available.includes('manager')) return 'manager'
  return 'admin'
}

/* Capability catalog */
export const CAPABILITIES: Record<Capability, CapabilityMeta> = {
  view_profit:       { label: 'View profit, COGS & margins', group: 'Visibility' },
  view_finance:      { label: 'View finance & reports',      group: 'Visibility' },
  view_audit_log:    { label: 'View audit log',              group: 'Visibility' },
  give_discount:     { label: 'Give discounts on sales',     group: 'Sales' },
  issue_refund:      { label: 'Issue refunds',               group: 'Sales' },
  void_sale:         { label: 'Void / delete sales',         group: 'Sales' },
  accept_payment:    { label: 'Accept payments',             group: 'Sales' },
  manage_inventory:  { label: 'Add / edit inventory & batches',  group: 'Operations' },
  manage_purchasing: { label: 'Manage suppliers & purchase orders', group: 'Operations' },
  manage_customers:  { label: 'Manage customers & credit',    group: 'Operations' },
  manage_staff:    { label: 'Manage staff & salaries',     group: 'Administration' },
  manage_users:    { label: 'Manage user accounts',        group: 'Administration' },
  manage_settings: { label: 'Manage settings & permissions', group: 'Administration' },
  export_data:     { label: 'Export / print reports',      group: 'Administration' },
  bakery_production:   { label: 'Bakery: manage production & recipes', group: 'Bakery',     plugin: 'bakery' },
  restaurant_tables:   { label: 'Restaurant: manage tables & reservations', group: 'Restaurant', plugin: 'restaurant' },
  warehouse_transfers: { label: 'Warehouse: stock transfers',  group: 'Warehouse',  plugin: 'warehouse' },
  clinic_patients:     { label: 'Clinic: manage patients & sessions', group: 'Clinic',  plugin: 'clinic' },
  vet_patients:        { label: 'Vet: manage patients & sessions',    group: 'Vet',     plugin: 'vet' },
  coffee_orders:       { label: 'Coffee: manage orders & menu',        group: 'Coffee',  plugin: 'coffee' },
  pharmacy_dispense:   { label: 'Pharmacy: dispense & prescriptions',  group: 'Pharmacy', plugin: 'pharmacy' },
}

export const ALL_CAPABILITIES: Capability[] = Object.keys(CAPABILITIES)

export function getRelevantCapabilities(): Capability[] {
  return ALL_CAPABILITIES.filter(cap => {
    const meta = CAPABILITIES[cap]
    if (!meta.plugin) return true
    return isPluginEnabled(meta.plugin)
  })
}

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  'Visibility', 'Sales', 'Operations', 'Administration',
  'Commerce', 'Bakery', 'Restaurant', 'Warehouse',
  'Clinic', 'Vet', 'Coffee', 'Pharmacy',
]

/* Default role capabilities */
export const DEFAULT_ROLE_CAPABILITIES: Record<RoleId, Capability[]> = {
  admin: [...ALL_CAPABILITIES],
  manager: [
    'view_profit', 'view_finance', 'view_audit_log',
    'give_discount', 'issue_refund', 'void_sale', 'accept_payment',
    'manage_inventory', 'manage_purchasing', 'manage_customers',
    'manage_staff', 'export_data',
  ],
  finance:   ['view_profit', 'view_finance', 'export_data'],
  inventory: ['manage_inventory', 'manage_purchasing'],
  sales:     ['give_discount', 'manage_customers', 'accept_payment'],
  cashier:   [],
  clinic_staff:     ['clinic_patients'],
  vet_staff:        ['vet_patients'],
  bakery_staff:     ['bakery_production'],
  restaurant_staff: ['restaurant_tables'],
  warehouse_staff:  ['warehouse_transfers'],
  coffee_staff:     ['coffee_orders', 'accept_payment'],
  pharmacy_staff:   ['pharmacy_dispense', 'manage_inventory'],
}

export const WILDCARD_ROLES: RoleId[] = ['admin']

export function isWildcardRole(role: RoleId | undefined | null): boolean {
  return !!role && WILDCARD_ROLES.includes(role)
}

/* UI constants */
export const PASSWORD_MIN_LENGTH = 6
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const DEFAULT_PAGE_SIZE = 25
