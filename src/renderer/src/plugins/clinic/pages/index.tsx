import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Users, ClipboardList, BarChart3, CalendarClock, Plus, Search, Loader2, Trash2, Eye, Pencil, Phone, Calendar, Activity, DollarSign, AlertCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import PatientFormModal from './components/PatientFormModal'
import SessionFormModal from './components/SessionFormModal'
import SessionsTab from './components/SessionsTab'
import StatsTab from './components/StatsTab'
import AppointmentsTab from './components/AppointmentsTab'

type Tab = 'patients' | 'sessions' | 'stats' | 'appointments'

export interface Patient {
  id: string
  name: string
  dateOfBirth?: string | null
  gender?: string | null
  phone: string
  email?: string | null
  address?: string | null
  nationalId?: string | null
  bloodType?: string | null
  allergies?: string | null
  medicalNotes?: string | null
  createdAt: string
  updatedAt: string
  _count?: { sessions: number }
  sessions?: Array<{ visitDate: string; paymentStatus?: string; visitType?: string }>
  finance?: { totalCharged: number; totalPaid: number; outstanding: number }
}

function calcAge(dob?: string | null): string {
  if (!dob) return '–'
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  return `${age}y`
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const bloodTypeColors: Record<string, string> = {
  'A+': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'A-': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'B+': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'B-': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'O+': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'O-': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'AB+': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'AB-': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
}

const visitTypeColors: Record<string, string> = {
  first_visit: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  follow_up: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  routine: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  emergency: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({
  patient,
  onView,
  onEdit,
  onDelete,
  onNewSession
}: {
  patient: Patient
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onNewSession: () => void
}) {
  const { t } = useLanguage()
  const lastVisit = patient.sessions?.[0]
  const outstanding = patient.finance?.outstanding ?? 0
  const hasOutstanding = outstanding > 0

  const avatarColors = [
    'from-teal-500 to-teal-600',
    'from-violet-500 to-violet-600',
    'from-sky-500 to-sky-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-indigo-500 to-indigo-600',
  ]
  const colorIdx = patient.name.charCodeAt(0) % avatarColors.length

  return (
    <div
      className="group relative pt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-lg hover:shadow-teal-500/10 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onView}
    >
      {/* Outstanding badge */}
      {hasOutstanding && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium px-2 py-0.5 rounded-full z-10">
          <AlertCircle className="h-3 w-3" />
          {outstanding.toFixed(0)} due
        </div>
      )}

      {/* Card top: avatar + name */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-4">
          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <span className="text-lg font-bold text-white">{initials(patient.name)}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-tight truncate">{patient.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-slate-400">{calcAge(patient.dateOfBirth)}</span>
              {patient.gender && (
                <span className="text-sm text-slate-400 capitalize">{t(patient.gender as any)}</span>
              )}
              {patient.bloodType && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${bloodTypeColors[patient.bloodType] ?? 'bg-slate-100 text-slate-600'}`}>
                  {patient.bloodType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">{patient.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            {lastVisit ? (
              <span>
                {new Date(lastVisit.visitDate).toLocaleDateString()}
                {lastVisit.visitType && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-md font-medium ${visitTypeColors[lastVisit.visitType] ?? ''}`}>
                    {t(lastVisit.visitType as any)}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 italic text-xs">{t('noVisitsYet')}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Activity className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span>{patient._count?.sessions ?? 0} {t('visits')}</span>
            {patient.finance && patient.finance.totalCharged > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs">
                <DollarSign className="h-3 w-3" />
                <span className={hasOutstanding ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400'}>
                  {hasOutstanding ? `${outstanding.toFixed(0)} unpaid` : 'Paid up'}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card footer: actions */}
      <div className="flex items-center gap-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-700/40 border-t border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 py-1.5 rounded-lg transition-colors"
          title={t('viewProfile')}
        >
          <Eye className="h-3.5 w-3.5" /> {t('profile')}
        </button>
        <button
          onClick={onNewSession}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 py-1.5 rounded-lg transition-colors"
          title={t('newSession')}
        >
          <Plus className="h-3.5 w-3.5" /> {t('newSession')}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title={t('edit')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title={t('delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Patients Tab ─────────────────────────────────────────────────────────────
function PatientsTab() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [newSessionPatient, setNewSessionPatient] = useState<Patient | null>(null)

  const load = useCallback(async (searchVal?: string) => {
    setLoading(true)
    try {
      const data = await window.api.clinic.patients.getAll({ search: searchVal || undefined })
      setPatients(data)
    } catch {
      showToast('error', t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  // Debounce: search waits 300 ms; initial load (empty search) fires immediately
  useEffect(() => {
    const timer = setTimeout(() => load(search), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search, load])

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    try {
      await window.api.clinic.patients.delete(id)
      showToast('success', t('deletedSuccessfully'))
      load(search)
    } catch {
      showToast('error', t('errorDeletingRecord'))
    }
  }

  const outstandingTotal = patients.reduce((s, p) => s + (p.finance?.outstanding ?? 0), 0)
  const withOutstanding = patients.filter((p) => (p.finance?.outstanding ?? 0) > 0).length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
            placeholder={t('searchPatients')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {outstandingTotal > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium px-3 py-2 rounded-xl">
              <AlertCircle className="h-3.5 w-3.5" />
              {withOutstanding} patients · {outstandingTotal.toFixed(0)} outstanding
            </div>
          )}
          <button
            onClick={() => setShowNewPatient(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="h-4 w-4" />
            {t('newPatient')}
          </button>
        </div>
      </div>

      {/* Patient grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
          <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Users className="h-10 w-10 opacity-40" />
          </div>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">{t('noPatientsFound')}</p>
          <p className="text-sm text-slate-400 mt-1">{t('addFirstPatient')}</p>
          <button
            onClick={() => setShowNewPatient(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> {t('newPatient')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {patients.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              onView={() => navigate(`/clinic/patients/${p.id}`)}
              onEdit={() => setEditPatient(p)}
              onDelete={() => handleDelete(p.id)}
              onNewSession={() => setNewSessionPatient(p)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showNewPatient || editPatient) && (
        <PatientFormModal
          patient={editPatient}
          onClose={() => { setShowNewPatient(false); setEditPatient(null) }}
          onSaved={() => { setShowNewPatient(false); setEditPatient(null); load() }}
        />
      )}
      {newSessionPatient && (
        <SessionFormModal
          defaultPatient={newSessionPatient}
          onClose={() => setNewSessionPatient(null)}
          onSaved={() => { setNewSessionPatient(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClinicPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('patients')

  const tabs: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: 'patients',     label: t('clinicPatients'),     Icon: Users },
    { key: 'sessions',     label: t('clinicSessions'),     Icon: ClipboardList },
    { key: 'stats',        label: t('clinicStats'),        Icon: BarChart3 },
    { key: 'appointments', label: t('clinicAppointments'), Icon: CalendarClock },
  ]

  return (
    <div className="flex flex-col h-full p-6 gap-5 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm shadow-teal-500/30">
          <Stethoscope className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('clinic')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('clinicSubtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-0.5">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === key
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'patients'     && <PatientsTab />}
        {activeTab === 'sessions'     && <SessionsTab />}
        {activeTab === 'stats'        && <StatsTab />}
        {activeTab === 'appointments' && <AppointmentsTab />}
      </div>
    </div>
  )
}
