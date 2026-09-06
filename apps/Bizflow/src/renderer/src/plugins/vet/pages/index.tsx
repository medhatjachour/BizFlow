/**
 * Veterinary Clinic & Pet Health Operations – Main Hub
 * Tab-based command center for pet owners, patients, medical visits, pharmacy, and sales.
 * Tabs: Owners | Vets | Sessions | Appointments | Follow-ups | Medicines | Sales | Sales History | Stats | Expenses
 */

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  PawPrint,
  Users,
  ClipboardList,
  BarChart3,
  CalendarClock,
  Bell,
  Activity,
  DollarSign,
  Info,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Keyboard,
  ChevronRight,
  ArrowDown,
  ArrowRight,
  Stethoscope,
  ShoppingCart,
  Receipt,
  HeartHandshake,
  Syringe,
  CheckCircle2
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

// Sub-views
import VetStatsTab from './vet-stats'
import VetExpensesTab from './vet-expenses'
import VetMedicinesTab from './vet-medicines'
import VetSalesTab from './vet-sales/'
import VetStaffTab from './vet-staff'
import VetFollowUpsTab from './vet-followups'
import VetSessionsTab from './vet-sessions/'
import VetOwnersTab from './vet-owners'
import VetAppointmentsTab from './vet-appointments'
import SalesHistory from './sales-history'

export type VetTab =
  | 'owners'
  | 'vets'
  | 'sessions'
  | 'appointments'
  | 'followups'
  | 'medicines'
  | 'sales'
  | 'salesHistory'
  | 'stats'
  | 'expenses'

export interface VetOwner {
  id: string
  name: string
  phone: string
  email?: string | null
  address?: string | null
  notes?: string | null
}

export interface VetPatient {
  id: string
  ownerId: string
  owner: VetOwner
  name: string
  species: string
  breed?: string | null
  petColor?: string | null
  microchipId?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  weight?: number | null
  allergies?: string | null
  medicalNotes?: string | null
  createdAt: string
  updatedAt: string
  finance?: { totalCharged: number; totalPaid: number; outstanding: number }
  _count?: { sessions: number }
  sessions?: any[]
}

export interface VetOwnerWithPets extends VetOwner {
  patients: Array<{ id: string; name: string; species: string; breed?: string | null }>
  _count: { patients: number }
}

interface TabConfig {
  id: VetTab
  labelKey: string
  defaultLabel: string
  icon: ReactNode
  badge?: string
  badgeVariant?: 'violet' | 'emerald' | 'amber' | 'rose' | 'blue'
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'owners',
    labelKey: 'vetOwners',
    defaultLabel: 'Owners & Pets',
    icon: <Users className="w-4 h-4" />
  },
  {
    id: 'vets',
    labelKey: 'vetVets',
    defaultLabel: 'Veterinarians',
    icon: <Stethoscope className="w-4 h-4 text-violet-500" />
  },
  {
    id: 'sessions',
    labelKey: 'vetSessions',
    defaultLabel: 'Medical Sessions',
    icon: <ClipboardList className="w-4 h-4 text-teal-500" />,
    badge: 'VISIT',
    badgeVariant: 'emerald'
  },
  {
    id: 'appointments',
    labelKey: 'vetAppointments',
    defaultLabel: 'Appointments',
    icon: <CalendarClock className="w-4 h-4 text-blue-500" />
  },
  {
    id: 'followups',
    labelKey: 'vetFollowUps',
    defaultLabel: 'Follow-ups',
    icon: <Bell className="w-4 h-4 text-amber-500" />
  },
  {
    id: 'medicines',
    labelKey: 'vetMedStore',
    defaultLabel: 'Pharmacy & Stock',
    icon: <Activity className="w-4 h-4 text-emerald-500" />
  },
  {
    id: 'sales',
    labelKey: 'vetSalesTab',
    defaultLabel: 'Pet Store POS',
    icon: <ShoppingCart className="w-4 h-4 text-violet-600 dark:text-violet-400" />
  },
  {
    id: 'salesHistory',
    labelKey: 'vetSalesHistory',
    defaultLabel: 'Sales History',
    icon: <Receipt className="w-4 h-4" />
  },
  {
    id: 'stats',
    labelKey: 'vetStats',
    defaultLabel: 'Statistics',
    icon: <BarChart3 className="w-4 h-4 text-indigo-500" />
  },
  {
    id: 'expenses',
    labelKey: 'vetExpenses',
    defaultLabel: 'Expenses',
    icon: <DollarSign className="w-4 h-4" />
  }
]

export default function VetPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const location = useLocation()
  const tabListRef = useRef<HTMLDivElement>(null)

  // Filter visible tabs based on user permissions
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter((tabItem) => {
      const cap = pluginTabCapability('vet', tabItem.id)
      return !cap || can(cap)
    })
  }, [can])

  // State Management with Session & Local Storage persistence
  const [activeTab, setActiveTab] = useState<VetTab>(() => {
    const saved = sessionStorage.getItem('bizflow:vet:tab') as VetTab
    return saved || 'owners'
  })

  const [salesCartCount, setSalesCartCount] = useState(0)
  const [pendingMainTab, setPendingMainTab] = useState<VetTab | null>(null)
  const [, setActivePatientId] = useState<string | null>(null)
  const [showJourney, setShowJourney] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:vet:fullscreen_mode') === 'true'
  })

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tabItem) => tabItem.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'owners'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:vet:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Sync tab from URL search parameters if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedTab = params.get('tab') as VetTab | null
    if (!requestedTab) return

    const tabExists = visibleTabs.some((x) => x.id === requestedTab)
    if (tabExists && requestedTab !== activeTab) {
      handleTabChange(requestedTab)
    }
  }, [location.search, visibleTabs, activeTab])

  // Tab switch handler with unsaved sales cart guard
  const handleTabChange = (tabId: VetTab) => {
    if (tabId === activeTab) return

    if (activeTab === 'sales' && salesCartCount > 0) {
      setPendingMainTab(tabId)
      return
    }

    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:vet:tab', tabId)
  }

  // Cross-component custom event listener (e.g. Booking an appointment jumping to records)
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<VetTab>).detail
      if (visibleTabs.some((tabItem) => tabItem.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:vet:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:vet:open-tab', handleRequestedTab)
  }, [visibleTabs, activeTab, salesCartCount])

  // Keyboard Shortcuts: Alt + 1..9, 0 & Modal F1
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
        setShowJourney((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleTabs, activeTab, salesCartCount])

  const toggleFullscreen = () => {
    const next = !isFullscreenMode
    setIsFullscreenMode(next)
    localStorage.setItem('bizflow:vet:fullscreen_mode', String(next))
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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-sm shadow-violet-500/20 shrink-0">
                  <PawPrint className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('vetClinic') || 'Veterinary Clinic & Hospital'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> Pet EMR & Pharmacy POS
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowJourney(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={`${t('vetJourneyTitle') || 'Vet Clinic Patient Journey'} (F1)`}
                >
                  <Info className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
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
              aria-label="Veterinary Sub-modules"
              className="flex items-center gap-1 min-w-max"
            >
              {visibleTabs.map((tabItem, idx) => {
                const isActive = activeTab === tabItem.id
                const isSales = tabItem.id === 'sales'

                return (
                  <button
                    key={tabItem.id}
                    role="tab"
                    id={`tab-${tabItem.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tabItem.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => handleTabChange(tabItem.id)}
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20'
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

                    {/* Active Cart Counter Badge */}
                    {isSales && salesCartCount > 0 && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-white text-amber-950 font-black'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {salesCartCount}
                      </span>
                    )}

                    {/* Dynamic Tag Badge */}
                    {!isSales && tabItem.badge && (
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isActive
                            ? 'bg-white text-violet-950 font-black'
                            : tabItem.badgeVariant === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30'
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
        {activeTab === 'owners' && can(pluginTabCapability('vet', 'owners')!) && <VetOwnersTab />}
        {activeTab === 'vets' && can(pluginTabCapability('vet', 'vets')!) && <VetStaffTab />}
        {activeTab === 'sessions' && can(pluginTabCapability('vet', 'sessions')!) && <VetSessionsTab />}
        {activeTab === 'appointments' && (
          <VetAppointmentsTab onViewPet={(petId: string) => setActivePatientId(petId)} />
        )}
        {activeTab === 'followups' && can(pluginTabCapability('vet', 'followups')!) && <VetFollowUpsTab />}
        {activeTab === 'medicines' && can(pluginTabCapability('vet', 'medicines')!) && <VetMedicinesTab />}
        {activeTab === 'sales' && can(pluginTabCapability('vet', 'sales')!) && (
          <VetSalesTab onCartCountChange={setSalesCartCount} />
        )}
        {activeTab === 'salesHistory' && (
          <div className="flex flex-col h-full min-h-0">
            <SalesHistory />
          </div>
        )}
        {activeTab === 'stats' && can(pluginTabCapability('vet', 'stats')!) && (
          <VetStatsTab onNavigate={(target) => handleTabChange(target as VetTab)} />
        )}
        {activeTab === 'expenses' && can(pluginTabCapability('vet', 'expenses')!) && <VetExpensesTab />}
      </main>

      {/* ── Vet Patient Journey & Shortcuts Modal ──────────────────────────── */}
      {showJourney && <VetJourneyModal onClose={() => setShowJourney(false)} />}

      {/* ── Discard Cart Navigation Confirmation ───────────────────────────── */}
      {pendingMainTab && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs px-4 animate-in fade-in duration-150"
          onClick={() => setPendingMainTab(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-700">
                <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('vetLeaveCartTitle') || 'Discard Active Cart?'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              {(
                t('vetLeaveSalesBody') ||
                'You have {n} item(s) in the sales cart that have not been checkout completed. Leaving the Sales tab will discard them.'
              ).replace('{n}', String(salesCartCount))}
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setPendingMainTab(null)}
                className="flex-1 px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t('vetStayKeepCart') || 'Keep Cart & Stay'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const dest = pendingMainTab
                  setSalesCartCount(0)
                  setPendingMainTab(null)
                  if (dest) handleTabChange(dest)
                }}
                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-xs"
              >
                {t('vetLeaveDiscard') || 'Discard & Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Super Simple, Clear & Detailed Veterinary Patient Journey Guide Modal
 */
function VetJourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const steps = [
    {
      step: '01',
      title: t('vetJourneyStep1Title') || 'Register Pet Owner (Client Profile)',
      desc: t('vetJourneyStep1Desc') || 'Register the pet owner once with full name, phone number, email, and address. Multiple pets can be linked to a single owner contact record.',
      tip: 'The owner profile serves as the master billing account for all attached pets.',
      icon: <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
    },
    {
      step: '02',
      title: t('vetJourneyStep2Title') || 'Enroll Pet Patient & Medical ID',
      desc: t('vetJourneyStep2Desc') || 'Add pet profile cards under the owner: species, breed, date of birth, weight, coat color, microchip number, allergies, and chronic medical history.',
      tip: 'Microchip scanning allows instant profile retrieval during emergency visits.',
      icon: <PawPrint className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
    },
    {
      step: '03',
      title: t('journeyStep3SessionTitle') || 'Veterinary Consultation & Clinical Session',
      desc: t('vetJourneyStep3Desc') || 'Log vital signs (Temp, Pulse, Respiratory), clinical diagnosis, vaccinations, surgery notes, prescribed pharmaceuticals, and generate invoice checkout.',
      tip: t('vetJourneyFollowupOptional') || 'Easily schedule vaccination booster or recovery follow-up dates.',
      icon: <ClipboardList className="w-4 h-4 text-teal-600 dark:text-teal-400" />
    },
    {
      step: '04',
      title: t('journeyStep4FollowupTitle') || 'Booster Reminders & Automated Follow-ups',
      desc: t('vetJourneyStep4Desc') || 'Follow-up checks automatically surface under Due Today, Upcoming, and Overdue badges. Send SMS reminders or book the next calendar slot.',
      tip: 'Overdue follow-ups turn red to prevent missed vaccination cycles.',
      icon: <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    }
  ]

  const summaries = [
    {
      title: t('vetJourneyTabOwners') || 'Owners Tab',
      desc: t('vetJourneyOwnersTabDesc') || 'Searchable master list of pet owners with expandable patient cards nested underneath.'
    },
    {
      title: t('journeyTabAppointments') || 'Appointments Tab',
      desc: t('vetJourneyApptsTabDesc') || 'Future schedule slots for checkups, surgeries, grooming, and dental cleanings.'
    },
    {
      title: t('journeyTabSessions') || 'Sessions Tab',
      desc: t('vetJourneySessionsTabDesc') || 'Historical medical logs with prescriptions, weight tracking charts, and SOAP clinical notes.'
    },
    {
      title: t('journeyTabFollowUps') || 'Follow-ups Tab',
      desc: t('vetJourneyFollowupsTabDesc') || 'Post-treatment callback queue and overdue booster vaccination reminders.'
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..9, 0', label: t('shortcutJumpTabs') || 'Switch module tab directly' },
    { key: 'F1', label: t('shortcutHelpGuide') || 'Toggle this veterinary care guide' },
    { key: 'F2', label: 'Quick search owner / microchip / pet' },
    { key: 'Enter', label: 'Save clinical session / checkout bill' },
    { key: 'Esc', label: t('shortcutCloseDialog') || 'Dismiss active modal / clear search' }
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
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20 shadow-xs">
              <PawPrint className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('vetJourneyTitle') || 'Veterinary Clinical Workflow & Patient Journey'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('vetJourneySubtitle') || 'Step-by-step care pathway from owner intake to clinical treatment, pharmacy, and follow-ups.'}
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
                  <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
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
                      <p className="text-[11px] font-medium text-violet-700 dark:text-violet-400 mt-1 flex items-center gap-1 italic">
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

          {/* Quick Intake Branches: Appointments vs Walk-in */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5 mb-1">
                <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {t('vetJourneyApptTitle') || 'Scheduled Appointment (Recommended)'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t('vetJourneyApptDesc') || 'Owner card pet → Book slot → Client arrives → "Start Session" converts slot to a full consultation record.'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-violet-600" />
                {t('vetJourneyWalkinTitle') || 'Direct Walk-in Visit'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t('vetJourneyWalkinDesc') || 'Emergency or walk-in pet. Skips calendar slot and directly launches SOAP consultation notes and billing.'}
              </p>
            </div>
          </div>

          {/* Quick Reference Summaries */}
          <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-950/20 p-3.5">
            <h4 className="text-xs font-bold text-violet-900 dark:text-violet-300 mb-2 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              {t('vetJourneyRefTitle') || 'Quick Operational Reference'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summaries.map((s, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-violet-100 dark:border-violet-900/40">
                  <p className="text-[11px] font-bold text-violet-800 dark:text-violet-300 mb-0.5">{s.title}</p>
                  <p className="text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical & POS Hotkeys */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Vet Clinic Hotkeys & Navigation
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
            className="px-4 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('close') || 'Got It'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}