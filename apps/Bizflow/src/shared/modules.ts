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
  PHARMACY: 'pharmacy',
  COFFEE: 'coffee',
  PERSONAL: 'personal'
} as const

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS]

// ─── Module Metadata ─────────────────────────────────────────────────────────

export interface ModuleMeta {
  id: ModuleId
  name: string
  /** Arabic display name. Arabic is the app's default locale. */
  nameAr: string
  description: string
  /** Arabic description, mirroring `description`. */
  descriptionAr: string
  /** Short bullet-point feature list shown in the settings UI. */
  features: string[]
  /** Arabic feature list — must stay the same length as `features`. */
  featuresAr: string[]
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
    nameAr: 'المتجر',
    description: 'Core retail & commerce features: products, inventory, point of sale, sales, and multi-store management.',
    descriptionAr:
      'ميزات التجزئة والتجارة الأساسية: المنتجات، المخزون، نقطة البيع، المبيعات، وإدارة الفروع المتعددة.',
    features: [
      'Product catalog with variants & barcodes',
      'Inventory management with reorder alerts',
      'Point of Sale terminal',
      'Sales transaction history & refunds',
      'Multi-store & branch management',
      'Supplier & purchase order management',
      'Installment & deposit payments',
    ],
    featuresAr: [
      'كتالوج منتجات مع المتغيّرات والباركود',
      'إدارة المخزون مع تنبيهات إعادة الطلب',
      'شاشة نقطة البيع (الكاشير)',
      'سجل عمليات البيع والمرتجعات',
      'إدارة الفروع والمخازن المتعددة',
      'إدارة الموردين وأوامر الشراء',
      'المدفوعات بالتقسيط والعربون',
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
    nameAr: 'المخبز',
    description: 'Production scheduling, recipe management, ingredient pantry and waste tracking for bakery businesses.',
    descriptionAr:
      'جدولة الإنتاج، إدارة الوصفات، مخزون المكوّنات، وتتبّع الهالك لمشاريع المخابز والحلويات.',
    features: [
      'Recipe builder with yield & cost calculation',
      'Production batch scheduling & tracking',
      'Pantry / ingredient stock management',
      'Waste logging & spoilage analytics',
      'Daily production schedule board',
    ],
    featuresAr: [
      'منشئ الوصفات مع حساب الكمية والتكلفة',
      'جدولة دفعات الإنتاج وتتبّعها',
      'إدارة مخزون المكوّنات (البانتري)',
      'تسجيل الهالك وتحليل الفاقد',
      'لوحة جدول الإنتاج اليومي',
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
    nameAr: 'المطعم',
    description: 'Table management, reservations and dine-in order management for restaurants.',
    descriptionAr: 'إدارة الطاولات والحجوزات وطلبات الصالة داخل المطعم.',
    features: [
      'Visual table layout & seat management',
      'Reservation booking with guest details',
      'Dine-in order creation from the table',
      'Menu item management per category',
      'Kitchen-ready order status board',
    ],
    featuresAr: [
      'مخطط مرئي للطاولات وإدارة المقاعد',
      'حجز الطاولات مع بيانات الضيوف',
      'إنشاء طلب صالة مباشرةً من الطاولة',
      'إدارة أصناف القائمة حسب التصنيف',
      'شاشة حالة الطلبات الجاهزة للمطبخ',
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
    nameAr: 'المستودع',
    description: 'Multi-location inventory with bin/location tracking and inter-location stock transfers.',
    descriptionAr:
      'مخزون متعدد المواقع مع تتبّع الأرفف/الأماكن وتحويل المخزون بين المواقع.',
    features: [
      'Multiple warehouse location management',
      'Per-location stock level tracking',
      'Stock transfer between locations',
      'Transfer history & audit trail',
      'Low-stock alerts per location',
    ],
    featuresAr: [
      'إدارة مواقع مستودعات متعددة',
      'تتبّع مستويات المخزون لكل موقع',
      'تحويل المخزون بين المواقع',
      'سجل التحويلات ومسار التدقيق',
      'تنبيهات المخزون المنخفض لكل موقع',
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
    nameAr: 'العيادة',
    description: 'Patient management, medical session records, prescription history and clinical statistics.',
    descriptionAr:
      'إدارة المرضى وسجلات الجلسات الطبية وتاريخ الروشتات والإحصائيات الطبية.',
    features: [
      'Patient records with full medical history',
      'Session notes with vitals tracking',
      'Prescription management per visit',
      'Multi-doctor: profiles, linked sessions & appointments, per-doctor stats',
      'Follow-up scheduling',
      'Clinical statistics & diagnosis trends',
    ],
    featuresAr: [
      'ملفات المرضى مع التاريخ المرضي الكامل',
      'ملاحظات الجلسات مع تسجيل العلامات الحيوية',
      'إدارة الروشتات لكل زيارة',
      'تعدد الأطباء: ملفات وجلسات ومواعيد مرتبطة وإحصائيات لكل طبيب',
      'جدولة جلسات المتابعة',
      'إحصائيات العيادة واتجاهات التشخيص',
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
    nameAr: 'العيادة البيطرية',
    description: 'Veterinary clinic management — pet patients with owner records, vet sessions, appointments and clinical statistics.',
    descriptionAr:
      'إدارة العيادات البيطرية — ملفات الحيوانات مع بيانات المالكين، الجلسات البيطرية، المواعيد، والإحصائيات.',
    features: [
      'Pet patient records with owner information',
      'Veterinary session notes with vet vitals',
      'Prescription management per visit',
      'Appointment scheduling with conflict detection',
      'Follow-up reminders & overdue tracking',
      'Clinical statistics & diagnosis trends',
    ],
    featuresAr: [
      'ملفات الحيوانات مع بيانات المالك',
      'ملاحظات الجلسات البيطرية مع العلامات الحيوية',
      'إدارة الروشتات لكل زيارة',
      'جدولة المواعيد مع كشف التعارض',
      'تذكيرات المتابعة ومتابعة المواعيد المتأخرة',
      'إحصائيات العيادة واتجاهات التشخيص',
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
    nameAr: 'الصالة الرياضية',
    description: 'Gym management — coaches, trainees, subscription plans, walk-in sessions and financial tracking.',
    descriptionAr:
      'إدارة الصالة الرياضية — المدربون، المتدربون، خطط الاشتراك، الجلسات الحرة، والمتابعة المالية.',
    features: [
      'Trainee profiles with subscription history',
      'Coach roster with specialties and QR codes',
      'Flexible subscription plans with freeze support',
      'Walk-in session logging',
      'Expense tracking and financial reporting',
    ],
    featuresAr: [
      'ملفات المتدربين مع سجل الاشتراكات',
      'قائمة المدربين مع التخصصات وأكواد QR',
      'خطط اشتراك مرنة مع دعم التجميد',
      'تسجيل الجلسات الحرة',
      'تتبّع المصروفات والتقارير المالية',
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
    nameAr: 'الصيدلية',
    description: 'Retail pharmacy management — product catalogue, batch & expiry tracking, point-of-sale, suppliers and purchase orders.',
    descriptionAr:
      'إدارة صيدليات التجزئة — كتالوج المنتجات، تتبّع التشغيلات وتواريخ الانتهاء، نقطة البيع، الموردون، وأوامر الشراء.',
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
    featuresAr: [
      'كتالوج الأدوية والمنتجات مع الباركود والأسعار',
      'تتبّع التشغيلات بالتكلفة والكمية وتاريخ الانتهاء',
      'خصم المخزون بنظام FEFO (الأقرب انتهاءً أولاً) عند البيع',
      'نقطة بيع مع الخصومات والدفع الجزئي',
      'المرتجعات مع إرجاع تلقائي للمخزون',
      'لوحة تنبيهات انتهاء الصلاحية والمخزون المنخفض',
      'الموردون وأوامر الشراء التي تُدخل الكميات إلى المخزون',
      'تقارير المبيعات والمخزون والإيرادات مع تصدير CSV',
    ],
    icon: '💊',
    color: 'emerald',
    status: 'active',
    models: ['PharmacyProduct', 'PharmacyBatch', 'PharmacySale', 'PharmacySaleItem', 'PharmacySupplier', 'PharmacyPurchaseOrder', 'PharmacyPurchaseOrderItem'],
    ipcPrefix: 'pharmacy',
    routePrefix: '/pharmacy',
    price: 279
  },
  [MODULE_IDS.COFFEE]: {
    id: MODULE_IDS.COFFEE,
    name: 'Coffee Shop',
    nameAr: 'المقهى',
    description: 'Complete coffee shop management — POS grid, table orders, dine-in/takeaway/delivery, product catalog, inventory, and shift tracking.',
    descriptionAr:
      'إدارة متكاملة للمقهى — نقطة بيع شبكية، طلبات الطاولات، صالة/تيك أواي/توصيل، كتالوج المنتجات، المخزون، وتتبّع الورديات.',
    features: [
      'Grid POS with product images, categories & cart',
      'Dine-in table management with active order tracking',
      'Takeaway & delivery orders with customer details',
      'Cash, card, and Vodafone Cash payment methods',
      'Product catalog (no SKU/variants) with photos',
      'Inventory tracking with low-stock alerts',
      'Sales history with payment breakdown per period',
      'Shift management with opening/closing cash reconciliation',
    ],
    featuresAr: [
      'نقطة بيع شبكية مع صور المنتجات والتصنيفات وسلة الطلب',
      'إدارة طاولات الصالة مع تتبّع الطلبات النشطة',
      'طلبات التيك أواي والتوصيل مع بيانات العميل',
      'طرق الدفع: نقدي، بطاقة، وفودافون كاش',
      'كتالوج منتجات (بدون باركود/متغيّرات) مع الصور',
      'تتبّع المخزون مع تنبيهات المخزون المنخفض',
      'سجل المبيعات مع تفصيل طرق الدفع لكل فترة',
      'إدارة الورديات مع تسوية النقدية عند الفتح والإغلاق',
    ],
    icon: '☕',
    color: 'amber',
    status: 'active',
    models: ['CoffeeCategory', 'CoffeeProduct', 'CoffeeStockMovement', 'CoffeeTable', 'CoffeeOrder', 'CoffeeOrderItem', 'CoffeeShift'],
    ipcPrefix: 'coffee',
    routePrefix: '/coffee',
    price: 199
  },
  [MODULE_IDS.PERSONAL]: {
    id: MODULE_IDS.PERSONAL,
    name: 'Personal Work',
    nameAr: 'العمل الشخصي',
    description:
      'A solo operator\'s work OS — scope-guarded projects with a stage-gated delivery pipeline, client bottleneck tracking, Daily 3 focus board, deep-work timer, invoices with milestone escrow, rate engineering, capacity planning and client scripts.',
    descriptionAr:
      'نظام عمل للأفراد والمستقلين — مشاريع محمية من توسّع النطاق مع مسار تسليم مُقفَل بالمراحل، تتبّع تعطّل العميل، لوحة «ثلاثة مهام يومياً»، مؤقّت عمل عميق، فواتير مع حجز الدفعات، هندسة الأجر، تخطيط الطاقة، ونصوص تواصل جاهزة.',
    features: [
      'Stage-gated delivery pipeline with payment locks',
      'Scope-creep guard: log, price and quote extra work',
      'Client bottleneck tracker that shifts deadlines automatically',
      'Per-profession pre-flight delivery checklists',
      'Daily 3 priority board with a built-in deep-work timer',
      'Invoices with split milestones and unearned-cash tracking',
      'Minimum hourly rate & quote calculator with floor price',
      'Subscription audit, retainers, expenses and tax vault',
      'Capacity heatmap, blackout dates and real hourly rate analysis',
      'One-click client scripts and a per-project scratchpad',
    ],
    featuresAr: [
      'مسار تسليم مُقفَل بالمراحل مع قيود الدفع',
      'حماية من توسّع النطاق: تسجيل وتسعير وإرسال عرض للعمل الإضافي',
      'تتبّع تعطّل العميل مع تعديل المواعيد تلقائياً',
      'قوائم فحص ما قبل التسليم لكل تخصص',
      'لوحة «ثلاثة مهام يومياً» مع مؤقّت عمل عميق مدمج',
      'فواتير بمراحل دفع متعددة وتتبّع النقد غير المكتسب',
      'حاسبة الحد الأدنى لأجر الساعة وسعر العرض',
      'تدقيق الاشتراكات والاتفاقيات الشهرية والمصروفات وخزنة الضرائب',
      'خريطة حِمل الطاقة وأيام الإجازة وتحليل الأجر الفعلي',
      'نصوص تواصل جاهزة بضغطة واحدة ولوحة ملاحظات لكل مشروع',
    ],
    icon: '🧑‍💻',
    color: 'violet',
    status: 'active',
    models: [
      'PersonalClient', 'PersonalProject', 'PersonalDeliverable', 'PersonalStageEvent',
      'PersonalChangeRequest', 'PersonalWaitLog', 'PersonalChecklistTemplate', 'PersonalChecklistItem',
      'PersonalTask', 'PersonalFocusSession', 'PersonalWorkLog', 'PersonalExpense',
      'PersonalSubscription', 'PersonalRetainer', 'PersonalRetainerUsage', 'PersonalRateProfile',
      'PersonalTaxVaultEntry', 'PersonalBlackout', 'PersonalWorkload', 'PersonalScript',
      'PersonalNote', 'PersonalInvoice', 'PersonalPayment'
    ],
    ipcPrefix: 'personal',
    routePrefix: '/personal',
    price: 249
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

/** Display text for a module in the requested language. */
export function moduleMetaText(
  meta: ModuleMeta,
  isAr: boolean
): { name: string; description: string; features: string[] } {
  if (!isAr) {
    return { name: meta.name, description: meta.description, features: meta.features }
  }
  return {
    name: meta.nameAr || meta.name,
    description: meta.descriptionAr || meta.description,
    features: meta.featuresAr?.length ? meta.featuresAr : meta.features
  }
}

/**
 * Arabic name for a module id, falling back to the registry's English name.
 * Single source of truth for the Arabic module names used across the licence
 * screens, so a rename only ever has to happen in one place.
 */
export function moduleNameAr(moduleId: string, fallback: string): string {
  const meta = (MODULE_REGISTRY as Record<string, ModuleMeta | undefined>)[moduleId]
  return meta?.nameAr || fallback
}
