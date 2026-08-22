import { useEffect, useState } from 'react'
import {
  Dumbbell, Users, UserCheck, CalendarCheck, Footprints,
  ListChecks, CalendarCheck2, Lock, ClipboardList, Info, X
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import TraineesTab       from './pages/trainees'
import CoachesTab        from './pages/coaches'
import SubscriptionsTab  from './pages/subscriptions/SubscriptionsTab'
import WalkInsTab        from './pages/walkins/WalkInsTab'
import PlansTab          from './pages/components/PlansTab'
import AttendanceTab     from './pages/Attendance'
import LockersTab        from './pages/components/LockersTab'
import ProgramsTab       from './pages/components/ProgramsTab'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../shared/permissions'

type Tab = 'attendance' | 'trainees' | 'coaches' | 'subscriptions' | 'walkins' | 'plans' | 'lockers' | 'programs'

// ─── Journey Modal ────────────────────────────────────────────────────────────
function GymJourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  const steps = [
    {
      num: 1, color: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800/40',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      title: t('gymJourneyStep1Title'), desc: t('gymJourneyStep1Desc'),
    },
    {
      num: 2, color: 'bg-teal-500', border: 'border-teal-200 dark:border-teal-800/40',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      title: t('gymJourneyStep2Title'), desc: t('gymJourneyStep2Desc'),
    },
    {
      num: 3, color: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-800/40',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      title: t('gymJourneyStep3Title'), desc: t('gymJourneyStep3Desc'),
    },
    {
      num: 4, color: 'bg-red-500', border: 'border-red-200 dark:border-red-800/40',
      bg: 'bg-red-50 dark:bg-red-900/20',
      title: t('gymJourneyStep4Title'), desc: t('gymJourneyStep4Desc'),
    },
  ]

  const summaryRows = [
    { tab: t('gymJourneyTabAttendance'),    desc: t('gymJourneyAttendanceDesc') },
    { tab: t('gymJourneyTabTrainees'),      desc: t('gymJourneyTraineesDesc') },
    { tab: t('gymJourneyTabCoaches'),       desc: t('gymJourneyCoachesDesc') },
    { tab: t('gymJourneyTabSubscriptions'), desc: t('gymJourneySubscriptionsDesc') },
    { tab: t('gymJourneyTabWalkIns'),       desc: t('gymJourneyWalkInsDesc') },
    { tab: t('gymJourneyTabPlans'),         desc: t('gymJourneyPlansDesc') },
    { tab: t('gymJourneyTabLockers'),       desc: t('gymJourneyLockersDesc') },
    { tab: t('gymJourneyTabPrograms'),      desc: t('gymJourneyProgramsDesc') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/40">
              <Dumbbell size={20} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('gymJourneyTitle')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('gymJourneySubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[70vh] p-6 space-y-4">
          {/* Steps */}
          {steps.map((step, i) => (
            <div key={step.num}>
              <div className={`flex gap-3 p-4 rounded-xl border ${step.border} ${step.bg}`}>
                <div className={`w-6 h-6 rounded-full ${step.color} text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
                </div>
              </div>

              {/* Two paths fork after step 1 */}
              {i === 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3 ms-9">
                  <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">✅ {t('gymJourneySubscriptionTitle')}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('gymJourneySubscriptionDesc')}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">🚶 {t('gymJourneyWalkInTitle')}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('gymJourneyWalkInDesc')}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Summary */}
          <div className="mt-2 rounded-xl bg-slate-800 dark:bg-slate-950 p-4">
            <p className="text-xs font-bold text-white mb-3 uppercase tracking-wide">{t('gymJourneySummaryTitle')}</p>
            <div className="space-y-2">
              {summaryRows.map(row => (
                <div key={row.tab} className="flex gap-2 text-xs">
                  <span className="font-semibold text-orange-400 shrink-0 w-36">{row.tab}</span>
                  <span className="text-slate-300">{row.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GymPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('attendance')
  const [showJourney, setShowJourney] = useState(false)
  const [hoveredInfo, setHoveredInfo] = useState<Tab | null>(null)

  const TABS: Array<{ key: Tab; label: string; icon: React.ElementType; tooltip: string }> = [
    { key: 'attendance',    label: t('gymTabAttendance'),    icon: CalendarCheck2, tooltip: t('gymJourneyAttendanceDesc') },
    { key: 'trainees',      label: t('gymTabTrainees'),      icon: Users,          tooltip: t('gymJourneyTraineesDesc') },
    { key: 'coaches',       label: t('gymTabCoaches'),       icon: UserCheck,      tooltip: t('gymJourneyCoachesDesc') },
    { key: 'subscriptions', label: t('gymTabSubscriptions'), icon: CalendarCheck,  tooltip: t('gymJourneySubscriptionsDesc') },
    { key: 'walkins',       label: t('gymTabWalkIns'),       icon: Footprints,     tooltip: t('gymJourneyWalkInsDesc') },
    { key: 'plans',         label: t('gymTabPlans'),         icon: ListChecks,     tooltip: t('gymJourneyPlansDesc') },
    { key: 'lockers',       label: t('gymTabLockers'),       icon: Lock,           tooltip: t('gymJourneyLockersDesc') },
    { key: 'programs',      label: t('gymTabPrograms'),      icon: ClipboardList,  tooltip: t('gymJourneyProgramsDesc') },
  ]

  const visibleTabs = TABS.filter(item => can(pluginTabCapability('gym', item.key)!))
  const activeTooltip = hoveredInfo ? visibleTabs.find(t => t.key === hoveredInfo) : null

  useEffect(() => {
    if (!visibleTabs.some(item => item.key === tab)) setTab(visibleTabs[0]?.key ?? 'attendance')
  }, [tab, visibleTabs])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/40">
            <Dumbbell size={22} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('gymTitle')}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('gymSubtitle')}</p>
          </div>
          <button
            onClick={() => setShowJourney(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <Info size={13} /> {t('gymHowItWorks')}
          </button>
        </div>

        {/* Tabs + tooltip rendered outside overflow-x-auto to avoid clipping */}
        <div className="relative">
          {activeTooltip && (
            <div className="absolute bottom-full mb-1 left-0 right-0 flex justify-center pointer-events-none z-50">
              <div className="max-w-xs w-56 rounded-xl bg-slate-800 dark:bg-slate-950 px-3 py-2.5 text-[11px] leading-relaxed text-slate-200 shadow-2xl whitespace-normal text-start">
                <span className="block font-semibold text-orange-400 mb-1">{activeTooltip.label}</span>
                {activeTooltip.tooltip}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-950" />
              </div>
            </div>
          )}
          <div className="flex gap-0.5 overflow-x-auto">
            {visibleTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                  tab === key
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                {label}
                <span
                  className="ml-0.5 flex items-center"
                  onClick={e => e.stopPropagation()}
                  onMouseEnter={() => setHoveredInfo(key)}
                  onMouseLeave={() => setHoveredInfo(null)}
                >
                  <Info size={11} className={`transition-colors ${hoveredInfo === key ? 'text-orange-400' : 'text-slate-300 dark:text-slate-600'}`} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'attendance'    && <AttendanceTab />}
        {tab === 'trainees'      && <TraineesTab />}
        {tab === 'coaches'       && <CoachesTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'walkins'       && <WalkInsTab />}
        {tab === 'plans'         && <PlansTab />}
        {tab === 'lockers'       && <LockersTab />}
        {tab === 'programs'      && <ProgramsTab />}
      </div>

      {showJourney && <GymJourneyModal onClose={() => setShowJourney(false)} />}
    </div>
  )
}

