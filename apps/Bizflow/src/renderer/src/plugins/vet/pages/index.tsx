import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  PawPrint, Users, ClipboardList, BarChart3, CalendarClock, Bell,
  Plus, Search, Loader2, Trash2, Eye, Pencil, Phone, Calendar,
  Activity, DollarSign, AlertCircle, Info, X, ArrowDown, ArrowRight,
  ChevronDown, ChevronUp, Mail, MapPin, Stethoscope,  ShoppingCart, Receipt
} from 'lucide-react'
import { useLanguage }  from '@renderer/contexts/LanguageContext'
import { useToast }     from '@renderer/contexts/ToastContext'
import { useAuth }      from '@renderer/contexts/AuthContext'
import VetOwnerFormModal    from './components/owners/VetOwnerFormModal'
import VetPatientFormModal  from './components/owners/VetPatientFormModal'
import VetOwnerProfileModal from './components/owners/VetOwnerProfileModal'
import VetAppointmentFormModal from './components/appointments/VetAppointmentFormModal'
import VetStatsTab      from './vet-stats'
import VetAppointmentsTab from './components/appointments/VetAppointmentsTab'
import VetExpensesTab   from './vet-expenses'
import VetMedicinesTab  from './components/medicines/VetMedicinesTab'
import VetSalesTab, { SalesHistory } from './components/sales/VetSalesTab'
import { pluginTabCapability } from '../../../../../shared/permissions'
import { speciesEmoji, speciesLabel } from './components/owners/species'
import { VetStaff } from './vet-staff/types'
import VetStaffTab from './vet-staff'
import VetFollowUpsTab from './vet-followups/VetFollowUpsTab'
import VetSessionFormModal from './vet-sessions/VetSessionFormModal'
import VetSessionsTab from './vet-sessions/VetSessionsTab'

type Tab = 'owners' | 'vets' | 'sessions' | 'stats' | 'appointments' | 'followups' | 'expenses' | 'medicines' | 'sales' | 'salesHistory'

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

function ownerInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
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
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <PawPrint className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('vetJourneyTitle') || 'Vet Clinic Journey'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('vetJourneySubtitle') || 'How owners and pets move through the system'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-2 overflow-y-auto max-h-[72vh]">
          {/* Step 1 — Owner */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {t('vetJourneyStep1Title') || 'Owner Registered'}
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                  {t('vetJourneyStep1Desc') || 'Register the pet owner once — name, phone, email, address. One owner can have multiple pets. This is the permanent contact on file.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-slate-400" /></div>

          {/* Step 2 — Pet */}
          <div className="rounded-xl border border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-fuchsia-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-semibold text-fuchsia-800 dark:text-fuchsia-300 flex items-center gap-1.5">
                  <PawPrint className="h-3.5 w-3.5" /> {t('vetJourneyStep2Title') || 'Pet Added'}
                </p>
                <p className="text-xs text-fuchsia-700 dark:text-fuchsia-400 mt-0.5">
                  {t('vetJourneyStep2Desc') || 'Add each pet under the owner — species, breed, age, weight, microchip, allergies, medical notes. Click "Add Pet" on the owner card.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-2">
            <ArrowDown className="h-4 w-4 text-slate-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">{t('vetJourneyTwoWays') || 'Two ways to start a visit:'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('vetJourneyApptTitle') || 'Appointment (recommended)'}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t('vetJourneyApptDesc') || 'Owner card pet → 📅 Book → client arrives → "Start Session" converts it to a full visit record.'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('vetJourneyWalkinTitle') || 'Walk-in'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('vetJourneyWalkinDesc') || 'Owner card pet → ⚡ Walk-in — skips appointment, opens session form directly.'}
              </p>
            </div>
          </div>

          <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-slate-400" /></div>

          {/* Step 3 — Session */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> {t('journeyStep3SessionTitle') || 'Session (Visit Record)'}
                </p>
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                  {t('vetJourneyStep3Desc') || 'The core veterinary record: diagnosis, treatment, prescriptions, payment, notes. Each pet builds a history of sessions over time.'}
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-500 mt-1">
                  {t('vetJourneyFollowupOptional') || 'Optional: set a follow-up date for the next check-in.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <ArrowDown className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">{t('vetJourneyConditional') || 'Only if a follow-up date was set:'}</p>
          </div>

          {/* Step 4 — Follow-up */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">4</div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" /> {t('journeyStep4FollowupTitle') || 'Follow-up Reminder'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {t('vetJourneyStep4Desc') || 'Appears in Follow-ups as upcoming / due-today / overdue. Badge turns red when overdue.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="flex items-center gap-1 text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 px-2 py-1 rounded-lg">
                    <ArrowRight className="h-3 w-3" /> {t('vetJourneyBookApptAction') || '"Book Appt" → new Appointment'}
                  </span>
                  <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg">
                    <ArrowRight className="h-3 w-3" /> {t('vetJourneyMarkDoneAction') || '"Mark Done" → dismisses reminder'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t('vetJourneyRefTitle') || 'Quick reference'}</p>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-violet-600 dark:text-violet-400">{t('vetJourneyTabOwners') || 'Owners tab'}</span> — {t('vetJourneyOwnersTabDesc') || 'all owners with their pets nested below'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-blue-600 dark:text-blue-400">{t('journeyTabAppointments') || 'Appointments tab'}</span> — {t('vetJourneyApptsTabDesc') || 'future calendar slots, no medical data'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-teal-600 dark:text-teal-400">{t('journeyTabSessions') || 'Sessions tab'}</span> — {t('vetJourneySessionsTabDesc') || 'completed visits with full veterinary records'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-amber-600 dark:text-amber-400">{t('journeyTabFollowUps') || 'Follow-ups tab'}</span> — {t('vetJourneyFollowupsTabDesc') || 'reminders from sessions, overdue turns red'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Owner Card ───────────────────────────────────────────────────────────────
interface OwnerCardProps {
  owner:          VetOwnerWithPets
  onEdit:         () => void
  onDelete:       () => void
  onAddPet:       () => void
  onViewProfile:  () => void
  onWalkIn:  (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
  onBook:    (p: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => void
  onViewPet: (petId: string) => void
}

function OwnerCard({ owner, onEdit, onDelete, onAddPet, onViewProfile, onWalkIn, onBook, onViewPet }: OwnerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const petCount = owner._count.patients

  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
            {ownerInitials(owner.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{owner.name}</h3>
              <span className="inline-flex items-center gap-1 text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                <PawPrint className="h-3 w-3" /> {petCount} {petCount === 1 ? 'pet' : 'pets'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Phone className="h-3 w-3" /> {owner.phone}
              </span>
              {owner.email && (
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                  <Mail className="h-3 w-3" /> {owner.email}
                </span>
              )}
              {owner.address && (
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                  <MapPin className="h-3 w-3" /> {owner.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <button
            onClick={onViewProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-lg shadow-sm transition-all"
          >
            <Eye className="h-3.5 w-3.5" /> Profile
          </button>
          <button
            onClick={onAddPet}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-700 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Pet
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto"
            title="Delete owner"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {petCount > 0 && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            >
              {expanded ? <><ChevronUp className="h-4 w-4" /> Hide</> : <><ChevronDown className="h-4 w-4" /> Pets</>}
            </button>
          )}
        </div>
      </div>

      {/* Pets panel */}
      {expanded && petCount > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/40 px-4 py-3 space-y-2">
          {owner.patients.map(pet => (
            <div
              key={pet.id}
              className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{speciesEmoji(pet.species)}</span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{pet.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {speciesLabel(pet.species)}{pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onViewPet(pet.id)}
                  title="View profile"
                  className="p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onBook({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                  title="Book appointment"
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onWalkIn({ id: pet.id, name: pet.name, species: pet.species, ownerId: owner.id, owner })}
                  title="Walk-in session"
                  className="p-1.5 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                >
                  <Activity className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VetPage() {
  const { t }    = useLanguage()
  const toast    = useToast()
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isVetStaff = user?.role === 'vet_staff'

  const allTabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'owners',       label: t('vetOwners')       || 'Owners',       icon: Users },
    { key: 'vets',         label: t('vetVets')         || 'Vets',         icon: Stethoscope },
    { key: 'sessions',     label: t('vetSessions')     || 'Sessions',     icon: ClipboardList },
    { key: 'appointments', label: t('vetAppointments') || 'Appointments', icon: CalendarClock },
    { key: 'followups',    label: t('vetFollowUps')    || 'Follow-ups',   icon: Bell },
    { key: 'medicines' as Tab, label: t('vetMedStore')||'Medicine Store', icon: Activity },
    { key: 'sales'     as Tab, label: t('vetSalesTab')||'Sales',           icon: ShoppingCart },
    { key: 'salesHistory' as Tab, label: t('vetSalesHistory')||'Sales History', icon: Receipt },
    ...(!isVetStaff
      ? [
          { key: 'stats'    as Tab, label: t('vetStats')    || 'Statistics', icon: BarChart3 },
          { key: 'expenses' as Tab, label: t('vetExpenses') || 'Expenses',   icon: DollarSign }
        ]
      : [])
  ]

  const visibleTabs = allTabs.filter(item => can(pluginTabCapability('vet', item.key)!))

  const [tab, setTab] = useState<Tab>('owners')
  const [salesCartCount, setSalesCartCount] = useState(0)
  const [pendingMainTab, setPendingMainTab] = useState<Tab | null>(null)

  useEffect(() => {
    if (!visibleTabs.some(item => item.key === tab)) setTab(visibleTabs[0]?.key ?? 'owners')
  }, [tab, visibleTabs])

  // Guard: leaving the Sales tab with a non-empty cart would discard it.
  function requestMainTab(key: Tab) {
    if (key === tab) return
    if (tab === 'sales' && salesCartCount > 0) { setPendingMainTab(key); return }
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

  // ── Owners state ──────────────────────────────────────────────────────────
  const [owners,  setOwners]  = useState<VetOwnerWithPets[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const PAGE_SIZE             = 30
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState('')
  const searchTimer           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showOwnerForm,    setShowOwnerForm]    = useState(false)
  const [showPatientForm,  setShowPatientForm]  = useState(false)
  const [showSessionForm,  setShowSessionForm]  = useState(false)
  const [showAppointForm,  setShowAppointForm]  = useState(false)
  const [showJourney,      setShowJourney]      = useState(false)

  const [editingOwner,       setEditingOwner]      = useState<VetOwnerWithPets | null>(null)
  const [editingPatient,     setEditingPatient]     = useState<VetPatient | null>(null)
  const [preselectedOwner,   setPreselectedOwner]   = useState<VetOwner | null>(null)
  const [preselectedPatient, setPreselectedPatient] = useState<VetPatient | null>(null)
  const [deleteTarget,       setDeleteTarget]       = useState<VetOwnerWithPets | null>(null)
  const [isDeleting,         setIsDeleting]         = useState(false)

  // ── Owner profile ─────────────────────────────────────────────────────────
  const [profileOwner, setProfileOwner] = useState<VetOwnerWithPets | null>(null)

  // ── Staff (Vets) state ──────────────────────────────────────────────────
  
  const [deleteStaff,     setDeleteStaff]     = useState<VetStaff | null>(null)

  // ── Load owners ──────────────────────────────────────────────────────────
  const loadOwners = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const currentPage = reset ? 0 : page
      if (reset) setPage(0)
      const result = await window.api.vet?.owners.getAll({
        search: search || undefined,
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE
      })
      if (result) {
        setOwners(reset || currentPage === 0 ? result.data : prev => [...prev, ...result.data])
        setTotal(result.total)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load owners')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    if (tab === 'owners') {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => loadOwners(true), search ? 300 : 0)
    }
  }, [search, tab])

  useEffect(() => {
    if (tab === 'owners') loadOwners(true)
  }, [tab])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOwnerSaved = (_owner: VetOwner) => {
    setShowOwnerForm(false)
    setEditingOwner(null)
    loadOwners(true)
    toast.success('Owner saved')
  }

  const handlePatientSaved = () => {
    setShowPatientForm(false)
    setEditingPatient(null)
    setPreselectedOwner(null)
    loadOwners(true)
    toast.success('Pet saved')
  }

  const handleSessionSaved = () => {
    setShowSessionForm(false)
    setPreselectedPatient(null)
    toast.success('Session saved')
  }

  const handleAppointSaved = () => {
    setShowAppointForm(false)
    setPreselectedPatient(null)
    toast.success('Appointment saved')
  }

  const handleDeleteOwner = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await window.api.vet?.owners.delete(deleteTarget.id)
      setDeleteTarget(null)
      loadOwners(true)
      toast.success('Owner removed')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete owner')
    } finally {
      setIsDeleting(false)
    }
  }

  const openAddPet = (owner: VetOwnerWithPets) => {
    setPreselectedOwner(owner)
    setEditingPatient(null)
    setShowPatientForm(true)
  }

  const openWalkIn = (patient: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => {
    setPreselectedPatient(patient as any)
    setShowSessionForm(true)
  }

  const openBooking = (patient: { id: string; name: string; species: string; ownerId: string; owner: VetOwner }) => {
    setPreselectedPatient(patient as any)
    setShowAppointForm(true)
  }


  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
              <PawPrint className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('vetClinic') || 'Vet Clinic'}</h1>
                <button
                  onClick={() => setShowJourney(true)}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 px-2 py-1 rounded-lg"
                >
                  <Info className="h-3.5 w-3.5" /> {t('howItWorks') || 'How it works'}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('vetSubtitle') || 'Pet health management'}</p>
            </div>
          </div>

          {tab === 'owners' && (
            <button
              onClick={() => { setEditingOwner(null); setShowOwnerForm(true) }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="h-4 w-4" /> New Owner
            </button>
          )}
        
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

        {/* Owners tab */}
        {tab === 'owners' && (
          <div className="p-6 space-y-4 max-w-full mx-auto">
            {total > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{total}</span> owners registered
              </p>
            )}

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search owners by name, phone, email…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-colors"
              />
            </div>

            {/* Owner list */}
            {loading && owners.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="text-sm text-slate-400">Loading owners…</p>
              </div>
            ) : owners.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-violet-400" />
                </div>
                <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {search ? 'No owners match your search' : 'No owners yet'}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                  {search ? 'Try a different name or phone number' : 'Register your first owner to get started'}
                </p>
                {!search && (
                  <button
                    onClick={() => { setEditingOwner(null); setShowOwnerForm(true) }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Register First Owner
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {owners.map(owner => (
                    <OwnerCard
                      key={owner.id}
                      owner={owner}
                      onViewProfile={() => setProfileOwner(owner)}
                      onEdit={() => { setEditingOwner(owner); setShowOwnerForm(true) }}
                      onDelete={() => setDeleteTarget(owner)}
                      onAddPet={() => openAddPet(owner)}
                      onWalkIn={openWalkIn}
                      onBook={openBooking}
                      onViewPet={petId => navigate(`/vet/patients/${petId}`)}
                    />
                  ))}
                </div>
                {owners.length < total && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => { setPage(p => p + 1); loadOwners() }}
                      disabled={loading}
                      className="px-6 py-2.5 text-sm font-medium text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50 transition-colors"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Load more (${total - owners.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'sessions'     && <VetSessionsTab />}
        {tab === 'appointments' && <VetAppointmentsTab />}
        {tab === 'followups'    && <VetFollowUpsTab />}
        {tab === 'stats'        && <VetStatsTab onNavigate={(t) => requestMainTab(t as Tab)} />}
        {tab === 'expenses'     && <VetExpensesTab />}
        {tab === 'medicines'    && <VetMedicinesTab />}
        {tab === 'vets'        && <VetStaffTab />}
        {tab === 'sales'        && <VetSalesTab onCartCountChange={setSalesCartCount} />}
        {tab === 'salesHistory' && (
          <div className="flex flex-col h-full min-h-0"><SalesHistory /></div>
        )}

  
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showJourney && <JourneyModal onClose={() => setShowJourney(false)} />}

      {profileOwner && (
        <VetOwnerProfileModal
          owner={profileOwner}
          onClose={() => setProfileOwner(null)}
          onEdit={() => { setEditingOwner(profileOwner); setProfileOwner(null); setShowOwnerForm(true) }}
          onAddPet={() => { openAddPet(profileOwner); setProfileOwner(null) }}
          onViewPet={petId => { setProfileOwner(null); navigate(`/vet/patients/${petId}`) }}
          onBook={p => { openBooking(p); setProfileOwner(null) }}
          onWalkIn={p => { openWalkIn(p); setProfileOwner(null) }}
        />
      )}

      {showOwnerForm && (
        <VetOwnerFormModal
          owner={editingOwner}
          onSave={handleOwnerSaved}
          onClose={() => { setShowOwnerForm(false); setEditingOwner(null) }}
        />
      )}

      {showPatientForm && (
        <VetPatientFormModal
          patient={editingPatient}
          preselectedOwner={preselectedOwner}
          onSave={handlePatientSaved}
          onClose={() => { setShowPatientForm(false); setEditingPatient(null); setPreselectedOwner(null) }}
        />
      )}

      {showSessionForm && (
        <VetSessionFormModal
          preselectedPatient={preselectedPatient ?? undefined}
          onSave={handleSessionSaved}
          onClose={() => { setShowSessionForm(false); setPreselectedPatient(null) }}
        />
      )}

      {showAppointForm && (
        <VetAppointmentFormModal
          preselectedPatient={preselectedPatient ?? undefined}
          onSave={handleAppointSaved}
          onClose={() => { setShowAppointForm(false); setPreselectedPatient(null) }}
        />
      )}



    

      {/* Delete owner confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Delete Owner</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This will also remove all their pets and records.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Delete <strong>{deleteTarget.name}</strong>
              {deleteTarget._count.patients > 0 && (
                <> and their <strong>{deleteTarget._count.patients} {deleteTarget._count.patients === 1 ? 'pet' : 'pets'}</strong></>
              )}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOwner}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave-Sales-with-cart confirmation */}
      {pendingMainTab && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setPendingMainTab(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('vetLeaveCartTitle') || 'Discard cart?'}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {(t('vetLeaveSalesBody') || 'You have {n} item(s) in the sales cart that have not been sold. Leaving the Sales tab will discard them.').replace('{n}', String(salesCartCount))}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingMainTab(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">
                {t('vetStayKeepCart') || 'Stay'}
              </button>
              <button onClick={() => { const dest = pendingMainTab; setSalesCartCount(0); setPendingMainTab(null); setTab(dest) }}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">
                {t('vetLeaveDiscard') || 'Discard & leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
