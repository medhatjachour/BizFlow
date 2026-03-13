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
  /** Short bullet-point feature list shown in the settings UI. */
  features: string[]
  icon: string
  color: string
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
    description: 'Production scheduling, recipe management, ingredient pantry and waste tracking for bakery businesses.',
    features: [
      'Recipe builder with yield & cost calculation',
      'Production batch scheduling & tracking',
      'Pantry / ingredient stock management',
      'Waste logging & spoilage analytics',
      'Daily production schedule board',
    ],
    icon: '🥐',
    color: 'amber',
    status: 'active',
    models: ['Recipe', 'RecipeIngredient', 'ProductionBatch', 'PantryIngredient', 'WasteLog', 'ProductionSchedule'],
    ipcPrefix: 'bakery',
    routePrefix: '/bakery'
  },
  [MODULE_IDS.RESTAURANT]: {
    id: MODULE_IDS.RESTAURANT,
    name: 'Restaurant',
    description: 'Table management, reservations and dine-in order management for restaurants.',
    features: [
      'Visual table layout & seat management',
      'Reservation booking with guest details',
      'Dine-in order creation from the table',
      'Menu item management per category',
      'Kitchen-ready order status board',
    ],
    icon: '🍽️',
    color: 'rose',
    status: 'active',
    models: ['RestaurantTable', 'TableReservation', 'MenuItem', 'DineInOrder', 'DineInOrderItem'],
    ipcPrefix: 'restaurant',
    routePrefix: '/restaurant'
  },
  [MODULE_IDS.WAREHOUSE]: {
    id: MODULE_IDS.WAREHOUSE,
    name: 'Warehouse',
    description: 'Multi-location inventory with bin/location tracking and inter-location stock transfers.',
    features: [
      'Multiple warehouse location management',
      'Per-location stock level tracking',
      'Stock transfer between locations',
      'Transfer history & audit trail',
      'Low-stock alerts per location',
    ],
    icon: '🏭',
    color: 'blue',
    status: 'active',
    models: ['WarehouseLocation', 'WarehouseStock', 'StockTransfer', 'StockTransferItem'],
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
