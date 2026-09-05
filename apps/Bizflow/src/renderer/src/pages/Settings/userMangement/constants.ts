import { WalletCards, Package, Store, ShieldCheck } from 'lucide-react'
import {
  PLUGIN_REGISTRY,
  ROLE_DEFINITIONS,
  KERNEL_ROLE_KEYS,
  type PluginId,
} from '../../../../../shared/permissions'
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

/** Built-in fallback list; the UI merges in custom roles fetched from the DB. */
export const PLUGIN_ROLE_OPTIONS: PluginRoleOption[] = PLUGIN_REGISTRY.map(plugin => ({
  id: plugin.id,
  label: plugin.label,
  roles: ROLE_DEFINITIONS
    .filter(role => role.scope === plugin.id)
    .map(role => ({ key: role.key, label: role.label })),
}))

export const ROLE_PRESENTATION: Record<string, { description: string; Icon: typeof ShieldCheck; tone: string }> = {
  coffee_cashier: { description: 'POS, tables, customers and sales history.', Icon: WalletCards, tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100' },
  coffee_inventory_manager: { description: 'Products, stock and incoming deliveries.', Icon: Package, tone: 'border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-100' },
  coffee_shift_manager: { description: 'Cashier work plus shifts and expenses.', Icon: Store, tone: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100' },
  coffee_manager: { description: 'Full Coffee operations and financial reporting.', Icon: ShieldCheck, tone: 'border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100' },
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  member: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  finance: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  supervisor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

export const ALL_ROLE_META: Record<string, RoleMeta> = Object.fromEntries(
  ROLE_DEFINITIONS.map(role => [role.key, {
    label: role.label,
    description: role.description ?? 'Custom role',
    color: ROLE_COLORS[role.key] ?? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  }])
)

/** Roles assignable as a user's global role. Plugin roles are set separately. */
export const CORE_ROLES = KERNEL_ROLE_KEYS

export function isPluginScoped(pluginId: PluginId | null): pluginId is PluginId {
  return Boolean(pluginId && BUNDLED_PLUGIN_FLAGS[pluginId])
}
