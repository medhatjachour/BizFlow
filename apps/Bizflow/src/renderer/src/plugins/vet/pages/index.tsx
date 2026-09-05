import { useState, useEffect } from 'react'
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
  X,
  ArrowDown,
  ArrowRight,
  Stethoscope,
  ShoppingCart,
  Receipt
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import VetStatsTab from './vet-stats'
import VetExpensesTab from './vet-expenses'
import VetMedicinesTab from './vet-medicines'
import VetSalesTab from './vet-sales/'
import { pluginTabCapability } from '../../../../../shared/permissions'
import VetStaffTab from './vet-staff'
import VetFollowUpsTab from './vet-followups'
import VetSessionsTab from './vet-sessions/'
import VetOwnersTab from './vet-owners'
import VetAppointmentsTab from './vet-appointments'
import SalesHistory  from './sales-history'

type Tab =
  | 'owners'
  | 'vets'
  | 'sessions'
  | 'stats'
  | 'appointments'
  | 'followups'
  | 'expenses'
  | 'medicines'
  | 'sales'
  | 'salesHistory'

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

// ─── Journey Modal ────────────────────────────────────────────────────────────
function JourneyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <PawPrint className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('vetJourneyTitle') || 'Vet Clinic Journey'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('vetJourneySubtitle') || 'How owners and pets move through the system'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-2 overflow-y-auto max-h-[72vh]">
          {/* Step 1 — Owner */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />{' '}
                  {t('vetJourneyStep1Title') || 'Owner Registered'}
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                  {t('vetJourneyStep1Desc') ||
                    'Register the pet owner once — name, phone, email, address. One owner can have multiple pets. This is the permanent contact on file.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* Step 2 — Pet */}
          <div className="rounded-xl border border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-fuchsia-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-fuchsia-800 dark:text-fuchsia-300 flex items-center gap-1.5">
                  <PawPrint className="h-3.5 w-3.5" /> {t('vetJourneyStep2Title') || 'Pet Added'}
                </p>
                <p className="text-xs text-fuchsia-700 dark:text-fuchsia-400 mt-0.5">
                  {t('vetJourneyStep2Desc') ||
                    'Add each pet under the owner — species, breed, age, weight, microchip, allergies, medical notes. Click "Add Pet" on the owner card.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-2">
            <ArrowDown className="h-4 w-4 text-slate-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {t('vetJourneyTwoWays') || 'Two ways to start a visit:'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                {t('vetJourneyApptTitle') || 'Appointment (recommended)'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t('vetJourneyApptDesc') ||
                  'Owner card pet → 📅 Book → client arrives → "Start Session" converts it to a full visit record.'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('vetJourneyWalkinTitle') || 'Walk-in'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('vetJourneyWalkinDesc') ||
                  'Owner card pet → ⚡ Walk-in — skips appointment, opens session form directly.'}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* Step 3 — Session */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />{' '}
                  {t('journeyStep3SessionTitle') || 'Session (Visit Record)'}
                </p>
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                  {t('vetJourneyStep3Desc') ||
                    'The core veterinary record: diagnosis, treatment, prescriptions, payment, notes. Each pet builds a history of sessions over time.'}
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-500 mt-1">
                  {t('vetJourneyFollowupOptional') ||
                    'Optional: set a follow-up date for the next check-in.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <ArrowDown className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {t('vetJourneyConditional') || 'Only if a follow-up date was set:'}
            </p>
          </div>

          {/* Step 4 — Follow-up */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                4
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" />{' '}
                  {t('journeyStep4FollowupTitle') || 'Follow-up Reminder'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {t('vetJourneyStep4Desc') ||
                    'Appears in Follow-ups as upcoming / due-today / overdue. Badge turns red when overdue.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="flex items-center gap-1 text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 px-2 py-1 rounded-lg">
                    <ArrowRight className="h-3 w-3" />{' '}
                    {t('vetJourneyBookApptAction') || '"Book Appt" → new Appointment'}
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg">
                    <ArrowRight className="h-3 w-3" />{' '}
                    {t('vetJourneyMarkDoneAction') || '"Mark Done" → dismisses reminder'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              {t('vetJourneyRefTitle') || 'Quick reference'}
            </p>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-violet-600 dark:text-violet-400">
                  {t('vetJourneyTabOwners') || 'Owners tab'}
                </span>{' '}
                — {t('vetJourneyOwnersTabDesc') || 'all owners with their pets nested below'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {t('journeyTabAppointments') || 'Appointments tab'}
                </span>{' '}
                — {t('vetJourneyApptsTabDesc') || 'future calendar slots, no medical data'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-teal-600 dark:text-teal-400">
                  {t('journeyTabSessions') || 'Sessions tab'}
                </span>{' '}
                —{' '}
                {t('vetJourneySessionsTabDesc') || 'completed visits with full veterinary records'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {t('journeyTabFollowUps') || 'Follow-ups tab'}
                </span>{' '}
                — {t('vetJourneyFollowupsTabDesc') || 'reminders from sessions, overdue turns red'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VetPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const location = useLocation()

  const allTabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'owners', label: t('vetOwners') || 'Owners', icon: Users },
    { key: 'vets', label: t('vetVets') || 'Vets', icon: Stethoscope },
    { key: 'sessions', label: t('vetSessions') || 'Sessions', icon: ClipboardList },
    { key: 'appointments', label: t('vetAppointments') || 'Appointments', icon: CalendarClock },
    { key: 'followups', label: t('vetFollowUps') || 'Follow-ups', icon: Bell },
    { key: 'medicines' as Tab, label: t('vetMedStore') || 'Medicine Store', icon: Activity },
    { key: 'sales' as Tab, label: t('vetSalesTab') || 'Sales', icon: ShoppingCart },
    { key: 'salesHistory' as Tab, label: t('vetSalesHistory') || 'Sales History', icon: Receipt },
    { key: 'stats' as Tab, label: t('vetStats') || 'Statistics', icon: BarChart3 },
    { key: 'expenses' as Tab, label: t('vetExpenses') || 'Expenses', icon: DollarSign }
  ]

  const visibleTabs = allTabs.filter((item) => can(pluginTabCapability('vet', item.key)!))

  const [tab, setTab] = useState<Tab>('owners')
  const [salesCartCount, setSalesCartCount] = useState(0)
  const [pendingMainTab, setPendingMainTab] = useState<Tab | null>(null)
  const [, setActivePatientId] = useState<string | null>(null)

  useEffect(() => {
    if (!visibleTabs.some((item) => item.key === tab)) setTab(visibleTabs[0]?.key ?? 'owners')
  }, [tab, visibleTabs])

  // Guard: leaving the Sales tab with a non-empty cart would discard it.
  function requestMainTab(key: Tab) {
    if (key === tab) return
    if (tab === 'sales' && salesCartCount > 0) {
      setPendingMainTab(key)
      return
    }
    setTab(key)
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedTab = params.get('tab') as Tab | null
    if (!requestedTab) return

    const tabExists = allTabs.some((x) => x.key === requestedTab)
    if (tabExists && requestedTab !== tab) {
      setTab(requestedTab)
    }
  }, [location.search, allTabs, tab])

  // ── Modals ────────────────────────────────────────────────────────────────

  const [showJourney, setShowJourney] = useState(false)

  // ── Handlers ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 border-b  border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
              <PawPrint className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('vetClinic') || 'Vet Clinic'}
                </h1>
                <button
                  onClick={() => setShowJourney(true)}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 px-2 py-1 rounded-lg"
                >
                  <Info className="h-3.5 w-3.5" /> {t('howItWorks') || 'How it works'}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('vetSubtitle') || 'Pet health management'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto -mb-px">
          {visibleTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => requestMainTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl whitespace-nowrap transition-colors border-b-2 ${
                tab === key
                  ? 'border-violet-500 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'owners' && can(pluginTabCapability('vet', 'owners')!) && <VetOwnersTab />}
        {tab === 'sessions' && can(pluginTabCapability('vet', 'sessions')!) && <VetSessionsTab />}
        {tab === 'appointments' && (
          <VetAppointmentsTab onViewPet={(petId: string) => setActivePatientId(petId)} />
        )}
        {tab === 'followups' && can(pluginTabCapability('vet', 'followups')!) && <VetFollowUpsTab />}
        {tab === 'stats' && can(pluginTabCapability('vet', 'stats')!) && <VetStatsTab onNavigate={(t) => requestMainTab(t as Tab)} />}
        {tab === 'expenses' && can(pluginTabCapability('vet', 'expenses')!) && <VetExpensesTab />}
        {tab === 'medicines' && can(pluginTabCapability('vet', 'medicines')!) && <VetMedicinesTab />}
        {tab === 'vets' && can(pluginTabCapability('vet', 'vets')!) && <VetStaffTab />}
        {tab === 'sales' && can(pluginTabCapability('vet', 'sales')!) && <VetSalesTab onCartCountChange={setSalesCartCount} />}
        {tab === 'salesHistory' && (
          <div className="flex flex-col h-full min-h-0">
            <SalesHistory />
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showJourney && <JourneyModal onClose={() => setShowJourney(false)} />}
      {/* Leave-Sales-with-cart confirmation */}
      {pendingMainTab && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setPendingMainTab(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {t('vetLeaveCartTitle') || 'Discard cart?'}
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {(
                t('vetLeaveSalesBody') ||
                'You have {n} item(s) in the sales cart that have not been sold. Leaving the Sales tab will discard them.'
              ).replace('{n}', String(salesCartCount))}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingMainTab(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
              >
                {t('vetStayKeepCart') || 'Stay'}
              </button>
              <button
                onClick={() => {
                  const dest = pendingMainTab
                  setSalesCartCount(0)
                  setPendingMainTab(null)
                  setTab(dest)
                }}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                {t('vetLeaveDiscard') || 'Discard & leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}