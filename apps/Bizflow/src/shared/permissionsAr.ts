/**
 * Arabic display layer for the permission model.
 *
 * `permissions.ts` is the single source of truth for *enforcement* — the main
 * process decides access from it — so it stays English-only and untouched. This
 * module only supplies display strings, keyed by capability, catalog entry and
 * role id. Keying by id (rather than by the English label) means a reworded
 * label in the model falls back to English instead of silently keeping stale
 * Arabic, and `settingsI18nCoverage.test.ts` asserts full coverage of every
 * capability, catalog entry and built-in role so a new entry can never ship
 * untranslated.
 */
import {
  CAPABILITIES,
  ROLE_DEFINITION_MAP,
  PLUGIN_REGISTRY,
  catalogForScope,
  type Capability,
  type PluginId,
  type Scope
} from './permissions'
import { moduleNameAr } from './modules'

/** Plugin name in Arabic — same source the licence and Modules screens use. */
export function pluginNameAr(pluginId: string, fallback?: string): string {
  const english =
    fallback ?? PLUGIN_REGISTRY.find(plugin => plugin.id === pluginId)?.label ?? pluginId
  return moduleNameAr(pluginId, english)
}

export function pluginAccessLabelAr(pluginId: string, fallback?: string): string {
  return `الوصول إلى وحدة ${pluginNameAr(pluginId, fallback)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Capabilities
// ─────────────────────────────────────────────────────────────────────────────

/** Headings of `CAPABILITIES[...].group`. */
const GROUP_LABELS_AR: Record<string, string> = {
  Core: 'الأساسي',
  Visibility: 'الاطلاع',
  Administration: 'الإدارة',
  'Plugin Access': 'الوصول إلى الوحدات'
}

export function capabilityGroupAr(group: string): string {
  return GROUP_LABELS_AR[group] ?? group
}

const KERNEL_CAPABILITY_LABELS_AR: Record<string, string> = {
  view_dashboard: 'الاطلاع على لوحة المعلومات',
  view_reports: 'الاطلاع على التقارير',
  view_finance: 'الاطلاع على المالية',
  view_profit: 'الاطلاع على الأرباح وتكلفة البضاعة والهوامش',
  manage_staff: 'إدارة الموظفين والرواتب',
  manage_users: 'إدارة حسابات المستخدمين',
  manage_settings: 'إدارة الإعدادات والصلاحيات',
  export_data: 'تصدير وطباعة التقارير'
}

/**
 * English entry label → Arabic. Several plugins reuse the same label ("Sales",
 * "Inventory", "Give discounts"), so translating by label keeps one wording for
 * one concept instead of 101 near-duplicates that drift apart.
 */
export const ENTRY_LABELS_AR: Record<string, string> = {
  'Apply order discounts': 'تطبيق خصومات الطلبات',
  Appointments: 'المواعيد',
  Attendance: 'الحضور',
  'Batches and inventory': 'الدُفعات والمخزون',
  'Clinical statistics': 'الإحصاءات السريرية',
  Coaches: 'المدربون',
  Customers: 'العملاء',
  Dashboard: 'لوحة المعلومات',
  'Doctors and staff': 'الأطباء والموظفون',
  Expenses: 'المصروفات',
  Finance: 'المالية',
  'Follow-ups': 'المتابعات',
  'Give discounts': 'منح الخصومات',
  'Incoming stock': 'توريد المخزون',
  Installments: 'الأقساط',
  Inventory: 'المخزون',
  'Issue refunds': 'إجراء عمليات الإرجاع',
  Locations: 'المواقع',
  Lockers: 'الخزائن',
  'Materials inventory': 'مخزون المواد',
  'Medicine inventory': 'مخزون الأدوية',
  'Membership plans': 'خطط العضوية',
  Menu: 'قائمة الطعام',
  'Operations board': 'لوحة العمليات',
  'Orders and POS': 'الطلبات ونقطة البيع',
  Overview: 'نظرة عامة',
  'Owners and patients': 'الأصحاب والمرضى',
  Pantry: 'مخزون المكونات',
  Patients: 'المرضى',
  'Point of Sale': 'نقطة البيع',
  'Production batches': 'دُفعات الإنتاج',
  'Production schedule': 'جدول الإنتاج',
  Products: 'المنتجات',
  'Profit and loss': 'الأرباح والخسائر',
  'Purchase orders': 'أوامر الشراء',
  'Quick Sale': 'بيع سريع',
  Recipes: 'الوصفات',
  Reports: 'التقارير',
  'Reports and analytics': 'التقارير والتحليلات',
  Reservations: 'الحجوزات',
  Sales: 'المبيعات',
  'Sales history': 'سجل المبيعات',
  'Sessions and prescriptions': 'الجلسات والوصفات',
  Shifts: 'الورديات',
  Statistics: 'الإحصاءات',
  'Stock transfers': 'تحويلات المخزون',
  Stores: 'المتاجر',
  Subscriptions: 'الاشتراكات',
  Suppliers: 'الموردون',
  'Suppliers & purchase orders': 'الموردون وأوامر الشراء',
  Tables: 'الطاولات',
  Trainees: 'المتدربون',
  'Training programs': 'البرامج التدريبية',
  'Veterinarians and staff': 'الأطباء البيطريون والموظفون',
  'Visits and prescriptions': 'الزيارات والوصفات',
  'Void or cancel orders': 'إلغاء الطلبات',
  'Void sales': 'إلغاء المبيعات',
  'Walk-ins': 'الزيارات المباشرة',
  Waste: 'الهالك',
  // Personal Work
  Clients: 'العملاء',
  'Projects and pipeline': 'المشاريع ومسار التسليم',
  'Change requests': 'طلبات التغيير',
  'Client waits': 'انتظار العميل',
  'Daily 3 and tasks': 'المهام الثلاث اليومية والمهام',
  'Focus timer': 'مؤقّت التركيز',
  'Work log and standup': 'سجل العمل والتقرير اليومي',
  'Invoices and escrow': 'الفواتير والدفعات',
  'Rates and running costs': 'الأسعار والتكاليف الجارية',
  'Capacity and time off': 'الطاقة وأيام الإجازة',
  'Client playbook': 'دليل التعامل مع العملاء',
  Scratchpad: 'المفكرة',
  'Apply invoice discounts': 'تطبيق خصومات الفواتير',
  'Void invoices': 'إلغاء الفواتير',
  'Write off bad debt': 'شطب الديون المعدومة',
}

/** Every capability the model declares, translated. */
export const CAPABILITY_LABELS_AR: Record<Capability, string> = {
  ...KERNEL_CAPABILITY_LABELS_AR,
  ...Object.fromEntries(
    PLUGIN_REGISTRY.flatMap(plugin => [
      [plugin.access, pluginAccessLabelAr(plugin.id, plugin.label)],
      ...plugin.entries.map(entry => [entry.capability, ENTRY_LABELS_AR[entry.label] ?? entry.label])
    ])
  )
} as Record<Capability, string>

export function capabilityLabelAr(capability: Capability): string {
  return CAPABILITY_LABELS_AR[capability] ?? CAPABILITIES[capability]?.label ?? capability
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission catalogs (the pages and actions the matrix lists)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The kernel catalog names the *screen* ("Dashboard"), while the kernel
 * capability names the *right* ("View the dashboard") — they are deliberately
 * different strings, so the catalog needs its own map rather than reusing
 * `KERNEL_CAPABILITY_LABELS_AR`.
 */
const KERNEL_CATALOG_LABELS_AR: Record<string, string> = {
  dashboard: 'لوحة المعلومات',
  reports: 'التقارير',
  finance: 'المالية',
  employees: 'الموظفون والرواتب',
  settings: 'الإعدادات',
  users: 'إدارة المستخدمين',
  profit: 'الاطلاع على الأرباح وتكلفة البضاعة والهوامش',
  export: 'تصدير وطباعة التقارير'
}

/** Name of the scope being edited: "Core" or the plugin's Arabic name. */
export function catalogScopeLabelAr(scope: Scope): string {
  const catalog = catalogForScope(scope)
  return scope === 'kernel' ? 'الأساسي' : pluginNameAr(scope, catalog.label)
}

/** Label of one page/action row in the permission matrix. */
export function catalogEntryLabelAr(
  scope: Scope,
  entry: { id: string; capability: Capability; label: string }
): string {
  if (scope === 'kernel') return KERNEL_CATALOG_LABELS_AR[entry.id] ?? entry.label
  return ENTRY_LABELS_AR[entry.label] ?? entry.label
}

// ─────────────────────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_LABELS_AR: Record<string, string> = {
  // kernel roles
  admin: 'مدير النظام',
  manager: 'مدير',
  member: 'موظف',
  finance: 'محاسب',
  supervisor: 'مشرف',
  // retained for databases created before plugin-scoped roles
  sales: 'مبيعات (دور قديم)',
  inventory: 'مخزون (دور قديم)',
  cashier: 'كاشير (دور قديم)',
  // extra plugin roles declared in permissions.ts
  commerce_cashier: 'كاشير',
  commerce_inventory: 'مدير المخزون',
  commerce_finance: 'محاسب',
  coffee_cashier: 'كاشير',
  coffee_inventory_manager: 'مدير المخزون',
  coffee_shift_manager: 'مدير الوردية',
  pharmacy_cashier: 'كاشير',
  pharmacy_inventory_manager: 'مدير المخزون',
  personal_producer: 'منتِج',
  personal_billing: 'الفوترة',
  personal_tracker: 'متتبّع الوقت'
}

export const ROLE_DESCRIPTIONS_AR: Record<string, string> = {
  admin: 'وصول غير مقيّد إلى كل شيء، ولا يمكن الحد منه.',
  manager: 'وصول كامل إلى صفحات التطبيق الأساسية وإلى كل وحدة مُثبَّتة.',
  member: 'يستطيع تسجيل الدخول دون أي وصول حتى يُسنَد إليه دور داخل وحدة.',
  finance: 'الاطلاع على المالية والتقارير والأرباح.',
  supervisor: 'التقارير وإدارة الموظفين.',
  sales: 'دور مبيعات قديم خاص بوحدة المتجر.',
  inventory: 'دور مخزون قديم خاص بوحدة المتجر.',
  cashier: 'دور كاشير قديم خاص بوحدة المتجر.'
}

/**
 * Arabic label for a role. Built-in plugin roles are templated in
 * `permissions.ts` (`<Plugin> Manager` / `<Plugin> Staff`), so they are matched
 * against `ROLE_DEFINITION_MAP` — a custom role that merely *looks* like
 * `commerce_manager` keeps the name the user typed.
 */
export function roleLabelAr(key: string, fallback: string): string {
  const explicit = ROLE_LABELS_AR[key]
  if (explicit) return explicit

  const definition = ROLE_DEFINITION_MAP[key]
  if (definition && definition.scope !== 'kernel') {
    const plugin = pluginNameAr(definition.scope, definition.scope as PluginId)
    if (key === `${definition.scope}_manager`) return `مدير ${plugin}`
    if (key === `${definition.scope}_staff`) return `موظف ${plugin}`
  }

  return fallback
}

/** Arabic description for a role; falls back to the stored English one. */
export function roleDescriptionAr(key: string, fallback?: string | null): string {
  const explicit = ROLE_DESCRIPTIONS_AR[key]
  if (explicit) return explicit

  const definition = ROLE_DEFINITION_MAP[key]
  if (definition && definition.scope !== 'kernel') {
    const plugin = pluginNameAr(definition.scope, definition.scope as PluginId)
    if (key === `${definition.scope}_manager`) return `وصول كامل إلى كل صفحات وحدة ${plugin} وإجراءاتها.`
    if (key === `${definition.scope}_staff`) return `عمليات وحدة ${plugin} اليومية دون الإجراءات الحساسة.`
  }

  return fallback ?? ''
}

/**
 * Label to *show* for a role whose name is editable and stored in the database.
 *
 * The Roles screen lets an owner rename any non-system role, and that name is
 * persisted. So the Arabic label may only stand in while the stored name is
 * still the English default this build shipped — otherwise we would silently
 * replace the owner's own wording with ours.
 */
export function roleDisplayLabelAr(key: string, storedLabel: string | null | undefined): string {
  const stored = (storedLabel ?? '').trim()
  const definition = ROLE_DEFINITION_MAP[key]
  if (!stored || (definition && stored === definition.label)) return roleLabelAr(key, stored || key)
  return stored
}
