/**
 * Coffee Shop – Main Page
 * Tab-based navigation container for the entire coffee plugin.
 * Tabs: POS | Tables | Products | Inventory | Incoming | Expenses | Sales | Shifts | Customers | Reports | Finance
 */

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  Coffee,
  CreditCard,
  LayoutGrid,
  Package,
  BoxesIcon,
  Receipt,
  Timer,
  Users,
  BarChart3,
  Wallet,
  Truck,
  HelpCircle,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Keyboard,
  ChevronRight,
  Layers,
  UtensilsCrossed,
  TrendingUp
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import type { Capability } from '../../../../../shared/permissions'

// Sub-views
import TablesTab from './tables/TablesTab'
import ProductsTab from './product/ProductsTab'
import InventoryTab from './inventory/InventoryTab'
import SalesTab from './sales/SalesTab'
import ShiftsTab from './shifts/ShiftsTab'
import CustomersTab from './customers/CustomersTab'
import ReportsTab from './reports/ReportsTab'
import FinanceTab from './finance/FinanceTab'
import ReceiptsModule from './receipts/ReceiptsModule'
import ExpensesTab from './expenses/ExpensesTab'
import POSView from './pos/POSView'

export type CoffeeTab =
  | 'pos'
  | 'tables'
  | 'products'
  | 'inventory'
  | 'incoming'
  | 'expenses'
  | 'sales'
  | 'shifts'
  | 'customers'
  | 'reports'
  | 'finance'

interface TabConfig {
  id: CoffeeTab
  labelKey: string
  defaultLabel: string
  icon: ReactNode
  capability: Capability
  badge?: string
}

const TABS_CONFIG: TabConfig[] = [
  { id: 'pos', labelKey: 'cfPOS', defaultLabel: 'POS Register', icon: <CreditCard className="w-4 h-4" />, capability: 'coffee_pos' },
  { id: 'tables', labelKey: 'cfTables', defaultLabel: 'Floor & Tables', icon: <LayoutGrid className="w-4 h-4 text-amber-500" />, capability: 'coffee_tables' },
  { id: 'products', labelKey: 'cfProducts', defaultLabel: 'Products & Menu', icon: <Package className="w-4 h-4" />, capability: 'coffee_products' },
  { id: 'inventory', labelKey: 'cfInventory', defaultLabel: 'Stock & Ingredients', icon: <BoxesIcon className="w-4 h-4" />, capability: 'coffee_inventory' },
  { id: 'incoming', labelKey: 'cfIncoming', defaultLabel: 'Deliveries', icon: <Truck className="w-4 h-4" />, capability: 'coffee_incoming' },
  { id: 'expenses', labelKey: 'cfExpenses', defaultLabel: 'Expenses', icon: <Receipt className="w-4 h-4" />, capability: 'coffee_expenses' },
  { id: 'sales', labelKey: 'cfSales', defaultLabel: 'Sales & Receipts', icon: <Receipt className="w-4 h-4" />, capability: 'coffee_sales' },
  { id: 'shifts', labelKey: 'cfShifts', defaultLabel: 'Cashier Shifts', icon: <Timer className="w-4 h-4" />, capability: 'coffee_shifts' },
  { id: 'customers', labelKey: 'cfCustomers', defaultLabel: 'Customers & CRM', icon: <Users className="w-4 h-4" />, capability: 'coffee_customers' },
  { id: 'reports', labelKey: 'cfReports', defaultLabel: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, capability: 'coffee_reports' },
  { id: 'finance', labelKey: 'cfFinance', defaultLabel: 'Finance & Ledger', icon: <Wallet className="w-4 h-4" />, capability: 'coffee_finance' }
]

export default function CoffeePage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  const hasPluginAccess = can('access_coffee')

  // Filter visible tabs by user capabilities
  const visibleTabs = useMemo(() => {
    if (!hasPluginAccess) return []
    return TABS_CONFIG.filter((tab) => can(tab.capability))
  }, [hasPluginAccess, can])

  // State Management
  const [activeTab, setActiveTab] = useState<CoffeeTab>(() => {
    const saved = sessionStorage.getItem('bizflow:coffee:tab') as CoffeeTab
    return saved || 'pos'
  })

  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:coffee:fullscreen_mode') === 'true'
  })

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'pos'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:coffee:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Tab Switch Handler
  const handleTabChange = (tabId: CoffeeTab) => {
    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:coffee:tab', tabId)
  }

  // Keyboard Shortcuts: Alt + 1..9 & Modal F1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys Alt + 1..9
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const targetIndex = parseInt(e.key, 10) - 1
        if (targetIndex >= 0 && targetIndex < visibleTabs.length) {
          e.preventDefault()
          handleTabChange(visibleTabs[targetIndex].id)
        }
      }

      // Help Modal on F1
      if (e.key === 'F1') {
        e.preventDefault()
        setShowHowItWorks((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleTabs])

  const toggleFullscreen = () => {
    const next = !isFullscreenMode
    setIsFullscreenMode(next)
    localStorage.setItem('bizflow:coffee:fullscreen_mode', String(next))
  }

  if (!hasPluginAccess) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
        You do not have permission to access the Coffee Shop plugin.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* ── Top Navigation & Header ────────────────────────────────────────── */}
      <header className="flex-shrink-0 pb-1 w-full">
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
          
          {/* Top Row: Brand, Engine Status & Controls */}
          {!isFullscreenMode && (
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('coffeeTitle') || 'Coffee & Restaurant'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> High-Speed POS & Tables
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title="How it Works & Shortcuts (F1)"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">{t('guide') || 'How It Works'}</span>
                  <kbd className="hidden md:inline px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
                    F1
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={isFullscreenMode ? 'Exit Max View' : 'Focus Mode (Maximize View)'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Bottom Row: Tab Navigation Strip */}
          <div className="px-2 py-1 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <nav
              ref={tabListRef}
              role="tablist"
              aria-label="Coffee Sub-modules"
              className="flex items-center gap-1 min-w-max"
            >
              {visibleTabs.map((tab, idx) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => handleTabChange(tab.id)}
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors'}>
                      {tab.icon}
                    </span>

                    <span>{t(tab.labelKey as any) || tab.defaultLabel}</span>

                    {/* Fast Keycap Badge */}
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded border transition-opacity ${
                        isActive
                          ? 'border-white/20 bg-white/10 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Special Badge (e.g., FAST) */}
                    {tab.badge && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-amber-200 text-amber-950'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Compact Mode Restore Button */}
            {isFullscreenMode && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-auto"
                title="Restore Standard View"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Tab Viewport ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'pos' && can('coffee_pos') && <POSView />}
        {activeTab === 'tables' && can('coffee_tables') && <TablesTab />}
        {activeTab === 'products' && can('coffee_products') && <ProductsTab />}
        {activeTab === 'inventory' && can('coffee_inventory') && <InventoryTab />}
        {activeTab === 'incoming' && can('coffee_incoming') && <ReceiptsModule />}
        {activeTab === 'expenses' && can('coffee_expenses') && <ExpensesTab />}
        {activeTab === 'sales' && can('coffee_sales') && <SalesTab />}
        {activeTab === 'shifts' && can('coffee_shifts') && <ShiftsTab />}
        {activeTab === 'customers' && can('coffee_customers') && <CustomersTab />}
        {activeTab === 'reports' && can('coffee_reports') && <ReportsTab />}
        {activeTab === 'finance' && can('coffee_finance') && <FinanceTab />}
      </main>

      {/* ── Operational Guide & Shortcuts Modal ────────────────────────────── */}
      {showHowItWorks && <CoffeeGuideModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}

/**
 * Coffee Shop Operational Workflow & Keyboard Shortcuts Modal
 */
function CoffeeGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const workflowSteps = [
    {
      step: '01',
      title: t('cfProductsCategoriesSetup'),
      desc: t('cfProductsCategoriesSetupDesc'),
      icon: <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    },
    {
      step: '02',
      title: t('cfUpdateStockRawIngredients'),
      desc: t('cfUpdateStockRawIngredientsDesc'),
      icon: <BoxesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    },
    {
      step: '03',
      title: t('cfOpenCashierShift'),
      desc: t('cfOpenCashierShiftDesc'),
      icon: <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    },
    {
      step: '04',
      title: t('cfSellViaPOSOrFloorTables'),
      desc: t('cfSellViaPOSOrFloorTablesDesc'),
      icon: <UtensilsCrossed className="w-4 h-4 text-purple-600 dark:text-purple-400" />
    },
    {
      step: '05',
      title: t('cfSalesAuditExpensesEndOfShift'),
      desc: t('cfSalesAuditExpensesEndOfShiftDesc'),
      icon: <TrendingUp className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..9', label: 'Jump to tab by number' },
    { key: 'F1', label: 'Toggle this guide & help dialog' },
    { key: 'Enter / F8', label: 'Confirm & Quick Checkout' },
    { key: 'Space', label: 'Open split payment dialog' },
    { key: 'Esc', label: 'Cancel order / Close active popup' }
  ]

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('coffeeGuideTitle') || 'Coffee Shop Operations & Workflow'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step-by-step cycle for smooth register and floor service.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Operations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {workflowSteps.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                      STEP {item.step}
                    </span>
                    {item.icon}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{item.title}</h4>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* POS & Keyboard Shortcuts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Fast Keyboard Accelerators
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                >
                  <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">{sc.label}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Alt + 1..9</kbd> anywhere to navigate
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('close') || 'Got It'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}