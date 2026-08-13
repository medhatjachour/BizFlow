import { WalletCards, Package, Store, ShieldCheck } from 'lucide-react'
import type { PluginId } from '../../../../../shared/permissions'
import type { PluginRoleOption, RoleMeta } from './types'

export const BUNDLED_PLUGIN_FLAGS: Record<string, boolean> = {
  commerce: typeof __PLUGIN_COMMERCE__ !== 'undefined' && __PLUGIN_COMMERCE__,
  bakery: typeof __PLUGIN_BAKERY__ !== 'undefined' && __PLUGIN_BAKERY__,
  restaurant: typeof __PLUGIN_RESTAURANT__ !== 'undefined' && __PLUGIN_RESTAURANT__,
  warehouse: typeof __PLUGIN_WAREHOUSE__ !== 'undefined' && __PLUGIN_WAREHOUSE__,
  clinic: typeof __PLUGIN_CLINIC__ !== 'undefined' && __PLUGIN_CLINIC__,
  vet: typeof __PLUGIN_VET__ !== 'undefined' && __PLUGIN_VET__,
  gym: typeof __PLUGIN_GYM__ !== 'undefined' && __PLUGIN_GYM__,
  pharmacy: typeof __PLUGIN_PHARMACY__ !== 'undefined' && __PLUGIN_PHARMACY__,
  coffee: typeof __PLUGIN_COFFEE__ !== 'undefined' && __PLUGIN_COFFEE__,
}

export const PLUGIN_ROLE_OPTIONS: PluginRoleOption[] = [
  { id: 'commerce', label: 'Commerce', roles: [{ key: 'sales', label: 'Sales' }, { key: 'inventory', label: 'Inventory' }, { key: 'finance', label: 'Finance' }] },
  { id: 'bakery', label: 'Bakery', roles: [{ key: 'bakery_staff', label: 'Bakery Staff' }, { key: 'bakery_manager', label: 'Bakery Manager' }] },
  { id: 'restaurant', label: 'Restaurant', roles: [{ key: 'restaurant_staff', label: 'Restaurant Staff' }, { key: 'restaurant_manager', label: 'Restaurant Manager' }] },
  { id: 'warehouse', label: 'Warehouse', roles: [{ key: 'warehouse_staff', label: 'Warehouse Staff' }, { key: 'warehouse_manager', label: 'Warehouse Manager' }] },
  { id: 'clinic', label: 'Clinic', roles: [{ key: 'clinic_staff', label: 'Clinic Staff' }, { key: 'clinic_manager', label: 'Clinic Manager' }] },
  { id: 'vet', label: 'Vet Clinic', roles: [{ key: 'vet_staff', label: 'Vet Staff' }, { key: 'vet_manager', label: 'Vet Manager' }] },
  { id: 'gym', label: 'Gym', roles: [{ key: 'gym_staff', label: 'Gym Staff' }, { key: 'gym_manager', label: 'Gym Manager' }] },
  { id: 'pharmacy', label: 'Pharmacy', roles: [{ key: 'pharmacy_staff', label: 'Pharmacy Staff' }, { key: 'pharmacy_manager', label: 'Pharmacy Manager' }] },
  {
    id: 'coffee',
    label: 'Coffee Shop',
    roles: [
      { key: 'coffee_cashier', label: 'Cashier' },
      { key: 'coffee_inventory_manager', label: 'Inventory Manager' },
      { key: 'coffee_shift_manager', label: 'Shift Manager' },
      { key: 'coffee_manager', label: 'Coffee Manager' },
    ],
  },
]

export const ROLE_PRESENTATION: Record<string, { description: string; Icon: typeof ShieldCheck; tone: string }> = {
  coffee_cashier: { description: 'POS, tables, customers and sales history.', Icon: WalletCards, tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100' },
  coffee_inventory_manager: { description: 'Products, stock and incoming deliveries.', Icon: Package, tone: 'border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100' },
  coffee_shift_manager: { description: 'Cashier work plus shifts and expenses.', Icon: Store, tone: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100' },
  coffee_manager: { description: 'Full Coffee operations and financial reporting.', Icon: ShieldCheck, tone: 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100' },
  bakery_manager: { description: 'Full bakery control - production, recipes, sales, P&L and team.', Icon: ShieldCheck, tone: 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100' },
  restaurant_manager: { description: 'Full restaurant control - tables, menu, orders and reservations.', Icon: ShieldCheck, tone: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100' },
  warehouse_manager: { description: 'Full warehouse control - locations, transfers and stock reporting.', Icon: ShieldCheck, tone: 'border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-100' },
  clinic_manager: { description: 'Full clinic control - patients, doctors, materials and statistics.', Icon: ShieldCheck, tone: 'border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100' },
  vet_manager: { description: 'Full vet clinic control - patients, veterinarians, sales and statistics.', Icon: ShieldCheck, tone: 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100' },
  gym_manager: { description: 'Full gym control - trainees, coaches, plans, lockers and subscriptions.', Icon: ShieldCheck, tone: 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100' },
  pharmacy_manager: { description: 'Full pharmacy control - products, suppliers, orders and reports.', Icon: ShieldCheck, tone: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100' },
}

export const ALL_ROLE_META: Record<string, RoleMeta> = {
  admin: {
    label: 'Admin',
    description: 'Full system access - can manage users, settings, and all modules',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  },
  member: {
    label: 'Member',
    description: 'No kernel access. Access is granted only through the selected plugin role.',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
  },
  manager: {
    label: 'Manager',
    description: 'Cross-module management access for operations and reporting',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  },
  sales: {
    label: 'Sales',
    description: 'Commerce sales operations (POS and sales pages)',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  inventory: {
    label: 'Inventory',
    description: 'Commerce inventory and product stock control',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  finance: {
    label: 'Finance',
    description: 'Financial review and reconciliation access',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
  },
  clinic_staff: {
    label: 'Clinic Staff',
    description: 'Clinic day-to-day operations (patients, sessions, appointments)',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
  },
  vet_staff: {
    label: 'Vet Staff',
    description: 'Veterinary clinic operations (patients, sessions, appointments)',
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200'
  },
  bakery_staff: {
    label: 'Bakery Staff',
    description: 'Bakery production, recipes, and waste operations',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  },
  restaurant_staff: {
    label: 'Restaurant Staff',
    description: 'Restaurant tables, reservations, and dine-in workflow',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
  },
  warehouse_staff: {
    label: 'Warehouse Staff',
    description: 'Warehouse transfer and location stock operations',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
  },
  bakery_manager: {
    label: 'Bakery Manager',
    description: 'Full bakery control - production, recipes, sales, P&L and team',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
  },
  restaurant_manager: {
    label: 'Restaurant Manager',
    description: 'Full restaurant control - tables, menu, orders and reservations',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
  },
  warehouse_manager: {
    label: 'Warehouse Manager',
    description: 'Full warehouse control - locations, transfers and stock reporting',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
  },
  clinic_manager: {
    label: 'Clinic Manager',
    description: 'Full clinic control - patients, doctors, materials and statistics',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
  },
  vet_manager: {
    label: 'Vet Manager',
    description: 'Full vet clinic control - patients, veterinarians, sales and statistics',
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200'
  },
  gym_manager: {
    label: 'Gym Manager',
    description: 'Full gym control - trainees, coaches, plans, lockers and subscriptions',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
  },
  pharmacy_manager: {
    label: 'Pharmacy Manager',
    description: 'Full pharmacy control - products, suppliers, orders and reports',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
  },
  coffee_staff: {
    label: 'Coffee Shop Staff',
    description: 'Coffee Shop POS, tables, customers, and sales operations',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
  },
}

export const CORE_ROLES = ['admin', 'manager', 'member']

export function isPluginScoped(pluginId: PluginId | null): pluginId is PluginId {
  return Boolean(pluginId && BUNDLED_PLUGIN_FLAGS[pluginId])
}
