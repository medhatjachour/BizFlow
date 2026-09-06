/**
 * Clinic & Medical Practice Management – Main Hub
 * Tab-based command center for clinical care, consultations, scheduling, and billing.
 * Tabs: Patients | Sessions | Appointments | Follow-ups | Doctors | Analytics | Expenses | Materials
 */

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Stethoscope,
  Users,
  ClipboardList,
  BarChart3,
  CalendarClock,
  Bell,
  X,
  ArrowDown,
  Receipt,
  Package,
  UserCog,
  Info,
  Maximize2,
  Minimize2,
  Sparkles,
  Keyboard,
  ChevronRight,
  HeartPulse,
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

// Sub-views
import StatsTab from './stats'
import MaterialsTab from './materials'
import PatientsTab from './patients'
import SessionsTab from './sessions'
import AppointmentsTab from './appointments'
import { FollowUpsTab } from './appointments/components/FollowUpsTab'
import DoctorsTab from './doctors'
import ExpensesTab from './expenses'

export type ClinicTab =
  | 'patients'
  | 'sessions'
  | 'appointments'
  | 'followups'
  | 'doctors'
  | 'stats'
  | 'expenses'
  | 'materials'

interface TabConfig {
  id: ClinicTab
  labelKey: string
  defaultLabel: string
  infoKey?: string
  icon: ReactNode
  badgeVariant?: 'teal' | 'rose' | 'amber' | 'blue'
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'patients',
    labelKey: 'clinicPatients',
    defaultLabel: 'Patients',
    infoKey: 'clinicTabInfoPatients',
    icon: <Users className="w-4 h-4" />
  },
  {
    id: 'sessions',
    labelKey: 'clinicSessions',
    defaultLabel: 'Medical Sessions',
    infoKey: 'clinicTabInfoSessions',
    icon: <ClipboardList className="w-4 h-4 text-teal-600 dark:text-teal-400" />
  },
  {
    id: 'appointments',
    labelKey: 'clinicAppointments',
    defaultLabel: 'Appointments',
    infoKey: 'clinicTabInfoAppointments',
    icon: <CalendarClock className="w-4 h-4 text-blue-500" />
  },
  {
    id: 'followups',
    labelKey: 'clinicFollowUps',
    defaultLabel: 'Follow-ups',
    infoKey: 'clinicTabInfoFollowups',
    icon: <Bell className="w-4 h-4 text-amber-500" />,
    badgeVariant: 'rose'
  },
  {
    id: 'doctors',
    labelKey: 'clinicDoctors',
    defaultLabel: 'Doctors & Staff',
    infoKey: 'clinicTabInfoDoctors',
    icon: <UserCog className="w-4 h-4" />
  },
  {
    id: 'stats',
    labelKey: 'clinicStats',
    defaultLabel: 'Analytics',
    infoKey: 'clinicTabInfoStats',
    icon: <BarChart3 className="w-4 h-4 text-emerald-500" />
  },
  {
    id: 'expenses',
    labelKey: 'clinicExpenses',
    defaultLabel: 'Expenses',
    infoKey: 'clinicTabInfoExpenses',
    icon: <Receipt className="w-4 h-4" />
  },
  {
    id: 'materials',
    labelKey: 'clinicMaterials',
    defaultLabel: 'Materials & Stock',
    infoKey: 'clinicTabInfoMaterials',
    icon: <Package className="w-4 h-4 text-indigo-500" />
  }
]

export default function ClinicPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const tabListRef = useRef<HTMLDivElement>(null)

  const [overdueCount, setOverdueCount] = useState(0)
  const [showJourney, setShowJourney] = useState(false)
  const [dentistMode, setDentistMode] = useState(() => localStorage.getItem('clinicDentistMode') === 'true')
  const [isFullscreenMode, setIsFullscreenMode] = useState(() => {
    return localStorage.getItem('bizflow:clinic:fullscreen_mode') === 'true'
  })

  // Filter visible tabs based on capabilities
  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter((tab) => {
      const cap = pluginTabCapability('clinic', tab.id)
      return !cap || can(cap)
    })
  }, [can])

  // Active Tab State with sessionStorage persistence
  const [activeTab, setActiveTab] = useState<ClinicTab>(() => {
    const saved = sessionStorage.getItem('bizflow:clinic:tab') as ClinicTab
    return saved || 'patients'
  })

  useEffect(() => {
    window.api?.clinic?.appointments
      ?.getAllFollowUps?.({ filter: 'overdue' })
      ?.then((data: any[]) => setOverdueCount(data?.length ?? 0))
      ?.catch(() => {})
  }, [])

  function toggleDentistMode() {
    const next = !dentistMode
    setDentistMode(next)
    localStorage.setItem('clinicDentistMode', String(next))
  }

  const toggleFullscreen = () => {
    const next = !isFullscreenMode
    setIsFullscreenMode(next)
    localStorage.setItem('bizflow:clinic:fullscreen_mode', String(next))
  }

  // Fallback if current tab permission is revoked
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((tab) => tab.id === activeTab)) {
      const fallback = visibleTabs[0]?.id ?? 'patients'
      setActiveTab(fallback)
      sessionStorage.setItem('bizflow:clinic:tab', fallback)
    }
  }, [activeTab, visibleTabs])

  // Tab switch handler
  const handleTabChange = (tabId: ClinicTab) => {
    setActiveTab(tabId)
    sessionStorage.setItem('bizflow:clinic:tab', tabId)
  }

  // Cross-component custom event listener
  useEffect(() => {
    const handleRequestedTab = (event: Event) => {
      const tabId = (event as CustomEvent<ClinicTab>).detail
      if (visibleTabs.some((tab) => tab.id === tabId)) {
        handleTabChange(tabId)
      }
    }

    window.addEventListener('bizflow:clinic:open-tab', handleRequestedTab)
    return () => window.removeEventListener('bizflow:clinic:open-tab', handleRequestedTab)
  }, [visibleTabs])

  // Keyboard Shortcuts: Alt + 1..8 & Modal F1
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
        setShowJourney((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleTabs])

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 select-none">
      {/* ── Top Navigation & Command Bar ───────────────────────────────────── */}
      <header className="flex-shrink-0 pb-1 w-full">
        <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
          
          {/* Top Row: Brand & Controls */}
          {!isFullscreenMode && (
            <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-sm shadow-teal-500/20 shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {t('clinic') || 'Clinic & Medical Practice'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60">
                    <Sparkles className="w-2.5 h-2.5" /> Electronic Medical Record (EMR)
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Dental Charting Toggle */}
                <button
                  type="button"
                  onClick={toggleDentistMode}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                    dentistMode
                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-300'
                  }`}
                  title="Toggle Odontogram & Dental Tooth Charting Mode"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="hidden md:inline font-semibold">Dental Charting</span>
                  <span
                    className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${
                      dentistMode ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-xs transition-transform ${
                        dentistMode ? 'translate-x-2.5' : ''
                      }`}
                    />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowJourney(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all active:scale-95"
                  title={`${t('journeyPatientTitle') || 'Patient Clinical Journey'} (F1)`}
                >
                  <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="hidden sm:inline">{t('howItWorks') || 'Patient Journey'}</span>
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
              aria-label="Clinic Sub-modules"
              className="flex items-center gap-1 min-w-max"
            >
              {visibleTabs.map((tabItem, idx) => {
                const isActive = activeTab === tabItem.id
                const isFollowups = tabItem.id === 'followups'

                return (
                  <button
                    key={tabItem.id}
                    role="tab"
                    id={`tab-${tabItem.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tabItem.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => handleTabChange(tabItem.id)}
                    className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/20'
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
                    {tabItem.infoKey && (
                      <span className="opacity-70 group-hover:opacity-100">
                        <InfoTooltip text={t(tabItem.infoKey as any) || ''} />
                      </span>
                    )}

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

                    {/* Overdue Follow-ups Badge */}
                    {isFollowups && overdueCount > 0 && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-white text-rose-700 font-bold'
                            : 'bg-rose-500 text-white font-bold'
                        }`}
                      >
                        {overdueCount > 99 ? '99+' : overdueCount}
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
        {activeTab === 'patients' && can(pluginTabCapability('clinic', 'patients')!) && <PatientsTab />}
        {activeTab === 'sessions' && can(pluginTabCapability('clinic', 'sessions')!) && <SessionsTab />}
        {activeTab === 'appointments' && can(pluginTabCapability('clinic', 'appointments')!) && <AppointmentsTab />}
        {activeTab === 'followups' && can(pluginTabCapability('clinic', 'followups')!) && <FollowUpsTab />}
        {activeTab === 'doctors' && can(pluginTabCapability('clinic', 'doctors')!) && <DoctorsTab />}
        {activeTab === 'stats' && can(pluginTabCapability('clinic', 'stats')!) && <StatsTab />}
        {activeTab === 'expenses' && can(pluginTabCapability('clinic', 'expenses')!) && <ExpensesTab />}
        {activeTab === 'materials' && can(pluginTabCapability('clinic', 'materials')!) && <MaterialsTab />}
      </main>

      {/* ── Clinic Operational Journey & Patient Lifecycle Modal ───────────── */}
      {showJourney && <JourneyModal onClose={() => setShowJourney(false)} />}
    </div>
  )
}

/**
 * Super Simple, Clear & Detailed Clinical Patient Journey Modal
 */
function JourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const steps = [
    {
      step: '01',
      title: t('clinicJourneyStep1Title') || 'Patient Intake & Medical File Registration',
      desc: t('clinicJourneyStep1Desc') || 'Create a permanent electronic health record (EHR) containing chronic conditions, allergies, blood type, emergency contact, and insurance info.',
      tip: 'Patient files remain permanent and link all historical visits across specialties.',
      icon: <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
    },
    {
      step: '02',
      title: t('clinicJourneyStep2Title') || 'Scheduling & Reception Check-in',
      desc: t('clinicJourneyStep2Desc') || 'Book future calendar slots with assigned doctor rosters or accept immediate walk-in queue visits at front desk.',
      tip: 'Receptionists can track waiting room queue time and doctor room readiness.',
      icon: <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    },
    {
      step: '03',
      title: t('clinicJourneyStep3Title') || 'Consultation, Dental Charting & Diagnosis',
      desc: t('clinicJourneyStep3Desc') || 'Record vitals (BP, Pulse, Glucose), log clinical notes, attach Odontogram dental procedures, formulate prescription Rx, and invoice services.',
      tip: 'Bill items automatically pull consumables from clinic inventory.',
      icon: <ClipboardList className="w-4 h-4 text-teal-600 dark:text-teal-400" />
    },
    {
      step: '04',
      title: t('clinicJourneyStep4Title') || 'Automated Follow-ups & Continuity of Care',
      desc: t('clinicJourneyStep4Desc') || 'System automatically flags scheduled callback checkups, lab review visits, and chronic care re-evaluations.',
      tip: 'Overdue follow-ups appear highlighted directly on the top navigation bar.',
      icon: <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    }
  ]

  const shortcuts = [
    { key: 'Alt + 1..8', label: t('shortcutJumpTabs') || 'Switch module tab directly' },
    { key: 'F1', label: t('shortcutHelpGuide') || 'Toggle this clinic guide' },
    { key: 'F2', label: 'Search patient by phone / MRN / Name' },
    { key: 'Enter', label: 'Save consultation / proceed to billing' },
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
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20 shadow-xs">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('journeyPatientTitle') || 'Patient Clinical Journey & Operations'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('journeyPatientSubtitle') || 'Step-by-step care pathway from patient intake to consultation, billing, and follow-up.'}
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
                  <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
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
                      <p className="text-[11px] font-medium text-teal-700 dark:text-teal-400 mt-1 flex items-center gap-1 italic">
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

          {/* Quick Intake Branches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/20">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5 mb-1">
                <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Standard Appointment
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Pre-booked future time slot. Patient receives SMS reminder, checks in with receptionist, and enters examination room.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                Direct Walk-in Visit
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Emergency or walk-in patient. Instantly launch medical consultation and triage notes without a prior calendar slot.
              </p>
            </div>
          </div>

          {/* Clinical Shortcuts */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Clinical Hotkeys & Navigation
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
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800">Alt + 1..8</kbd> to jump between tabs
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-500 active:scale-95 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>{t('close') || 'Got It'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Portal Floating Info Tooltip
 */
function InfoTooltip({ text }: { text: string }) {
  const tipRef = useRef<HTMLSpanElement>(null)
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null)

  if (!text) return null

  return (
    <span
      ref={tipRef}
      className="inline-flex"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => {
        if (tipRef.current) {
          const r = tipRef.current.getBoundingClientRect()
          setTipPos({ top: r.top, left: r.left + r.width / 2 })
        }
      }}
      onMouseLeave={() => setTipPos(null)}
    >
      <Info className="h-3.5 w-3.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-default" />
      {tipPos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: tipPos.top,
              left: tipPos.left,
              transform: 'translate(-50%, -100%) translateY(-8px)',
              zIndex: 99999
            }}
            className="pointer-events-none w-56 rounded-xl bg-slate-900/95 backdrop-blur-xs text-white text-xs leading-relaxed px-3 py-2 shadow-2xl border border-slate-800 text-left whitespace-normal animate-in fade-in zoom-in-95 duration-100"
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  )
}