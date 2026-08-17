import { useState, useEffect, useRef } from 'react'
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
  Info
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import StatsTab from './stats'

import MaterialsTab from './components/materials/MaterialsTab'
import { pluginTabCapability } from '../../../../../shared/permissions'
import PatientsTab from './patients'
import SessionsTab from './sessions'
import AppointmentsTab from './appointments'
import { FollowUpsTab } from './appointments/components/FollowUpsTab'
import DoctorsTab from './doctors'
import ExpensesTab from './expenses'

export type ClinicTab = 'patients' | 'sessions' | 'stats' | 'appointments' | 'followups' | 'expenses' | 'materials' | 'doctors'

// ─── Journey help modal ─────────────────────────────────────────────────────
function JourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('journeyPatientTitle') || 'Patient Journey'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('journeyPatientSubtitle') || 'How patients move through the clinic system'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-2 overflow-y-auto max-h-[70vh]">
          <div className="rounded-2xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Patient Created
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                  Permanent record created once with medical background, blood type, and contact details.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center my-1">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-3">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">Standard Appointment</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-400">Book future slots → check in → start session.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-300 mb-1">Walk-in Visit</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Instantly launch visit notes without appointment.</p>
            </div>
          </div>

          <div className="flex justify-center my-1">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          <div className="rounded-2xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-semibold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Medical Session & Invoicing
                </p>
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                  Vitals, diagnosis, prescriptions, odontogram dental charting, and payments.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center my-1">
            <ArrowDown className="h-4 w-4 text-amber-400" />
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" /> Auto Follow-up Reminders
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Surfaced from the session to ensure continuity of care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoTooltip({ text }: { text: string }) {
  const tipRef = useRef<HTMLSpanElement>(null)
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null)

  return (
    <span
      ref={tipRef}
      className="inline-flex"
      onClick={e => e.stopPropagation()}
      onMouseEnter={() => {
        if (tipRef.current) {
          const r = tipRef.current.getBoundingClientRect()
          setTipPos({ top: r.top, left: r.left + r.width / 2 })
        }
      }}
      onMouseLeave={() => setTipPos(null)}
    >
      <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-default" />
      {tipPos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: tipPos.top,
              left: tipPos.left,
              transform: 'translate(-68%, -100%) translateY(-8px)',
              zIndex: 99999
            }}
            className="pointer-events-none w-56 rounded-xl bg-slate-900 text-white text-xs leading-relaxed px-3 py-2 shadow-2xl border border-slate-800 text-left whitespace-normal"
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  )
}

export default function ClinicPage() {
  const { t } = useLanguage()
  const { user, can } = useAuth()
  const [activeTab, setActiveTab] = useState<ClinicTab>('patients')
  const [overdueCount, setOverdueCount] = useState(0)
  const [showJourney, setShowJourney] = useState(false)
  const [dentistMode, setDentistMode] = useState(() => localStorage.getItem('clinicDentistMode') === 'true')
  const isClinicStaff = user?.role === 'clinic_staff'

  function toggleDentistMode() {
    const next = !dentistMode
    setDentistMode(next)
    localStorage.setItem('clinicDentistMode', String(next))
  }

  useEffect(() => {
    window.api.clinic.appointments
      .getAllFollowUps({ filter: 'overdue' })
      .then((data: any[]) => setOverdueCount(data?.length ?? 0))
      .catch(() => {})
  }, [])

  const TAB_INFO: Partial<Record<ClinicTab, string>> = {
    patients: 'Permanent records and medical histories of all registered clinic patients.',
    sessions: 'The core medical consultation file including vitals, diagnosis, prescriptions, and billing.',
    appointments: 'Future calendar slots and scheduled patient visits.',
    followups: 'Automated reminders derived from prior sessions.',
    expenses: 'Operational costs, supplies, utilities, and clinic overheads.',
    doctors: 'Doctor rosters, availability, and session distribution.'
  }

  const allTabs: { key: ClinicTab; label: string; Icon: React.ElementType; badge?: number }[] = [
    { key: 'patients', label: t('clinicPatients') || 'Patients', Icon: Users },
    { key: 'sessions', label: t('clinicSessions') || 'Sessions', Icon: ClipboardList },
    { key: 'appointments', label: t('clinicAppointments') || 'Appointments', Icon: CalendarClock },
    { key: 'followups', label: t('clinicFollowUps') || 'Follow-ups', Icon: Bell, badge: overdueCount },
    { key: 'doctors', label: t('clinicDoctors') || 'Doctors', Icon: UserCog },
    { key: 'stats', label: t('clinicStats') || 'Analytics', Icon: BarChart3 },
    { key: 'expenses', label: t('clinicExpenses') || 'Expenses', Icon: Receipt },
    { key: 'materials', label: t('clinicMaterials') || 'Materials', Icon: Package }
  ]

  const staffTabs: ClinicTab[] = ['patients', 'sessions', 'appointments', 'followups']
  const tabs = isClinicStaff ? allTabs.filter(t => staffTabs.includes(t.key)) : allTabs
  const visibleTabs = tabs.filter(tab => can(pluginTabCapability('clinic', tab.key)!))

  useEffect(() => {
    if (visibleTabs.some(t => t.key === activeTab)) return
    if (visibleTabs.length > 0) setActiveTab(visibleTabs[0].key)
  }, [visibleTabs, activeTab])

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-auto">
      {/* Clinic Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('clinic')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('clinicSubtitle') || 'Comprehensive Patient & Practice Management'}</p>
        </div>

        <button
          onClick={() => setShowJourney(true)}
          className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
        >
          <Info className="h-3.5 w-3.5" /> {t('howItWorks') || 'Patient Journey'}
        </button>

        {/* Dentist Mode Switch */}
        <button
          onClick={toggleDentistMode}
          className={`ml-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
            dentistMode
              ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-teal-300'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>Dental Charting</span>
          <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${dentistMode ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${dentistMode ? 'translate-x-3' : ''}`} />
          </span>
        </button>
      </div>

      {showJourney && <JourneyModal onClose={() => setShowJourney(false)} />}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 overflow-x-auto">
        {visibleTabs.map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === key
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {TAB_INFO[key] && <InfoTooltip text={TAB_INFO[key]!} />}
            {badge != null && badge > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0">
        {activeTab === 'patients' && can('manage_customers') && <PatientsTab />}
        {activeTab === 'sessions' && can('manage_customers') && <SessionsTab />}
        {activeTab === 'stats' && can('view_finance') && !isClinicStaff && <StatsTab />}
        {activeTab === 'appointments' && can('manage_customers') && <AppointmentsTab />}
        {activeTab === 'followups' && can('manage_customers') && <FollowUpsTab />}
        {activeTab === 'doctors' && can('manage_staff') && !isClinicStaff && <DoctorsTab />}
        {activeTab === 'expenses' && can('view_finance') && !isClinicStaff && <ExpensesTab />}
        {activeTab === 'materials' && can('manage_inventory') && !isClinicStaff && <MaterialsTab />}
      </div>
    </div>
  )
}