/**
 * BizFlow Module Registry
 *
 * Defines available feature modules (bakery, restaurant, warehouse…),
 * their metadata, and helpers for reading/writing the enabled-modules
 * setting that is persisted in the app's user-data JSON store.
 *
 * Feature flags are stored at:
 *   <userData>/bizflow-settings.json → { enabledModules: string[] }
 *
 * Both the main process and the renderer can import these types/helpers.
 */

// ─── Module IDs ──────────────────────────────────────────────────────────────

export const MODULE_IDS = {
  BAKERY: 'bakery',
  RESTAURANT: 'restaurant',
  WAREHOUSE: 'warehouse'
} as const

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS]

// ─── Module Metadata ─────────────────────────────────────────────────────────

export interface ModuleMeta {
  id: ModuleId
  name: string
  description: string
  icon: string
  status: 'active' | 'planned' | 'future'
  /** Prisma models this module introduces (for documentation only). */
  models: string[]
  /** IPC channel prefix registered by this module's handlers. */
  ipcPrefix: string
  /** React-Router path prefix for this module's pages. */
  routePrefix: string
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleMeta> = {
  [MODULE_IDS.BAKERY]: {
    id: MODULE_IDS.BAKERY,
    name: 'Bakery',
    description:
      'Production scheduling, recipe management, ingredient pantry and waste tracking for bakery businesses.',
    icon: '🥐',
    status: 'active',
    models: ['Recipe', 'RecipeIngredient', 'ProductionBatch', 'PantryIngredient', 'WasteLog', 'ProductionSchedule'],
    ipcPrefix: 'bakery',
    routePrefix: '/bakery'
  },
  [MODULE_IDS.RESTAURANT]: {
    id: MODULE_IDS.RESTAURANT,
    name: 'Restaurant',
    description: 'Table management, reservations and kitchen order routing for restaurants.',
    icon: '🍽️',
    status: 'planned',
    models: ['Table', 'Reservation', 'KitchenOrder'],
    ipcPrefix: 'restaurant',
    routePrefix: '/restaurant'
  },
  [MODULE_IDS.WAREHOUSE]: {
    id: MODULE_IDS.WAREHOUSE,
    name: 'Warehouse',
    description: 'Multi-location inventory with bin/location tracking and stock transfers.',
    icon: '🏭',
    status: 'future',
    models: ['Location', 'Transfer', 'StockLevel'],
    ipcPrefix: 'warehouse',
    routePrefix: '/warehouse'
  }
}

// ─── Settings key ────────────────────────────────────────────────────────────

/** Key used in the app settings store. */
export const MODULES_SETTING_KEY = 'enabledModules' as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the metadata for every enabled module ID. */
export function getEnabledModules(enabledIds: string[]): ModuleMeta[] {
  return enabledIds
    .filter((id): id is ModuleId => id in MODULE_REGISTRY)
    .map((id) => MODULE_REGISTRY[id])
}

/** Check whether a specific module is enabled. */
export function isModuleEnabled(enabledIds: string[], moduleId: ModuleId): boolean {
  return enabledIds.includes(moduleId)
}
