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
  COMMERCE: 'commerce',
  BAKERY: 'bakery',
  RESTAURANT: 'restaurant',
  WAREHOUSE: 'warehouse',
  CLINIC: 'clinic',
  VET: 'vet',
  GYM: 'gym',
  PHARMACY: 'pharmacy'
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
  /** One-time license price in USD. Mirrored on the marketing site (nebula/src/lib/plugins.ts). */
  price: number
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleMeta> = {
  [MODULE_IDS.COMMERCE]: {
    id: MODULE_IDS.COMMERCE,
    name: 'Commerce',
    description: 'Core retail & commerce features: products, inventory, point of sale, sales, and multi-store management.',
    features: [
      'Product catalog with variants & barcodes',
      'Inventory management with reorder alerts',
      'Point of Sale terminal',
      'Sales transaction history & refunds',
      'Multi-store & branch management',
      'Supplier & purchase order management',
      'Installment & deposit payments',
    ],
    icon: '🛒',
    color: 'indigo',
    status: 'active',
    models: ['Product', 'ProductVariant', 'Category', 'SaleTransaction', 'SaleItem', 'Store', 'Supplier', 'PurchaseOrder', 'InstallmentPlan', 'Installment'],
    ipcPrefix: 'commerce',
    routePrefix: '/products',
    price: 299
  },
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
    routePrefix: '/bakery',
    price: 199
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
    routePrefix: '/restaurant',
    price: 249
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
    routePrefix: '/warehouse',
    price: 199
  },
  [MODULE_IDS.CLINIC]: {
    id: MODULE_IDS.CLINIC,
    name: 'Clinic',
    description: 'Patient management, medical session records, prescription history and clinical statistics.',
    features: [
      'Patient records with full medical history',
      'Session notes with vitals tracking',
      'Prescription management per visit',
      'Multi-doctor: profiles, linked sessions & appointments, per-doctor stats',
      'Follow-up scheduling',
      'Clinical statistics & diagnosis trends',
    ],
    icon: '🏥',
    color: 'teal',
    status: 'active',
    models: ['ClinicPatient', 'ClinicSession', 'ClinicPrescription', 'ClinicCheckResult', 'ClinicAppointment', 'ClinicExpense', 'ClinicStaff', 'ClinicSalaryRecord', 'ClinicMaterial', 'ClinicMaterialCategory', 'ClinicMaterialBatch', 'ClinicSessionMaterial', 'ClinicMaterialLoss', 'ClinicMaterialExpiry', 'ClinicMaterialAdjustment'],
    ipcPrefix: 'clinic',
    routePrefix: '/clinic',
    price: 279
  },
  [MODULE_IDS.VET]: {
    id: MODULE_IDS.VET,
    name: 'Vet Clinic',
    description: 'Veterinary clinic management — pet patients with owner records, vet sessions, appointments and clinical statistics.',
    features: [
      'Pet patient records with owner information',
      'Veterinary session notes with vet vitals',
      'Prescription management per visit',
      'Appointment scheduling with conflict detection',
      'Follow-up reminders & overdue tracking',
      'Clinical statistics & diagnosis trends',
    ],
    icon: '🐾',
    color: 'violet',
    status: 'active',
    models: ['VetOwner', 'VetPatient', 'VetSession', 'VetPrescription', 'VetAppointment', 'VetCheckResult', 'VetExpense', 'VetStaff', 'VetSalaryRecord'],
    ipcPrefix: 'vet',
    routePrefix: '/vet',
    price: 279
  },
  [MODULE_IDS.GYM]: {
    id: MODULE_IDS.GYM,
    name: 'Gym',
    description: 'Gym management — coaches, trainees, subscription plans, walk-in sessions and financial tracking.',
    features: [
      'Trainee profiles with subscription history',
      'Coach roster with specialties and QR codes',
      'Flexible subscription plans with freeze support',
      'Walk-in session logging',
      'Expense tracking and financial reporting',
    ],
    icon: '🏋️',
    color: 'orange',
    status: 'active',
    models: ['GymCoach', 'GymTrainee', 'GymPlan', 'GymSubscription', 'GymFreeze', 'GymWalkSession', 'GymExpense'],
    ipcPrefix: 'gym',
    routePrefix: '/gym',
    price: 199
  },
  [MODULE_IDS.PHARMACY]: {
    id: MODULE_IDS.PHARMACY,
    name: 'Pharmacy',
    description: 'Retail pharmacy management — product catalogue, batch & expiry tracking, point-of-sale, suppliers and purchase orders.',
    features: [
      'Medicine/product catalogue with barcodes & pricing',
      'Batch tracking with cost, quantity and expiry dates',
      'FEFO (first-expired-first-out) stock deduction on sale',
      'Point-of-sale checkout with discounts & partial payment',
      'Refunds with automatic restock',
      'Expiry & low-stock alerts dashboard',
      'Suppliers & purchase orders that receive into stock',
      'Sales, inventory & revenue reports with CSV export',
    ],
    icon: '💊',
    color: 'emerald',
    status: 'active',
    models: ['PharmacyProduct', 'PharmacyBatch', 'PharmacySale', 'PharmacySaleItem', 'PharmacySupplier', 'PharmacyPurchaseOrder', 'PharmacyPurchaseOrderItem'],
    ipcPrefix: 'pharmacy',
    routePrefix: '/pharmacy',
    price: 279
  }
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

/** Sum of every module's one-time license price (USD). */
export const SUITE_LIST_PRICE = Object.values(MODULE_REGISTRY).reduce((sum, m) => sum + m.price, 0)

/** Full-suite price with a 40% bundle discount, rounded to the nearest $10. */
export const SUITE_PRICE = Math.round((SUITE_LIST_PRICE * 0.6) / 10) * 10

/** Format a USD license price, e.g. 299 → "$299". */
export const formatLicensePrice = (n: number): string => `$${n.toLocaleString('en-US')}`

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
