// src/plugins/restaurant/pages/index.tsx
import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  UtensilsCrossed,
  Table2,
  Trash,
  CalendarDays,
  Receipt,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Package,
  TrendingUp,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Keyboard,
  ChevronRight,
  ArrowDown,
  Info,
  ChefHat,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext'
import OverviewAndKdsPage from './Kitchen/index'
import TablesTab from './tables'
import ReservationsTab from './Reservation'
import MenuTab from './menu'
import OrdersTab from './POS'
import SalesHistoryTab from './sales'
import StaffShiftsPage from './shifts'
import RestaurantInventoryPage from './inventory'
import RecipesPage from './recipes'
import KitchenWasteLogPage from './waste'
import { sounds } from './utils/sound'

export type Tab =
  | 'overview'
  | 'tables'
  | 'orders'
  | 'sales'
  | 'reservations'
  | 'menu'
  | 'inventory'
  | 'recipes'
  | 'shifts'
  | 'waste'

const CONTEXT_TO_TAB: Record<string, Tab> = {
  kds: 'overview',
  floor: 'tables',
  pos: 'orders',
  sales: 'sales',
  reservations: 'reservations',
  menu: 'menu',
  inventory: 'inventory',
  recipes: 'recipes',
  shifts: 'shifts',
  waste: 'waste'
}

const TAB_TO_CONTEXT: Record<Tab, any> = {
  overview: 'kds',
  tables: 'floor',
  orders: 'pos',
  sales: 'sales',
  reservations: 'reservations',
  menu: 'menu',
  inventory: 'inventory',
  recipes: 'recipes',
  shifts: 'shifts',
  waste: 'waste'
}

interface TabConfig {
  id: Tab
  labelKey: string
  defaultLabel: string
  icon: ReactNode
  badge?: string
  badgeVariant?: 'orange' | 'emerald' | 'blue' | 'rose'
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'overview',
    labelKey: 'restaurantOverviewTab',
    defaultLabel: 'Live Kitchen (KDS)',
    icon: <LayoutDashboard className="w-4 h-4" />,
    badge: 'KDS',
    badgeVariant: 'orange'
  },
  {
    id: 'tables',
    labelKey: 'restaurantTablesTab',
    defaultLabel: 'Floor & Tables',
    icon: <Table2 className="w-4 h-4" />
  },
  {
    id: 'orders',
    labelKey: 'restaurantOrdersTab',
    defaultLabel: 'Point of Sale (POS)',
    icon: <ClipboardList className="w-4 h-4 text-orange-500" />
  },
  {
    id: 'sales',
    labelKey: 'restaurantSalesTab',
    defaultLabel: 'Sales & History',
    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />
  },
  {
    id: 'reservations',
    labelKey: 'restaurantReservationsTab',
    defaultLabel: 'Reservations',
    icon: <CalendarDays className="w-4 h-4" />
  },
  {
    id: 'menu',
    labelKey: 'restaurantMenuTab',
    defaultLabel: 'Menu & Categories',
    icon: <BookOpen className="w-4 h-4" />
  },
  {
    id: 'inventory',
    labelKey: 'restaurantInventoryTab',
    defaultLabel: 'Stock & Ingredients',
    icon: <Package className="w-4 h-4 text-amber-500" />
  },
  {
    id: 'recipes',
    labelKey: 'restaurantRecipesTab',
    defaultLabel: 'Recipes & Costing',
    icon: <Receipt className="w-4 h-4" />
  },
  {
    id: 'shifts',
    labelKey: 'restaurantShiftsTab',
    defaultLabel: 'Staff & Shifts',
    icon: <ShieldCheck className="w-4 h-4 text-blue-500" />
  },
  {
    id: 'waste',
    labelKey: 'restaurantWasteTab',
    defaultLabel: 'Waste & Spoilage',
    icon: <Trash className="w-4 h-4 text-rose-500" />
  }
]

function RestaurantPageContent() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)
  const { currentView, setCurrentView, activeTable, draftItems } = useRestaurant()

  const activeTab: Tab = CONTEXT_TO_TAB[currentView] || 'overview'

  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:restaurant:fullscreen_mode') === 'true'
  })

  // Filter visible tabs based on user permissions
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter((tab) => {
      const cap = pluginTabCapability('restaurant', tab.id)
      return !cap || can(cap)
    })
  }, [can])

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'overview'
      setCurrentView(TAB_TO_CONTEXT[fallback])
      sessionStorage.setItem('bizflow:restaurant:tab', fallback)
    }
  }, [activeTab, visibleTabs, setCurrentView])

  // Tab Switch Handler with sound feedback
  const handleTabChange = (tabId: Tab) => {
    sounds.playBump()
    setCurrentView(TAB_TO_CONTEXT[tabId])
    sessionStorage.setItem('bizflow:restaurant:tab', tabId)
  }

  // Cross-component Custom Event Navigation (e.g. Reservation jumping to Floor)
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<Tab>).detail
      if (visibleTabs.some((tab) => tab.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:restaurant:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:restaurant:open-tab', handleRequestedTab)
  }, [visibleTabs])

  // Keyboard Shortcuts Navigation: Alt + 1..9, 0 & Modal F1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys Alt + 1..9 & 0
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        let targetIndex = -1
        if (e.key === '0') {
          targetIndex = 9 // 10th tab
        } else {
          targetIndex = parseInt(e.key, 10) - 1
        }

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
    localStorage.setItem('bizflow:restaurant:fullscreen_mode', String(next))
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
                <div className="w-8 h-8 rounded-lg bg-orange-600 dark:bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 shrink-0">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('restaurantTitle') || 'Restaurant & Kitchen Operations'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 dark:bg-orange-950/70 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> Fast POS & Kitchen Engine
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title="Restaurant Workflow & Keyboard Shortcuts (F1)"
                >
                  <Info className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span className="hidden sm:inline">{t('restaurantHowItWorks') || 'How It Works'}</span>
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
              aria-label="Restaurant Sub-modules"
              className="flex items-center gap-1 min-w-max"
            >
              {visibleTabs.map((tabItem, idx) => {
                const isActive = activeTab === tabItem.id
                const isOrders = tabItem.id === 'orders'

                return (
                  <button
                    key={tabItem.id}
                    role="tab"
                    id={`tab-${tabItem.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tabItem.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => handleTabChange(tabItem.id)}
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
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
                      {idx === 9 ? '0' : idx + 1}
                    </span>

                    {/* Active Order / Table Cart Status Badge */}
                    {isOrders && (activeTable || draftItems.length > 0) && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-white text-orange-950 font-black'
                            : 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                        }`}
                      >
                        {activeTable ? `T-${activeTable.number}` : `${draftItems.length}`}
                      </span>
                    )}

                    {/* Dynamic Tag Badge */}
                    {!isOrders && tabItem.badge && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-white text-orange-950 font-black'
                            : 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
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
        {activeTab === 'overview' && can(pluginTabCapability('restaurant', 'overview')!) && (
          <OverviewAndKdsPage onNavigate={(v) => setCurrentView(v as any)} />
        )}
        {activeTab === 'tables' && can(pluginTabCapability('restaurant', 'tables')!) && <TablesTab />}
        {activeTab === 'orders' && can(pluginTabCapability('restaurant', 'orders')!) && <OrdersTab />}
        {activeTab === 'sales' && can(pluginTabCapability('restaurant', 'sales')!) && <SalesHistoryTab />}
        {activeTab === 'reservations' && can(pluginTabCapability('restaurant', 'reservations')!) && (
          <ReservationsTab onNavigateToFloor={() => setCurrentView('floor')} />
        )}
        {activeTab === 'menu' && can(pluginTabCapability('restaurant', 'menu')!) && <MenuTab />}
        {activeTab === 'inventory' && can(pluginTabCapability('restaurant', 'inventory')!) && <RestaurantInventoryPage />}
        {activeTab === 'recipes' && can(pluginTabCapability('restaurant', 'recipes')!) && <RecipesPage />}
        {activeTab === 'shifts' && can(pluginTabCapability('restaurant', 'shifts')!) && <StaffShiftsPage />}
        {activeTab === 'waste' && can(pluginTabCapability('restaurant', 'waste')!) && <KitchenWasteLogPage />}
      </main>

      {/* ── Restaurant Operational Journey & Shortcuts Modal ─────────────── */}
      {showHowItWorks && <RestaurantJourneyModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}

/**
 * Super Simple, Clear & Detailed Restaurant Operational Guide Modal
 */
function RestaurantJourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const steps = [
    {
      step: '01',
      title: t('restHowStep1Title') || 'Setup Ingredients, Recipes & Menu',
      desc: t('restHowStep1Desc') || 'Add pantry ingredients, attach them to recipe cards for auto-costing, and organize your sellable dishes into menu categories.',
      tip: t('restHowStep1Tip') || 'Recipes automatically deduct ingredients when orders are sent.',
      icon: <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    },
    {
      step: '02',
      title: t('restHowStep2Title') || 'Seat Guests & Take Orders (POS / Tables)',
      desc: t('restHowStep2Desc') || 'Select an active table on the floor plan or open a quick takeaway ticket. Tap menu items, apply modifiers/notes, and send order.',
      tip: t('restHowStep2Tip') || 'Kitchen tickets (KOT) print or appear on KDS immediately.',
      icon: <Table2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
    },
    {
      step: '03',
      title: t('restHowStep3Title') || 'Live Kitchen Display (KDS) & Cooking',
      desc: t('restHowStep3Desc') || 'Chefs view incoming orders in real time. Bump tickets to "Cooking" and "Ready to Serve" as dishes finish on the line.',
      tip: t('restHowStep3Tip') || 'Audible bell chime rings when new orders arrive.',
      icon: <Flame className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    },
    {
      step: '04',
      title: t('restHowStep4Title') || 'Checkout, Bill Settlement & Shifts',
      desc: t('restHowStep4Desc') || 'Split or close table checks with cash, card, or room charge. Print receipts and reconcile cash drawers at shift close.',
      tip: t('restHowStep4Tip') || 'Sales and margins update live in Reports.',
      icon: <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..9, 0', label: t('shortcutJumpTabs') || 'Switch module tab directly' },
    { key: 'F1', label: t('shortcutHelpGuide') || 'Toggle this restaurant guide' },
    { key: 'F2', label: t('shortcutPOSSearch') || 'Quick search menu items' },
    { key: 'Enter', label: t('shortcutSendKDS') || 'Send order ticket to kitchen' },
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
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-xs">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('restaurantJourneyTitle') || 'Restaurant Service & Kitchen Lifecycle'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('restaurantJourneySubtitle') || 'Step-by-step operational workflow from recipe costing to KDS & table checkout.'}
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
                  <div className="h-7 w-7 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
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
                      <p className="text-[11px] font-medium text-orange-700 dark:text-orange-400 mt-1 flex items-center gap-1 italic">
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

          {/* Service Types Branching */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {t('restDineInFlow') || 'Dine-In Table Service'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t('restDineInDesc') || 'Assign table number, send multiple rounds of orders (drinks, mains, desserts), and split check at departure.'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {t('restQuickTakeawayFlow') || 'Quick Takeaway & Delivery'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t('restQuickTakeawayDesc') || 'Immediate payment at cashier, customer buzzer or name ticket printed, and fast bag packing.'}
              </p>
            </div>
          </div>

          {/* Kitchen & Waste Control Stream */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/20 p-3">
              <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                <Trash className="h-3.5 w-3.5 text-rose-600" /> {t('restaurantWasteTab') || 'Waste & Spoilage Log'}
              </p>
              <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-400">
                {t('restWasteDesc') || 'Log expired prep, burned pans, or customer returns to keep actual food cost accurate.'}
              </p>
            </div>

            <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/20 p-3">
              <p className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" /> {t('restaurantShiftsTab') || 'Staff Shifts & Till Float'}
              </p>
              <p className="text-[11px] leading-relaxed text-purple-700 dark:text-purple-400">
                {t('restShiftsDesc') || 'Track waiter cash floats, clock-in hours, tips distribution, and end-of-shift cash drops.'}
              </p>
            </div>
          </div>

          {/* Service Hotkeys */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-orange-600 dark:text-orange-400" /> POS & Kitchen Shortcuts
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
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Alt + 1..0</kbd> to jump between tabs
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('close') || 'Got It'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RestaurantPage() {
  return (
    <RestaurantProvider>
      <RestaurantPageContent />
    </RestaurantProvider>
  )
}