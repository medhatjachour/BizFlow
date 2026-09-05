import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  ShoppingCart,
  Zap,
  Package,
  Boxes,
  Receipt,
  Users,
  Store,
  WalletCards,
  CreditCard,
  X,
  Sparkles,
  Keyboard,
  TrendingUp,
  Maximize2,
  Minimize2,
  ChevronRight,
  HelpCircle,
 
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '@/shared/permissions'

// Sub-views Matching Project Structure
import POSView from './pages/POS/index'
import QuickSaleView from './pages/QuickSale/QuickSale'
import ProductsView from './pages/Products/index'
import InventoryView from './pages/Inventory/index'
import SalesView from './pages/Sales/Sales'
import CustomersView from './pages/Customers/Customers'
import StoresView from './pages/store/Stores'
import ExpensesView from './pages/Expenses/index'
import SuppliersView from './pages/Supplier'

export type CommerceTab =
  | 'pos'
  | 'quicksale'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'stores'
  | 'suppliers'
  | 'expenses'

export type TabCategory = 'checkout' | 'inventory' | 'backoffice'

interface TabConfig {
  id: CommerceTab
  label: string
  icon: ReactNode
  category: TabCategory
  badge?: string
  badgeVariant?: 'amber' | 'emerald' | 'cyan'
  hotkey: string
  description: string
}

export default function CommercePage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  // State Management
  const [activeTab, setActiveTab] = useState<CommerceTab>(() => {
    const saved = sessionStorage.getItem('bizflow:commerce:tab') as CommerceTab
    return saved || 'pos'
  })
  
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:commerce:fullscreen_mode') === 'true'
  })

  // Full Tab Registry Configuration
  const TABS: TabConfig[] = useMemo(
    () => [
      {
        id: 'pos',
        label: t('pos') || 'POS Touch Register',
        icon: <ShoppingCart className="w-4 h-4" />,
        category: 'checkout',
        hotkey: '1',
        description:
          t('commerceTabInfoPos') ||
          'Visual touch register with barcode lookup, split tender, discount rules, and thermal receipts.'
      },
      {
        id: 'quicksale',
        label: t('quickSale') || 'Turbo QuickSale',
        icon: <Zap className="w-4 h-4 text-amber-500" />,
        category: 'checkout',
        badge: 'TURBO',
        badgeVariant: 'amber',
        hotkey: '2',
        description:
          t('commerceTabInfoQuickSale') ||
          'High-speed keyboard checkout optimized for continuous ultra-fast barcode scanning.'
      },
      {
        id: 'products',
        label: t('products') || 'Products & SKUs',
        icon: <Boxes className="w-4 h-4" />,
        category: 'inventory',
        hotkey: '3',
        description:
          t('commerceTabInfoProducts') ||
          'Master catalog item records, variant matrices (size/color/batch), and barcode pricing.'
      },
      {
        id: 'inventory',
        label: t('inventory') || 'Stock & Audits',
        icon: <Package className="w-4 h-4" />,
        category: 'inventory',
        hotkey: '4',
        description:
          t('commerceTabInfoInventory') ||
          'Multi-location inventory tracking, stock adjustments, low-stock thresholds, and transfers.'
      },
      {
        id: 'sales',
        label: t('sales') || 'Sales & Orders',
        icon: <Receipt className="w-4 h-4" />,
        category: 'backoffice',
        hotkey: '5',
        description:
          t('commerceTabInfoSales') ||
          'Transaction audit logs, receipts re-printing, refunds, and cashier shift reports.'
      },
      {
        id: 'customers',
        label: t('customers') || 'Customers & Credit',
        icon: <Users className="w-4 h-4" />,
        category: 'backoffice',
        hotkey: '6',
        description:
          t('commerceTabInfoCustomers') ||
          'Customer CRM profiles, credit balance limits, loyalty points, and purchase history.'
      },
      {
        id: 'stores',
        label: t('stores') || 'Branches & Stores',
        icon: <Store className="w-4 h-4" />,
        category: 'backoffice',
        hotkey: '7',
        description:
          t('commerceTabInfoStores') ||
          'Branch locations, independent cash drawer registers, and location-based pricing.'
      },
      {
        id: 'suppliers',
        label: t('suppliers') || 'Suppliers',
        icon: <CreditCard className="w-4 h-4" />,
        category: 'backoffice',
        hotkey: '8',
        description:
          t('commerceTabInfoSuppliers') ||
          'Vendor accounts, purchase orders, balance ledgers, and accounts payable tracking.'
      },
      {
        id: 'expenses',
        label: t('expenses') || 'Expenses',
        icon: <WalletCards className="w-4 h-4" />,
        category: 'backoffice',
        hotkey: '9',
        description:
          t('commerceTabInfoExpenses') ||
          'Operating overheads, utilities, cash payouts, petty cash, and register balancing.'
      }
    ],
    [t]
  )

  // Filter tabs based on RBAC capabilities
  const visibleTabs = useMemo(() => {
    return TABS.filter((tab) => {
      const requiredCap = pluginTabCapability('commerce', tab.id)
      return !requiredCap || can(requiredCap)
    })
  }, [TABS, can])

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'pos'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:commerce:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Handle Tab Switch
  const handleTabChange = (tabId: CommerceTab) => {
    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:commerce:tab', tabId)
  }

  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<CommerceTab>).detail
      if (visibleTabs.some((tab) => tab.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:commerce:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:commerce:open-tab', handleRequestedTab)
  }, [visibleTabs])

  // Keyboard Shortcuts Navigation: Alt + 1..9 & Modal F1
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
    localStorage.setItem('bizflow:commerce:fullscreen_mode', String(next))
  }

  return (
    <div className="">
      {/* Top POS Command Navigation Bar */}
      <header className="flex-shrink-0 pb-1.5 w-full">
        <div className="w-full bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800/90  shadow-xs backdrop-blur-md">
          
          {/* Top Row: Brand, Active Context, & Cashier Controls */}
          {!isFullscreenMode && (
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8  bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('commerceTitle') || 'Commerce & POS'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> High-Speed Engine
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title="POS Guide & Keyboard Accelerators (F1)"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">{t('guide') || 'Shortcuts'}</span>
                  <kbd className="hidden md:inline px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
                    F1
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={isFullscreenMode ? 'Exit Max View' : 'Focus Mode (Maximize Screen)'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Bottom Row: Tab Navigation Strip */}
          <div className="px-2 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <nav
              ref={tabListRef}
              role="tablist"
              aria-label="Commerce Sub-modules"
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
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm shadow-slate-900/10'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors'}>
                      {tab.icon}
                    </span>

                    <span>{tab.label}</span>

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

                    {/* Special Turbo/Promo Badge */}
                    {tab.badge && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-amber-400 text-slate-950'
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

      {/* Main Viewport Container */}
      <div className="">
      
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'quicksale' && <QuickSaleView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'sales' && <SalesView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'stores' && <StoresView />}
          {activeTab === 'suppliers' && <SuppliersView />}
          {activeTab === 'expenses' && <ExpensesView />}
      </div>

      {/* POS Operational Guide & Shortcuts Modal */}
      {showHowItWorks && <CommerceGuideModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}

/**
 * Enterprise POS Operations & Cashier Accelerator Modal
 */
function CommerceGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const workflowSteps = [
    {
      step: '01',
      title: 'Item Catalog & Variant Matrix',
      desc: 'Build item records, barcode mappings, unit prices, supplier cost tiers, and safety stock thresholds.',
      icon: <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    },
    {
      step: '02',
      title: 'Dual Checkout Engines',
      desc: 'Switch between Touch Screen POS (split payments, discounts) and QuickSale (turbo barcode scanning).',
      icon: <Zap className="w-4 h-4 text-amber-500" />
    },
    {
      step: '03',
      title: 'Customer Balances & Credit',
      desc: 'Enforce customer credit limits, accept deposit ledgers, and log customer purchase histories.',
      icon: <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
    },
    {
      step: '04',
      title: 'Multi-Store & Shift Auditing',
      desc: 'Audit cash drawer counts, reconcile end-of-shift receipts, and track warehouse transfers.',
      icon: <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..9', label: 'Instant tab switching' },
    { key: 'F1', label: 'Toggle this reference guide' },
    { key: 'F2', label: 'Focus product lookup bar' },
    { key: 'Enter', label: 'Add highlighted item to cart' },
    { key: 'F8 / Space', label: 'Open checkout & payment split' },
    { key: 'Esc', label: 'Clear search / dismiss active dialog' }
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
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('commerceGuideTitle') || 'POS & Commerce Operations'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optimized workflows for speed, accuracy, and register throughput.
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
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
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

          {/* Cashier Accelerators */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> POS Keyboard Accelerators
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
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Alt + 1..9</kbd> anywhere to jump between views
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('close') || 'Done'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}