import { useState } from 'react'
import {
  Dumbbell, Users, UserCheck, CalendarCheck, Footprints,
  ListChecks, CalendarCheck2, Lock, ClipboardList
} from 'lucide-react'
import TraineesTab       from './components/TraineesTab'
import CoachesTab        from './components/CoachesTab'
import SubscriptionsTab  from './components/SubscriptionsTab'
import WalkInsTab        from './components/WalkInsTab'
import PlansTab          from './components/PlansTab'
import AttendanceTab     from './components/AttendanceTab'
import LockersTab        from './components/LockersTab'
import ProgramsTab       from './components/ProgramsTab'

type Tab = 'attendance' | 'trainees' | 'coaches' | 'subscriptions' | 'walkins' | 'plans' | 'lockers' | 'programs'

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'attendance',    label: 'Attendance',      icon: CalendarCheck2 },
  { key: 'trainees',      label: 'Trainees',        icon: Users },
  { key: 'coaches',       label: 'Coaches',         icon: UserCheck },
  { key: 'subscriptions', label: 'Subscriptions',   icon: CalendarCheck },
  { key: 'walkins',       label: 'Walk-ins',        icon: Footprints },
  { key: 'plans',         label: 'Plans',           icon: ListChecks },
  { key: 'lockers',       label: 'Lockers',         icon: Lock },
  { key: 'programs',      label: 'Programs',        icon: ClipboardList },
]

export default function GymPage() {
  const [tab, setTab] = useState<Tab>('attendance')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/40">
            <Dumbbell size={22} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gym</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Trainees · Coaches · Subscriptions · Walk-ins</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
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
            </button>
          ))}
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
    </div>
  )
}
