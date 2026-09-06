/**
 * Bakery Management Page – Main Hub
 * Tab-based command center for bakery operations.
 * Tabs: Overview | Recipes | Production | Sales | Pantry | Waste | Schedule | P&L | Expenses
 */

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  ChefHat,
  FlaskConical,
  BarChart3,
  Package,
  Trash2,
  Calendar,
  LayoutDashboard,
  ShoppingBag,
  Info,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Keyboard,
  ChevronRight,
  ArrowDown,
  Receipt,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

// Sub-views
import RecipesTab from './recipes/'
import PantryTab from './pantry'
import BakeryExpensesTab from './expenses/ExpensesTab'
import WasteTab from './waste/WasteTab'
import ScheduleTab from './schedule'
import SalesTab from './sales'
import ProductionTab from './production'
import { EndOfDayModal } from './overview/components/EndOfDayModal'
import DailyOverviewTab from './overview'
import { ProfitLossTab } from './overview/components/ProfitLossSection'

export type BakeryTab =
  | 'overview'
  | 'recipes'
  | 'production'
  | 'sales'
  | 'pantry'
  | 'waste'
  | 'schedule'
  | 'pnl'
  | 'expenses'

interface TabConfig {
  id: BakeryTab
  labelKey: string
  defaultLabel: string
  icon: ReactNode
  badge?: string
  badgeVariant?: 'amber' | 'emerald' | 'blue' | 'rose'
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'overview',
    labelKey: 'bakeryOverviewTab',
    defaultLabel: 'Daily Hub',
    icon: <LayoutDashboard className="w-4 h-4" />,
    badge: 'LIVE',
    badgeVariant: 'amber'
  },
  {
    id: 'recipes',
    labelKey: 'bakeryRecipesTab',
    defaultLabel: 'Recipes & Formulas',
    icon: <ChefHat className="w-4 h-4" />
  },
  {
    id: 'production',
    labelKey: 'bakeryProductionTab',
    defaultLabel: 'Production & Batches',
    icon: <FlaskConical className="w-4 h-4" />,
    badge: 'BATCH',
    badgeVariant: 'blue'
  },
  {
    id: 'sales',
    labelKey: 'bakerySalesTab',
    defaultLabel: 'Bakery Sales',
    icon: <ShoppingBag className="w-4 h-4" />
  },
  {
    id: 'pantry',
    labelKey: 'bakeryPantryTab',
    defaultLabel: 'Pantry & Stock',
    icon: <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
  },
  {
    id: 'waste',
    labelKey: 'bakeryWasteTab',
    defaultLabel: 'Waste Log',
    icon: <Trash2 className="w-4 h-4 text-rose-500" />
  },
  {
    id: 'schedule',
    labelKey: 'bakeryScheduleTab',
    defaultLabel: 'Production Schedule',
    icon: <Calendar className="w-4 h-4" />
  },
  {
    id: 'pnl',
    labelKey: 'bakeryProfitLossTab',
    defaultLabel: 'Profit & Loss',
    icon: <BarChart3 className="w-4 h-4 text-emerald-500" />
  },
  {
    id: 'expenses',
    labelKey: 'expenses',
    defaultLabel: 'Expenses',
    icon: <Receipt className="w-4 h-4" />
  }
]

export default function BakeryPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  // Filter visible tabs based on user capabilities
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter((tab) => {
      const cap = pluginTabCapability('bakery', tab.id)
      return !cap || can(cap)
    })
  }, [can])

  // State Management with Session & Local Storage persistence
  const [activeTab, setActiveTab] = useState<BakeryTab>(() => {
    const saved = sessionStorage.getItem('bizflow:bakery:tab') as BakeryTab
    return saved || 'overview'
  })

  const [showEOD, setShowEOD] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:bakery:fullscreen_mode') === 'true'
  })

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'overview'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:bakery:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Tab switch handler
  const handleTabChange = (tabId: BakeryTab) => {
    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:bakery:tab', tabId)
  }

  // Cross-component custom event navigation
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<BakeryTab>).detail
      if (visibleTabs.some((tab) => tab.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:bakery:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:bakery:open-tab', handleRequestedTab)
  }, [visibleTabs])

  // Keyboard Shortcuts: Alt + 1..9, F1 (Guide), Esc (Close)
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

      // Help Guide on F1
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
    localStorage.setItem('bizflow:bakery:fullscreen_mode', String(next))
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* ── End of Day Modal ──────────────────────────────────────────────── */}
      {showEOD && (
        <EndOfDayModal
          onClose={() => setShowEOD(false)}
          onWasteLogged={() => setShowEOD(false)}
        />
      )}

      {/* ── Top Navigation & Command Bar ───────────────────────────────────── */}
      <header className="flex-shrink-0 pb-1 w-full">
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
          
          {/* Top Row: Brand & Controls */}
          {!isFullscreenMode && (
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-600 dark:bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/20 shrink-0">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('bakery') || 'Bakery Management'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> {t('bakerySubtitle') || 'Production & Inventory Engine'}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={`${t('bakeryHowItWorksBtn') || 'Bakery Lifecycle & Flow'} (F1)`}
                >
                  <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">{t('bakeryHowItWorksBtn') || 'How It Works'}</span>
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
              aria-label="Bakery Sub-modules"
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
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
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

                    {/* Keycap Number Shortcut Indicator */}
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
                            ? 'bg-white text-amber-950 font-black'
                            : tabItem.badgeVariant === 'blue'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
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
        {activeTab === 'overview' && can(pluginTabCapability('bakery', 'overview')!) && (
          <DailyOverviewTab onEndOfDay={() => setShowEOD(true)} />
        )}
        {activeTab === 'recipes' && can(pluginTabCapability('bakery', 'recipes')!) && <RecipesTab />}
        {activeTab === 'production' && can(pluginTabCapability('bakery', 'production')!) && <ProductionTab />}
        {activeTab === 'sales' && can(pluginTabCapability('bakery', 'sales')!) && <SalesTab />}
        {activeTab === 'pantry' && can(pluginTabCapability('bakery', 'pantry')!) && <PantryTab />}
        {activeTab === 'waste' && can(pluginTabCapability('bakery', 'waste')!) && <WasteTab />}
        {activeTab === 'schedule' && can(pluginTabCapability('bakery', 'schedule')!) && <ScheduleTab />}
        {activeTab === 'pnl' && can(pluginTabCapability('bakery', 'pnl')!) && <ProfitLossTab />}
        {activeTab === 'expenses' && can(pluginTabCapability('bakery', 'expenses')!) && <BakeryExpensesTab />}
      </main>

      {/* ── Bakery Lifecycle & Operational Journey Modal ─────────────────── */}
      {showHowItWorks && <BakeryHowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}

/**
 * Detailed Bakery Operational Flow & Keyboard Shortcuts Modal
 */
function BakeryHowItWorksModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const shortcuts = [
    { key: 'Alt + 1..9', label: t('shortcutJumpTabs') || 'Switch module tab directly' },
    { key: 'F1', label: t('shortcutHelpGuide') || 'Toggle this bakery operational guide' },
    { key: 'Esc', label: t('shortcutCloseDialog') || 'Dismiss active popup / return to hub' }
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('bakeryHowItWorksTitle') || 'Bakery Production Lifecycle'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('bakeryHowItWorksSubtitle') || 'End-to-end recipe costing, batch tracking, and margin analysis.'}
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
          {/* Step 1 — Pantry */}
          <div className="rounded-xl border border-green-200 dark:border-green-800/60 bg-green-50/70 dark:bg-green-950/20 p-3.5">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                1
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-green-900 dark:text-green-300 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> {t('bakeryHowStep1Title')}
                </p>
                <p className="text-[11px] leading-relaxed text-green-800/90 dark:text-green-400 mt-0.5">
                  {t('bakeryHowStep1Desc')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-1">
            <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Step 2 — Recipes */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-3.5">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                2
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5" /> {t('bakeryHowStep2Title')}
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-400 mt-0.5">
                  {t('bakeryHowStep2Desc')}
                </p>
                {t('bakeryHowStep2Tip') && (
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 mt-1 italic">
                    💡 {t('bakeryHowStep2Tip')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-1">
            <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Step 3 — Production */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/20 p-3.5">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                3
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5" /> {t('bakeryHowStep3Title')}
                </p>
                <p className="text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-400 mt-0.5">
                  {t('bakeryHowStep3Desc')}
                </p>
                {t('bakeryHowStep3Tip') && (
                  <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 mt-1">
                    {t('bakeryHowStep3Tip')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-1">
            <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Step 4 — Sales */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                4
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> {t('bakeryHowStep4Title')}
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-800/90 dark:text-emerald-400 mt-0.5">
                  {t('bakeryHowStep4Desc')}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary Streams: Waste & PnL */}
          <div className="flex items-center gap-2 pt-1">
            <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 italic">
              {t('bakeryHowAlsoTitle') || 'Post-Production & Controls'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/20 p-3">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5 text-rose-600" /> {t('bakeryHowWasteTitle')}
              </p>
              <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-400">
                {t('bakeryHowWasteDesc')}
              </p>
            </div>
            <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/20 p-3">
              <p className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-purple-600" /> {t('bakeryHowPnLTitle')}
              </p>
              <p className="text-[11px] leading-relaxed text-purple-700 dark:text-purple-400">
                {t('bakeryHowPnLDesc')}
              </p>
            </div>
          </div>

          {/* System Keycap Shortcuts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Bakery Hotkeys & Navigation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                >
                  <span className="text-slate-600 dark:text-slate-300 text-[10px] font-medium truncate pr-1">
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