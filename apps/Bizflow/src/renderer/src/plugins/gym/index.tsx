/**
 * Gym & Fitness Club – Main Hub
 * Tab-based command center for gym operations.
 * Tabs: Attendance | Trainees | Coaches | Subscriptions | Walk-ins | Plans | Lockers | Programs
 */

import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react'
import {
  Dumbbell,
  Users,
  UserCheck,
  CalendarCheck,
  Footprints,
  ListChecks,
  CalendarCheck2,
  Lock,
  ClipboardList,
  HelpCircle,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Keyboard,
  ChevronRight,
  CheckCircle2,
  Zap
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../shared/permissions'

// Sub-views
import TraineesTab from './pages/trainees'
import CoachesTab from './pages/coaches'
import SubscriptionsTab from './pages/subscriptions'
import WalkInsTab from './pages/walkins'
import PlansTab from './pages/plans'
import AttendanceTab from './pages/Attendance'
import LockersTab from './pages/lockers'
import ProgramsTab from './pages/programs/'

export type GymTab =
  | 'attendance'
  | 'trainees'
  | 'coaches'
  | 'subscriptions'
  | 'walkins'
  | 'plans'
  | 'lockers'
  | 'programs'

interface TabConfig {
  id: GymTab
  labelKey: string
  defaultLabel: string
  icon: ReactNode
  badge?: string
  badgeVariant?: 'orange' | 'emerald' | 'cyan'
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'attendance',
    labelKey: 'gymTabAttendance',
    defaultLabel: 'Live Check-in',
    icon: <CalendarCheck2 className="w-4 h-4" />,
    badge: 'LIVE',
    badgeVariant: 'orange'
  },
  {
    id: 'trainees',
    labelKey: 'gymTabTrainees',
    defaultLabel: 'Members / Trainees',
    icon: <Users className="w-4 h-4" />
  },
  {
    id: 'coaches',
    labelKey: 'gymTabCoaches',
    defaultLabel: 'Coaches & Staff',
    icon: <UserCheck className="w-4 h-4" />
  },
  {
    id: 'subscriptions',
    labelKey: 'gymTabSubscriptions',
    defaultLabel: 'Subscriptions',
    icon: <CalendarCheck className="w-4 h-4" />
  },
  {
    id: 'walkins',
    labelKey: 'gymTabWalkIns',
    defaultLabel: 'Walk-ins & Day Pass',
    icon: <Footprints className="w-4 h-4 text-orange-500" />,
    badge: 'PASS',
    badgeVariant: 'emerald'
  },
  {
    id: 'plans',
    labelKey: 'gymTabPlans',
    defaultLabel: 'Membership Plans',
    icon: <ListChecks className="w-4 h-4" />
  },
  {
    id: 'lockers',
    labelKey: 'gymTabLockers',
    defaultLabel: 'Lockers',
    icon: <Lock className="w-4 h-4" />
  },
  {
    id: 'programs',
    labelKey: 'gymTabPrograms',
    defaultLabel: 'Workout Programs',
    icon: <ClipboardList className="w-4 h-4" />
  }
]

export default function GymPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  // Filter visible tabs based on user permissions
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter((tab) => {
      const cap = pluginTabCapability('gym', tab.id)
      return !cap || can(cap)
    })
  }, [can])

  // State Management
  const [activeTab, setActiveTab] = useState<GymTab>(() => {
    const saved = sessionStorage.getItem('bizflow:gym:tab') as GymTab
    return saved || 'attendance'
  })

  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:gym:fullscreen_mode') === 'true'
  })

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'attendance'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:gym:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Tab Switch Handler
  const handleTabChange = (tabId: GymTab) => {
    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:gym:tab', tabId)
  }

  // Cross-component Custom Event Navigation (e.g. Member profile jumping to subscriptions)
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<GymTab>).detail
      if (visibleTabs.some((tab) => tab.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:gym:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:gym:open-tab', handleRequestedTab)
  }, [visibleTabs])

  // Keyboard Shortcuts Navigation: Alt + 1..8 & Modal F1
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys Alt + 1..8
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
    localStorage.setItem('bizflow:gym:fullscreen_mode', String(next))
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* ── Top Navigation & Command Bar ───────────────────────────────────── */}
      <header className="flex-shrink-0 pb-1 w-full">
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
          
          {/* Top Row: Brand & Controls */}
          {!isFullscreenMode && (
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-orange-600 dark:bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('gymTitle') || 'Gym & Club Operations'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 dark:bg-orange-950/70 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> Fast Check-In Engine
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title="Gym Workflow & Keyboard Shortcuts (F1)"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span className="hidden sm:inline">{t('gymHowItWorks') || 'How It Works'}</span>
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
              aria-label="Gym Sub-modules"
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
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors'}>
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
                            ? 'bg-white text-orange-950 font-black'
                            : tabItem.badgeVariant === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
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
        {activeTab === 'attendance' && can(pluginTabCapability('gym', 'attendance')!) && <AttendanceTab />}
        {activeTab === 'trainees' && can(pluginTabCapability('gym', 'trainees')!) && <TraineesTab />}
        {activeTab === 'coaches' && can(pluginTabCapability('gym', 'coaches')!) && <CoachesTab />}
        {activeTab === 'subscriptions' && can(pluginTabCapability('gym', 'subscriptions')!) && <SubscriptionsTab />}
        {activeTab === 'walkins' && can(pluginTabCapability('gym', 'walkins')!) && <WalkInsTab />}
        {activeTab === 'plans' && can(pluginTabCapability('gym', 'plans')!) && <PlansTab />}
        {activeTab === 'lockers' && can(pluginTabCapability('gym', 'lockers')!) && <LockersTab />}
        {activeTab === 'programs' && can(pluginTabCapability('gym', 'programs')!) && <ProgramsTab />}
      </main>

      {/* ── Gym Operational Journey & Shortcuts Modal ────────────────────── */}
      {showHowItWorks && <GymJourneyModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  )
}

/**
 * Gym Operational Journey, Reception Workflows & Shortcuts Modal
 */
function GymJourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const steps = [
    {
      step: '01',
      title: t('gymJourneyStep1Title') || 'Define Plans & Coaching Staff',
      desc: t('gymJourneyStep1Desc') || 'Configure membership pricing, duration tiers, session limits, and register gym coaches/trainers.',
      icon: <ListChecks className="w-4 h-4 text-orange-600 dark:text-orange-400" />
    },
    {
      step: '02',
      title: t('gymJourneyStep2Title') || 'Member Intake & Subscription / Pass',
      desc: t('gymJourneyStep2Desc') || 'Register new trainees, assign active plans with payment terms, or issue instant walk-in daily passes.',
      icon: <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
    },
    {
      step: '03',
      title: t('gymJourneyStep3Title') || 'Fast Check-In & Gate Attendance',
      desc: t('gymJourneyStep3Desc') || 'Scan QR/Barcode at reception to log member entry, track remaining sessions, and verify active status.',
      icon: <CalendarCheck2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    },
    {
      step: '04',
      title: t('gymJourneyStep4Title') || 'Lockers, Workouts & Renewals',
      desc: t('gymJourneyStep4Desc') || 'Rent locker keys, assign personalized workout programs, and monitor subscription expiry dates.',
      icon: <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..8', label: t('shortcutJumpTabs') || 'Switch module tab directly' },
    { key: 'F1', label: t('shortcutHelpGuide') || 'Toggle this operation guide' },
    { key: 'F2', label: t('shortcutScanMember') || 'Focus check-in & member scan bar' },
    { key: 'Enter', label: t('shortcutConfirmEntry') || 'Confirm attendance entry' },
    { key: 'Esc', label: t('shortcutCloseDialog') || 'Dismiss active popup / clear search' }
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
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-xs">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('gymJourneyTitle') || 'Gym Front-Desk & Member Lifecycle'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('gymJourneySubtitle') || 'Step-by-step workflow for receptionist check-in, memberships, and lockers.'}
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
            {steps.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300">
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

          {/* Quick Intake Branches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {t('gymJourneySubscriptionTitle') || 'Full Membership Trainee'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t('gymJourneySubscriptionDesc') || 'Enrolled with profile record, recurring subscription plan, locker assigned, and RFID card.'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {t('gymJourneyWalkInTitle') || 'Walk-in / Day Pass Guest'}
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {t('gymJourneyWalkInDesc') || 'Fast guest pass with one-time payment. Instant entry without full registration.'}
              </p>
            </div>
          </div>

          {/* Reception Hotkeys */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-orange-600 dark:text-orange-400" /> Reception Hotkeys & Accelerators
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
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Alt + 1..8</kbd> to jump between tabs
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