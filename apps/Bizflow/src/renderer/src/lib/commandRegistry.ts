/**
 * Command registry for the ⌘K palette and the shortcut reference.
 *
 * Two things this fixes about the old palette:
 *
 *  1. It only knew about ten hard-coded routes, so none of the plugin screens
 *     were reachable. Every module page is now a command, generated from the
 *     module registry, and built from the same tab ids the plugins themselves
 *     use - so a command can never point at a tab that does not exist.
 *
 *  2. It only matched literal substrings. Search now scores exact, prefix,
 *     word-start, keyword and fuzzy-subsequence hits, needs all query tokens to
 *     match, and understands Arabic as well as English (the app defaults to
 *     Arabic, so searching in Arabic has to work).
 *
 * Deep-linking uses the mechanism the plugins already expose: each module
 * listens for `bizflow:<module>:open-tab`, and persists its tab to
 * `sessionStorage['bizflow:<module>:tab']` for the case where the module is not
 * mounted yet.
 */

import { MODULE_IDS, MODULE_REGISTRY, type ModuleId } from '../../../shared/modules'

export type CommandGroup = 'core' | 'settings' | 'module' | 'action'

export interface Command {
  id: string
  label: string
  description?: string
  group: CommandGroup
  /** Module this command belongs to, when it is module-specific. */
  moduleId?: ModuleId
  /** Extra search terms: synonyms, abbreviations, Arabic. */
  keywords: string[]
  /** Rendered as a key hint on the right. */
  shortcut?: string[]
  run: (ctx: CommandContext) => void
}

export interface CommandContext {
  navigate: (to: string) => void
  close: () => void
  /** Current route, so we do not navigate when we are already there. */
  pathname: string
  setLanguage?: (lang: 'en' | 'ar') => void
}

/* -------------------------------------------------------------------------- */
/* Tab id -> human label. Ids repeat across modules, so one map covers them.   */
/* -------------------------------------------------------------------------- */

interface TabInfo {
  label: string
  keywords: string[]
}

const TAB_INFO: Record<string, TabInfo> = {
  overview: { label: 'Overview', keywords: ['summary', 'home', 'نظرة عامة'] },
  dashboard: { label: 'Dashboard', keywords: ['home', 'summary', 'لوحة التحكم'] },
  pos: { label: 'POS Register', keywords: ['point of sale', 'checkout', 'till', 'cashier', 'register', 'نقاط البيع', 'كاشير'] },
  quicksale: { label: 'Turbo QuickSale', keywords: ['fast', 'quick', 'express', 'rapid', 'turbo', 'بيع سريع'] },
  products: { label: 'Products & SKUs', keywords: ['items', 'item', 'catalog', 'catalogue', 'sku', 'price', 'منتجات', 'أصناف'] },
  inventory: { label: 'Stock & Inventory', keywords: ['stock', 'levels', 'adjust', 'count', 'مخزون', 'جرد'] },
  sales: { label: 'Sales & Orders', keywords: ['orders', 'transactions', 'history', 'receipts', 'مبيعات', 'طلبات'] },
  customers: { label: 'Customers', keywords: ['clients', 'contacts', 'credit', 'balance', 'عملاء', 'زبائن'] },
  stores: { label: 'Branches & Stores', keywords: ['locations', 'branches', 'shops', 'فروع'] },
  suppliers: { label: 'Suppliers', keywords: ['vendors', 'supply', 'purchase', 'موردين'] },
  expenses: { label: 'Expenses', keywords: ['costs', 'spending', 'bills', 'مصاريف', 'نفقات'] },
  finance: { label: 'Finance', keywords: ['money', 'accounting', 'revenue', 'profit', 'مالية', 'محاسبة'] },
  reports: { label: 'Reports', keywords: ['analytics', 'insights', 'statistics', 'تقارير'] },
  recipes: { label: 'Recipes', keywords: ['formula', 'ingredients', 'yield', 'وصفات'] },
  production: { label: 'Production', keywords: ['batches', 'bake', 'manufacture', 'إنتاج'] },
  pantry: { label: 'Pantry', keywords: ['ingredients', 'raw materials', 'مخزن'] },
  waste: { label: 'Waste', keywords: ['spoilage', 'shrinkage', 'loss', 'هدر', 'تالف'] },
  schedule: { label: 'Schedule', keywords: ['planning', 'roster', 'calendar', 'جدول'] },
  pnl: { label: 'Profit & Loss', keywords: ['p&l', 'pnl', 'margin', 'أرباح وخسائر'] },
  patients: { label: 'Patients', keywords: ['records', 'files', 'مرضى'] },
  sessions: { label: 'Sessions', keywords: ['visits', 'consultations', 'جلسات'] },
  appointments: { label: 'Appointments', keywords: ['booking', 'diary', 'calendar', 'مواعيد'] },
  followups: { label: 'Follow-ups', keywords: ['recall', 'return visits', 'متابعة'] },
  doctors: { label: 'Doctors', keywords: ['staff', 'physicians', 'أطباء'] },
  stats: { label: 'Statistics', keywords: ['analytics', 'reports', 'إحصائيات'] },
  materials: { label: 'Materials', keywords: ['supplies', 'consumables', 'مواد'] },
  tables: { label: 'Tables', keywords: ['floor', 'seating', 'طاولات'] },
  incoming: { label: 'Incoming Stock', keywords: ['deliveries', 'goods in', 'وارد'] },
  shifts: { label: 'Shifts', keywords: ['roster', 'staff hours', 'ورديات'] },
  menu: { label: 'Menu', keywords: ['dishes', 'items', 'قائمة'] },
  orders: { label: 'Orders', keywords: ['purchase orders', 'طلبات'] },
  reservations: { label: 'Reservations', keywords: ['bookings', 'حجوزات'] },
  attendance: { label: 'Attendance', keywords: ['check-in', 'presence', 'حضور'] },
  trainees: { label: 'Trainees', keywords: ['members', 'clients', 'متدربين'] },
  coaches: { label: 'Coaches', keywords: ['trainers', 'staff', 'مدربين'] },
  subscriptions: { label: 'Subscriptions', keywords: ['memberships', 'plans', 'اشتراكات'] },
  walkins: { label: 'Walk-ins', keywords: ['drop in', 'casual', 'زوار'] },
  plans: { label: 'Plans', keywords: ['packages', 'tiers', 'باقات'] },
  lockers: { label: 'Lockers', keywords: ['storage', 'خزائن'] },
  programs: { label: 'Programs', keywords: ['workouts', 'classes', 'برامج'] },
  owners: { label: 'Owners', keywords: ['pet owners', 'clients', 'أصحاب'] },
  vets: { label: 'Vets', keywords: ['veterinarians', 'doctors', 'أطباء بيطريين'] },
  medicines: { label: 'Medicines', keywords: ['drugs', 'pharmacy', 'أدوية'] },
  salesHistory: { label: 'Sales History', keywords: ['past sales', 'transactions', 'سجل المبيعات'] },
  locations: { label: 'Locations', keywords: ['warehouses', 'sites', 'مواقع'] },
  transfers: { label: 'Transfers', keywords: ['move stock', 'between locations', 'نقل'] },
  operations: { label: 'Operations', keywords: ['tasks', 'work', 'عمليات'] },
}

/** Every module page, using the exact tab ids the plugins register. */
const MODULE_TABS: Record<ModuleId, string[]> = {
  [MODULE_IDS.COMMERCE]: ['pos', 'quicksale', 'products', 'inventory', 'sales', 'customers', 'stores', 'suppliers', 'expenses'],
  [MODULE_IDS.BAKERY]: ['overview', 'recipes', 'production', 'sales', 'pantry', 'waste', 'schedule', 'pnl', 'expenses'],
  [MODULE_IDS.RESTAURANT]: ['overview', 'tables', 'orders', 'sales', 'reservations', 'menu', 'inventory', 'recipes', 'shifts', 'waste'],
  [MODULE_IDS.WAREHOUSE]: ['overview', 'operations', 'locations', 'inventory', 'transfers'],
  [MODULE_IDS.CLINIC]: ['patients', 'sessions', 'appointments', 'followups', 'doctors', 'stats', 'expenses', 'materials'],
  [MODULE_IDS.VET]: ['owners', 'vets', 'sessions', 'appointments', 'followups', 'medicines', 'sales', 'salesHistory', 'stats', 'expenses'],
  [MODULE_IDS.GYM]: ['attendance', 'trainees', 'coaches', 'subscriptions', 'walkins', 'plans', 'lockers', 'programs'],
  [MODULE_IDS.PHARMACY]: ['dashboard', 'pos', 'products', 'inventory', 'sales', 'customers', 'suppliers', 'orders', 'reports'],
  [MODULE_IDS.COFFEE]: ['pos', 'tables', 'products', 'inventory', 'incoming', 'expenses', 'sales', 'shifts', 'customers', 'reports', 'finance'],
}

/* -------------------------------------------------------------------------- */
/* Core navigation and settings                                               */
/* -------------------------------------------------------------------------- */

interface CoreEntry {
  path: string
  label: string
  description: string
  keywords: string[]
  settingsTab?: string
}

const CORE: CoreEntry[] = [
  { path: '/dashboard', label: 'Dashboard', description: 'Sales overview and analytics', keywords: ['home', 'overview', 'summary', 'kpi', 'لوحة التحكم'] },
  { path: '/employees', label: 'Employees', description: 'Staff records and profiles', keywords: ['staff', 'team', 'hr', 'people', 'موظفين'] },
  { path: '/reports', label: 'Reports', description: 'Business reports and trends', keywords: ['analytics', 'insights', 'statistics', 'تقارير'] },
  { path: '/finance', label: 'Finance', description: 'Revenue, costs and margins', keywords: ['money', 'accounting', 'profit', 'مالية'] },
  { path: '/settings', label: 'Settings', description: 'All application settings', keywords: ['preferences', 'config', 'options', 'إعدادات'] },

  { path: '/settings', settingsTab: 'general', label: 'Settings — General', description: 'Store details, currency, timezone, licence', keywords: ['store name', 'currency', 'timezone', 'licence', 'license', 'activate', 'إعدادات عامة', 'الترخيص'] },
  { path: '/settings', settingsTab: 'display', label: 'Settings — Display', description: 'Language, theme and layout', keywords: ['theme', 'dark mode', 'language', 'arabic', 'عرض', 'اللغة'] },
  { path: '/settings', settingsTab: 'categories', label: 'Settings — Categories', description: 'Product categories', keywords: ['groups', 'taxonomy', 'تصنيفات'] },
  { path: '/settings', settingsTab: 'users', label: 'Settings — Users & Roles', description: 'Accounts and permission matrix', keywords: ['permissions', 'roles', 'access', 'صلاحيات', 'مستخدمين'] },
  { path: '/settings', settingsTab: 'tax', label: 'Settings — Tax & Receipt', description: 'Tax rate, receipts, thermal printer', keywords: ['vat', 'receipt', 'printer', 'thermal', 'ضرائب', 'طباعة'] },
  { path: '/settings', settingsTab: 'notifications', label: 'Settings — Notifications', description: 'Alerts and reminders', keywords: ['alerts', 'reminders', 'تنبيهات'] },
  { path: '/settings', settingsTab: 'email', label: 'Settings — Email Reports', description: 'Scheduled email reporting', keywords: ['smtp', 'scheduled', 'بريد'] },
  { path: '/settings', settingsTab: 'backup', label: 'Settings — Backup', description: 'Back up and restore your data', keywords: ['restore', 'export', 'safety', 'نسخ احتياطي'] },
  { path: '/settings', settingsTab: 'archive', label: 'Settings — Archive', description: 'Archived records', keywords: ['history', 'old records', 'أرشيف'] },
  { path: '/settings', settingsTab: 'modules', label: 'Settings — Modules', description: 'Turn modules on and off', keywords: ['plugins', 'features', 'enable', 'وحدات'] },
]

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

/** Module ids the caller says are switched on. */
export function buildCommands(enabledModules: ModuleId[]): Command[] {
  const commands: Command[] = []

  for (const entry of CORE) {
    commands.push({
      id: `core:${entry.settingsTab ?? entry.path}`,
      label: entry.label,
      description: entry.description,
      group: entry.settingsTab ? 'settings' : 'core',
      keywords: entry.keywords,
      run: (ctx) => {
        ctx.navigate(entry.settingsTab ? `${entry.path}?tab=${entry.settingsTab}` : entry.path)
        ctx.close()
      },
    })
  }

  for (const moduleId of enabledModules) {
    const meta = MODULE_REGISTRY[moduleId]
    if (!meta) continue

    commands.push({
      id: `module:${moduleId}`,
      label: `Open ${meta.name}`,
      description: meta.description,
      group: 'module',
      moduleId,
      keywords: [moduleId, meta.icon, ...meta.features],
      run: (ctx) => {
        localStorage.setItem('bizflow:lastPlugin', moduleId)
        ctx.navigate(`/${moduleId}`)
        ctx.close()
      },
    })

    for (const tab of MODULE_TABS[moduleId] ?? []) {
      const info = TAB_INFO[tab]
      commands.push({
        id: `module:${moduleId}:${tab}`,
        label: `${meta.name} — ${info?.label ?? tab}`,
        description: info ? `${meta.name} module` : undefined,
        group: 'module',
        moduleId,
        keywords: [moduleId, tab, meta.name, ...(info?.keywords ?? [])],
        run: (ctx) => openModuleTab(moduleId, tab, ctx),
      })
    }
  }

  commands.push(
    {
      id: 'action:help',
      label: 'Open Help',
      description: 'Guides, troubleshooting and Device ID',
      group: 'action',
      keywords: ['support', 'guide', 'docs', 'device id', 'licence', 'مساعدة', 'دعم'],
      run: (ctx) => {
        ctx.close()
        window.dispatchEvent(new CustomEvent('bizflow:help:open'))
      },
    },
    {
      id: 'action:shortcuts',
      label: 'Show Keyboard Shortcuts',
      description: 'Every key the app listens for',
      group: 'action',
      keywords: ['keys', 'hotkeys', 'keyboard', 'اختصارات'],
      run: (ctx) => {
        ctx.close()
        window.dispatchEvent(new CustomEvent('bizflow:shortcuts:open'))
      },
    },
    {
      id: 'action:theme',
      label: 'Toggle Dark Mode',
      description: 'Switch between light and dark',
      group: 'action',
      keywords: ['theme', 'night', 'light', 'dark', 'وضع ليلي'],
      run: (ctx) => {
        const root = document.documentElement
        const next = root.classList.contains('dark') ? 'light' : 'dark'
        root.classList.toggle('dark', next === 'dark')
        localStorage.setItem('theme', next)
        ctx.close()
      },
    },
    {
      id: 'action:language',
      label: 'Switch Language (English ⇄ العربية)',
      description: 'Change the interface language',
      group: 'action',
      keywords: ['arabic', 'english', 'rtl', 'translation', 'اللغة', 'عربي'],
      run: (ctx) => {
        const current = localStorage.getItem('language') || 'ar'
        ctx.setLanguage?.(current === 'ar' ? 'en' : 'ar')
        ctx.close()
      },
    }
  )

  return commands
}

/**
 * Switch to a module tab. The plugins switch instantly when mounted, and read
 * the stored value when they are not - so this works from anywhere in the app.
 */
export function openModuleTab(moduleId: ModuleId, tabId: string, ctx: CommandContext): void {
  sessionStorage.setItem(`bizflow:${moduleId}:tab`, tabId)
  localStorage.setItem('bizflow:lastPlugin', moduleId)
  window.dispatchEvent(new CustomEvent(`bizflow:${moduleId}:open-tab`, { detail: tabId }))
  if (ctx.pathname !== `/${moduleId}`) ctx.navigate(`/${moduleId}`)
  ctx.close()
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

const GROUP_WEIGHT: Record<CommandGroup, number> = {
  core: 30,
  module: 20,
  settings: 10,
  action: 5,
}

/** Cheap subsequence test used for typo-tolerant matches ("dshbrd", "invntry"). */
function subsequenceScore(haystack: string, needle: string): number {
  let hi = 0
  let gaps = 0
  for (let ni = 0; ni < needle.length; ni++) {
    const found = haystack.indexOf(needle[ni], hi)
    if (found === -1) return 0
    gaps += found - hi
    hi = found + 1
  }
  // Fewer gaps between matched characters means a tighter, better match.
  return Math.max(1, 40 - gaps)
}

function scoreToken(command: Command, token: string): number {
  const label = command.label.toLowerCase()
  const description = (command.description ?? '').toLowerCase()
  const keywords = command.keywords.map((k) => String(k).toLowerCase())

  if (label === token) return 1000
  if (label.startsWith(token)) return 600
  if (new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(label)) return 450
  if (label.includes(token)) return 300
  if (keywords.some((k) => k === token)) return 260
  if (keywords.some((k) => k.startsWith(token))) return 180
  if (keywords.some((k) => k.includes(token))) return 120
  if (description.includes(token)) return 80

  // Fuzzy: only for tokens long enough that a subsequence hit is meaningful.
  if (token.length >= 3) {
    if (subsequenceScore(label, token) > 0) return 45
    if (keywords.some((k) => subsequenceScore(k, token) > 0)) return 25
  }

  return 0
}

export interface ScoredCommand {
  command: Command
  score: number
}

/**
 * Rank commands against a query. Every token must match somewhere, so extra
 * words narrow the list rather than widening it.
 */
export function searchCommands(commands: Command[], query: string): ScoredCommand[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return commands
      .map((command) => ({ command, score: GROUP_WEIGHT[command.group] }))
      .sort((a, b) => b.score - a.score)
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const results: ScoredCommand[] = []

  for (const command of commands) {
    let total = 0
    let allMatched = true

    for (const token of tokens) {
      const tokenScore = scoreToken(command, token)
      if (tokenScore === 0) {
        allMatched = false
        break
      }
      total += tokenScore
    }

    if (!allMatched) continue

    // Reward commands where every token landed in the label itself.
    const label = command.label.toLowerCase()
    if (tokens.every((t) => label.includes(t))) total += 150

    results.push({ command, score: total + GROUP_WEIGHT[command.group] })
  }

  return results.sort((a, b) => b.score - a.score)
}

/* -------------------------------------------------------------------------- */
/* Recents                                                                    */
/* -------------------------------------------------------------------------- */

const RECENT_KEY = 'bizflow:commandPalette:recent'
const RECENT_LIMIT = 5

export function readRecentCommandIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export function rememberCommand(id: string): void {
  try {
    const next = [id, ...readRecentCommandIds().filter((v) => v !== id)].slice(0, RECENT_LIMIT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable - recents are a nicety, not a requirement */
  }
}
