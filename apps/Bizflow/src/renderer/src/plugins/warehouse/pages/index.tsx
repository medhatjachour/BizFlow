/**
 * Warehouse & Logistics Management – Main Hub
 * Tab-based command center for inventory, picking, bin locations, and stock transfers.
 * Tabs: Overview | Operations | Locations | Inventory | Transfers
 */

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  Warehouse,
  Package,
  MapPin,
  ArrowRightLeft,
  ClipboardList,
  Info,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Keyboard,
  ChevronRight,
  ArrowDown,
  CheckCircle2,
  Layers,
  Truck,
  BoxSelect
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

// Sub-views
import OverviewTab from './overview'
import LocationsTab from './locations'
import InventoryTab from './inventory'
import TransfersTab from './transfers'
import OperationsTab from './Operations'
import InfoTooltip from './components/InfoTooltip'

export type Tab = 'overview' | 'operations' | 'locations' | 'inventory' | 'transfers'

interface TabConfig {
  id: Tab
  labelKey: string
  defaultLabel: string
  infoKey: string
  icon: ReactNode
  badge?: string
  badgeVariant?: 'cyan' | 'blue' | 'emerald' | 'amber'
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'overview',
    labelKey: 'warehouseOverviewTab',
    defaultLabel: 'Live Dashboard',
    infoKey: 'warehouseTabInfoOverview',
    icon: <Warehouse className="w-4 h-4" />,
    badge: 'LIVE',
    badgeVariant: 'cyan'
  },
  {
    id: 'operations',
    labelKey: 'warehouseOperationsTab',
    defaultLabel: 'Picking & Orders',
    infoKey: 'warehouseTabInfoOperations',
    icon: <ClipboardList className="w-4 h-4 text-blue-500" />,
    badge: 'OPS',
    badgeVariant: 'blue'
  },
  {
    id: 'locations',
    labelKey: 'warehouseLocationsTab',
    defaultLabel: 'Aisles & Bins',
    infoKey: 'warehouseTabInfoLocations',
    icon: <MapPin className="w-4 h-4 text-emerald-500" />
  },
  {
    id: 'inventory',
    labelKey: 'warehouseInventoryTab',
    defaultLabel: 'Stock Items',
    infoKey: 'warehouseTabInfoInventory',
    icon: <Package className="w-4 h-4 text-amber-500" />
  },
  {
    id: 'transfers',
    labelKey: 'warehouseTransfersTab',
    defaultLabel: 'Stock Transfers',
    infoKey: 'warehouseTabInfoTransfers',
    icon: <ArrowRightLeft className="w-4 h-4 text-teal-500" />
  }
]

export default function WarehousePage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  // Filter visible tabs based on user capabilities
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter((tab) => {
      const cap = pluginTabCapability('warehouse', tab.id)
      return !cap || can(cap)
    })
  }, [can])

  // State Management with Session & Local Storage persistence
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = sessionStorage.getItem('bizflow:warehouse:tab') as Tab
    return saved || 'overview'
  })

  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:warehouse:fullscreen_mode') === 'true'
  })

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'overview'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:warehouse:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Tab switch handler
  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:warehouse:tab', tabId)
  }

  // Cross-component custom event navigation (e.g. from Dashboard / Inventory jumps)
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<Tab>).detail
      if (visibleTabs.some((tab) => tab.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:warehouse:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:warehouse:open-tab', handleRequestedTab)
  }, [visibleTabs])

  // Keyboard Shortcuts: Alt + 1..5 & Modal F1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys Alt + 1..5
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
    localStorage.setItem('bizflow:warehouse:fullscreen_mode', String(next))
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 select-none">
      {/* ── Top Navigation & Command Bar ───────────────────────────────────── */}
      <header className="flex-shrink-0 pb-1 w-full">
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
          
          {/* Top Row: Brand & Controls */}
          {!isFullscreenMode && (
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center shadow-sm shadow-cyan-500/20 shrink-0">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('warehouseTitle') || 'Warehouse & Logistics Command'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> Bin Tracking & Fast Picking
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={`${t('warehouseHowItWorksTitle') || 'Warehouse Operations & Guide'} (F1)`}
                >
                  <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
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
              aria-label="Warehouse Sub-modules"
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
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/20'
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

                    {/* Quick Info Tooltip */}
                    <span className="opacity-70 group-hover:opacity-100">
                      <InfoTooltip text={t(tabItem.infoKey as any) || ''} />
                    </span>

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
                            ? 'bg-white text-cyan-950 font-black'
                            : tabItem.badgeVariant === 'blue'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
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
        {activeTab === 'overview' && can(pluginTabCapability('warehouse', 'overview')!) && (
          <OverviewTab onNavigate={handleTabChange} />
        )}
        {activeTab === 'operations' && can(pluginTabCapability('warehouse', 'operations')!) && <OperationsTab />}
        {activeTab === 'locations' && can(pluginTabCapability('warehouse', 'locations')!) && <LocationsTab />}
        {activeTab === 'inventory' && can(pluginTabCapability('warehouse', 'inventory')!) && <InventoryTab />}
        {activeTab === 'transfers' && can(pluginTabCapability('warehouse', 'transfers')!) && <TransfersTab />}
      </main>

      {/* ── Operational Journey & Shortcuts Modal ─────────────────────────── */}
      {showHowItWorks && <WarehouseJourneyModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}

/**
 * Super Simple, Clear & Detailed Warehouse Operational Guide Modal
 */
function WarehouseJourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const steps = [
    {
      step: '01',
      title: t('warehouseHowStep1Title') || 'Structure Zones, Aisles & Bins',
      desc: t('warehouseHowStep1Desc') || 'Map your physical warehouse layout. Define zones (Receiving, Staging, Bulk Storage) and assign unique shelf/bin codes.',
      tip: 'Organized bin labeling accelerates picker route efficiency by up to 60%.',
      icon: <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
    },
    {
      step: '02',
      title: t('warehouseHowStep2Title') || 'Receive Stock, Putaway & Barcode Tag',
      desc: t('warehouseHowStep2Desc') || 'Scan supplier purchase orders upon arrival, verify quantities, generate barcode labels, and put items into designated bin slots.',
      tip: 'Instant putaway ensures stock is immediately available for sales allocation.',
      icon: <BoxSelect className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    },
    {
      step: '03',
      title: t('warehouseHowStep3Title') || 'Pick, Pack, Transfer & Fulfill',
      desc: t('warehouseHowStep3Desc') || 'Generate picking waves for sales orders, pack shipments with delivery notes, and execute internal branch-to-branch stock transfers.',
      tip: 'Transfers require dual-confirmation: dispatched from origin & accepted at destination.',
      icon: <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    }
  ]

  const summaries = [
    {
      label: t('warehouseHowSummaryOverviewLabel') || 'Overview',
      desc: t('warehouseHowSummaryOverviewDesc') || 'Real-time KPIs: stock valuation, low-stock alerts, picking velocity, and space capacity.'
    },
    {
      label: t('warehouseHowSummaryOperationsLabel') || 'Operations',
      desc: t('warehouseHowSummaryOperationsDesc') || 'Live inbound receiving dock, outbound pick lists, batch processing, and order packaging.'
    },
    {
      label: t('warehouseHowSummaryInventoryLabel') || 'Inventory',
      desc: t('warehouseHowSummaryInventoryDesc') || 'Complete SKU catalogue with batch/lot numbers, expiry dates, and unit cost records.'
    },
    {
      label: t('warehouseHowSummaryTransfersLabel') || 'Transfers',
      desc: t('warehouseHowSummaryTransfersDesc') || 'Inter-warehouse stock requests, transit manifests, and discrepancy reconciliation.'
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..5', label: t('shortcutJumpTabs') || 'Switch module tab directly' },
    { key: 'F1', label: t('shortcutHelpGuide') || 'Toggle this warehouse guide' },
    { key: 'F2', label: 'Quick SKU / Bin Barcode Search' },
    { key: 'Esc', label: t('shortcutCloseDialog') || 'Dismiss active popup / clear search' }
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
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-xs">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('warehouseHowItWorksTitle') || 'Warehouse & Inventory Lifecycle'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('warehouseHowItWorksSubtitle') || 'Step-by-step logistics: layout mapping, receiving, putaway, and dispatching.'}
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
          {/* Detailed 3-Step Vertical Flow */}
          <div className="space-y-2.5">
            {steps.map((item, idx) => (
              <div key={idx}>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
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
                      <p className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400 mt-1 flex items-center gap-1 italic">
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

          {/* Module Breakdown & Summaries */}
          <div className="rounded-xl border border-cyan-200/80 dark:border-cyan-800/50 bg-cyan-50/60 dark:bg-cyan-950/20 p-3.5">
            <h4 className="text-xs font-bold text-cyan-900 dark:text-cyan-300 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              {t('warehouseHowSummaryTitle') || 'Operational Modules Breakdown'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summaries.map((s, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-cyan-100 dark:border-cyan-900/40">
                  <p className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300 mb-0.5">{s.label}</p>
                  <p className="text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Warehouse Hotkeys */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Warehouse Hotkeys & Quick Actions
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
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Alt + 1..5</kbd> to jump between tabs
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('warehouseClose') || t('close') || 'Got It'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}