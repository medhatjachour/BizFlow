/**
 * Pharmacy & Medication Management – Main Hub
 * Tab-based command center for dispensary POS, batch tracking, FEFO expiry management, and procurement.
 * Tabs: Dashboard | Sell (POS) | Products | Inventory | Sales | Customers | Suppliers | Purchase Orders | Reports
 */

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  PackageSearch,
  Receipt,
  Truck,
  ClipboardList,
  BarChart3,
  Users,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Keyboard,
  ChevronRight,
  ArrowDown,
  Info,
  ShieldAlert,
  Boxes,
  Barcode,
  CheckCircle2,
  Calendar
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

// Sub-views
import PharmacyDashboard from './dashboard'
import PharmacyPOS from './PharmacyPOS'
import PharmacyProducts from './products'
import PharmacyInventory from './inventory'
import PharmacySales from './sales'
import PharmacyCustomers from './customers'
import PharmacySuppliers from './supplier'
import PharmacyPurchaseOrders from './purchaseOrders'
import PharmacyReports from './analytics'

export type PharmacyTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'orders'
  | 'reports'

interface TabConfig {
  id: PharmacyTab
  labelKey: string
  defaultLabel: string
  icon: ReactNode
  badge?: string
  badgeVariant?: 'emerald' | 'amber' | 'blue' | 'rose'
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'dashboard',
    labelKey: 'phDashboard',
    defaultLabel: 'Live Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    badge: 'LIVE',
    badgeVariant: 'emerald'
  },
  {
    id: 'pos',
    labelKey: 'phSell',
    defaultLabel: 'Dispensary POS',
    icon: <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    badge: 'POS',
    badgeVariant: 'emerald'
  },
  {
    id: 'products',
    labelKey: 'phProducts',
    defaultLabel: 'Drugs & Products',
    icon: <Pill className="w-4 h-4 text-emerald-500" />
  },
  {
    id: 'inventory',
    labelKey: 'phInventory',
    defaultLabel: 'Batches & Expiry',
    icon: <PackageSearch className="w-4 h-4 text-amber-500" />
  },
  {
    id: 'sales',
    labelKey: 'phSales',
    defaultLabel: 'Sales History',
    icon: <Receipt className="w-4 h-4" />
  },
  {
    id: 'customers',
    labelKey: 'phCustomers',
    defaultLabel: 'Patients & Clients',
    icon: <Users className="w-4 h-4 text-blue-500" />
  },
  {
    id: 'suppliers',
    labelKey: 'phSuppliers',
    defaultLabel: 'Suppliers & Vendors',
    icon: <Truck className="w-4 h-4" />
  },
  {
    id: 'orders',
    labelKey: 'phPurchaseOrders',
    defaultLabel: 'Purchase Orders',
    icon: <ClipboardList className="w-4 h-4 text-indigo-500" />
  },
  {
    id: 'reports',
    labelKey: 'phReports',
    defaultLabel: 'Analytics & P&L',
    icon: <BarChart3 className="w-4 h-4" />
  }
]

export default function PharmacyPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  // Filter visible tabs based on user capabilities
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter((tabItem) => {
      const cap = pluginTabCapability('pharmacy', tabItem.id)
      return !cap || can(cap)
    })
  }, [can])

  // State Management with Session & Local Storage persistence
  const [activeTab, setActiveTab] = useState<PharmacyTab>(() => {
    const saved = sessionStorage.getItem('bizflow:pharmacy:tab') as PharmacyTab
    return saved || 'dashboard'
  })

  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:pharmacy:fullscreen_mode') === 'true'
  })

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tabItem) => tabItem.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'dashboard'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:pharmacy:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Tab switch handler
  const handleTabChange = (tabId: PharmacyTab) => {
    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:pharmacy:tab', tabId)
  }

  // Cross-component custom event navigation (e.g. Low Stock alert jumping to Purchase Orders)
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<PharmacyTab>).detail
      if (visibleTabs.some((tabItem) => tabItem.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:pharmacy:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:pharmacy:open-tab', handleRequestedTab)
  }, [visibleTabs])

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
    localStorage.setItem('bizflow:pharmacy:fullscreen_mode', String(next))
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 select-none">
      {/* ── Top Navigation & Command Bar ───────────────────────────────────── */}
      <header className="flex-shrink-0 pb-1 w-full">
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
          
          {/* Top Row: Brand & Controls */}
          {!isFullscreenMode && (
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('pharmacy') || 'Pharmacy Operations'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> FEFO Expiry & Smart Dispense Engine
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={`${t('pharmacyHowItWorksTitle') || 'Pharmacy Workflow Guide'} (F1)`}
                >
                  <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">{t('howItWorks') || 'How It Works'}</span>
                  <kbd className="hidden md:inline px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
                    F1
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={isFullscreenMode ? 'Exit Focus View' : 'Focus Mode (Maximize Screen)'}
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
              aria-label="Pharmacy Sub-modules"
              className="flex items-center gap-1 min-w-max"
            >
              {visibleTabs.map((tabItem, idx) => {
                const isActive = activeTab === tabItem.id

                return (
                  <button
                    key={tabItem.id}
                    role="tab"
                    id={`tab-${tabItem.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tabItem.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => handleTabChange(tabItem.id)}
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span
                      className={
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors'
                      }
                    >
                      {tabItem.icon}
                    </span>

                    <span>{t(tabItem.labelKey as any) || tabItem.defaultLabel}</span>

                    {/* Keycap Number Badge */}
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded border transition-opacity ${
                        isActive
                          ? 'border-white/20 bg-white/10 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Dynamic Tag Badge */}
                    {tabItem.badge && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-white text-emerald-950 font-black'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {tabItem.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Focus Mode Restore Button */}
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
      <main className="flex-1 overflow-auto p-4 sm:p-5">
        {activeTab === 'dashboard' && can(pluginTabCapability('pharmacy', 'dashboard')!) && (
          <PharmacyDashboard onNavigate={(tKey) => handleTabChange(tKey as PharmacyTab)} />
        )}
        {activeTab === 'pos' && can(pluginTabCapability('pharmacy', 'pos')!) && <PharmacyPOS />}
        {activeTab === 'products' && can(pluginTabCapability('pharmacy', 'products')!) && <PharmacyProducts />}
        {activeTab === 'inventory' && can(pluginTabCapability('pharmacy', 'inventory')!) && <PharmacyInventory />}
        {activeTab === 'sales' && can(pluginTabCapability('pharmacy', 'sales')!) && <PharmacySales />}
        {activeTab === 'customers' && can(pluginTabCapability('pharmacy', 'customers')!) && <PharmacyCustomers />}
        {activeTab === 'suppliers' && can(pluginTabCapability('pharmacy', 'suppliers')!) && <PharmacySuppliers />}
        {activeTab === 'orders' && can(pluginTabCapability('pharmacy', 'orders')!) && <PharmacyPurchaseOrders />}
        {activeTab === 'reports' && can(pluginTabCapability('pharmacy', 'reports')!) && <PharmacyReports />}
      </main>

      {/* ── Pharmacy Workflow & Shortcuts Modal ────────────────────────────── */}
      {showHowItWorks && <PharmacyJourneyModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}

/**
 * Super Simple, Clear & Detailed Pharmacy Operational Guide Modal
 */
function PharmacyJourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const steps = [
    {
      step: '01',
      title: t('phHowStep1Title') || 'Define Drug Master & Active Ingredients',
      desc: t('phHowStep1Desc') || 'Register medications with brand names, generic formulations, dosage strengths, therapeutic classes, barcodes, and reorder thresholds.',
      tip: 'Generic name mapping makes suggesting active alternatives fast and effortless.',
      icon: <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    },
    {
      step: '02',
      title: t('phHowStep2Title') || 'Procurement & Batch Expiry Intake',
      desc: t('phHowStep2Desc') || 'Receive supplier purchase orders, record manufacturer Lot/Batch numbers, manufacturing & expiration dates, and unit cost prices.',
      tip: 'FEFO (First-Expired, First-Out) logic automatically prioritizes earliest expiring stock.',
      icon: <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    },
    {
      step: '03',
      title: t('phHowStep3Title') || 'Dispensary POS & Prescription Checkout',
      desc: t('phHowStep3Desc') || 'Scan drug barcodes at the counter, select specific batches, apply insurance co-pays or customer discounts, and print dosage instructions on receipts.',
      tip: 'System prompts warnings for near-expiry batches and controlled substances.',
      icon: <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    },
    {
      step: '04',
      title: t('phHowStep4Title') || 'Audits, Expiry Quarantine & Margin Analytics',
      desc: t('phHowStep4Desc') || 'Track monthly product turnover, quarantine expired bottles, reconcile inventory variances, and evaluate net profit margins.',
      tip: 'Automated 30/60/90-day expiry notifications safeguard against unsellable inventory.',
      icon: <BarChart3 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    }
  ]

  const safeguards = [
    {
      title: 'FEFO Dispense Algorithm',
      desc: 'Smart dispensing prompts cashiers to sell batches closest to expiration first, minimizing shrinkage.'
    },
    {
      title: 'Prescription & Co-Pay Records',
      desc: 'Link repeat patient profiles with doctor prescriptions and track outstanding balances.'
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..9', label: t('shortcutJumpTabs') || 'Switch module tab directly' },
    { key: 'F1', label: t('shortcutHelpGuide') || 'Toggle this pharmacy operational guide' },
    { key: 'F2', label: 'Focus barcode scanner / drug search bar' },
    { key: 'Enter', label: 'Complete dispensary sale / print receipt' },
    { key: 'Esc', label: t('shortcutCloseDialog') || 'Dismiss active popup / clear cart' }
  ]

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('pharmacyHowItWorksTitle') || 'Pharmacy Dispensing & Inventory Lifecycle'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('phSubtitle') || 'Step-by-step guidance for drug intake, FEFO batching, counter POS, and sales audits.'}
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
        <div className="p-5 space-y-3.5 overflow-y-auto">
          {/* Detailed 4-Step Vertical Flow */}
          <div className="space-y-2.5">
            {steps.map((item, idx) => (
              <div key={idx}>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {item.icon} {item.title}
                      </h4>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.desc}
                    </p>
                    {item.tip && (
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1 italic">
                        <span>💡</span> {item.tip}
                      </p>
                    )}
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="flex justify-center -my-1 py-1">
                    <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pharmacy Safety & Safeguards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {safeguards.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20"
              >
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {item.title}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Keycap Shortcuts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Dispensary Hotkeys & Shortcuts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                >
                  <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium truncate pr-2">
                    {sc.label}
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs shrink-0">
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
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Alt + 1..9</kbd> to jump between tabs
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('close') || 'Got It'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}