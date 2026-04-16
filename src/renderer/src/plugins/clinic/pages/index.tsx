import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Users, ClipboardList, BarChart3, CalendarClock, Bell, Plus, Search, Loader2, Trash2, Eye, Pencil, Phone, Calendar, Activity, DollarSign, AlertCircle, Info, X, ArrowDown, ArrowRight, Receipt } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import PatientFormModal from './components/PatientFormModal'
import SessionFormModal from './components/SessionFormModal'
import AppointmentFormModal from './components/AppointmentFormModal'
import SessionsTab from './components/SessionsTab'
import StatsTab from './components/StatsTab'
import AppointmentsTab from './components/AppointmentsTab'
import FollowUpsTab from './components/FollowUpsTab'
import ExpensesTab from './components/ExpensesTab'

type Tab = 'patients' | 'sessions' | 'stats' | 'appointments' | 'followups' | 'expenses'

// ─── Journey help modal ─────────────────────────────────────────────────────
function JourneyModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Patient Journey</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">How patients move through the clinic system</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Journey flow */}
        <div className="px-6 py-5 space-y-1 overflow-y-auto max-h-[70vh]">

          {/* Step 1 — Patient */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Patient Created
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                  Staff registers the patient once — name, DOB, phone, blood type, allergies, medical notes. This is the permanent record on file.
                </p>
              </div>
            </div>
          </div>

          {/* Fork */}
          <div className="flex items-center gap-3 pl-2">
            <div className="flex flex-col items-center gap-0.5">
              <ArrowDown className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">Two paths to start a visit:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Standard path */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Standard (recommended)</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Patient card → <span className="font-medium">"Book Appointment"</span> → patient arrives → "Start Session" from the appointment.
              </p>
            </div>
            {/* Walk-in path */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Walk-in (exception)</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient card → <span className="font-medium text-slate-600 dark:text-slate-300">"Walk-in"</span> — skips appointment, opens session form directly.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* Step 2 — Appointment */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> Appointment
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                  A future calendar slot — no medical data yet. Just a date, time, doctor, and purpose. When the patient walks in, click <span className="font-medium">"Start Session"</span> to open the session form pre-filled. The appointment is then automatically marked as completed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* Step 3 — Session */}
          <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Session (Visit Record)
                </p>
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-0.5">
                  The core medical record for a single visit: vitals, diagnosis, prescriptions, payment, and notes. A patient can have many sessions over time.
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-500 mt-1.5 flex items-center gap-1">
                  <span className="font-medium">Optional:</span> set a Follow-up date if the doctor wants the patient to return.
                </p>
              </div>
            </div>
          </div>

          {/* Conditional arrow */}
          <div className="flex items-center gap-2 pl-2">
            <ArrowDown className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">Only if a follow-up date was set on the session:</p>
          </div>

          {/* Step 4 — Follow-up */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">4</div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" /> Follow-up Reminder
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Appears in the Follow-ups tab as an upcoming, due-today, or overdue reminder — surfaced from the session's follow-up date field. Not yet a scheduled appointment.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 px-2 py-1 rounded-lg">
                    <ArrowRight className="h-3 w-3" /> <span><span className="font-medium">"Book Appt"</span> — creates a new Appointment (step 2, loop)</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg">
                    <ArrowRight className="h-3 w-3" /> <span><span className="font-medium">"Mark Done"</span> — dismisses the reminder without booking</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Summary: what lives where</p>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-violet-600 dark:text-violet-400">Patients tab</span> — permanent records, all patients registered in the system</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-blue-600 dark:text-blue-400">Appointments tab</span> — future calendar slots; no medical data</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-teal-600 dark:text-teal-400">Sessions tab</span> — completed visit records with full medical data</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-amber-600 dark:text-amber-400">Follow-ups tab</span> — reminders extracted from sessions; badge turns red when overdue</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Info tooltip ────────────────────────────────────────────────────────────
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
          setTipPos({ top: r.top, left: r.left + (r.width / 2) })
        }
      }}
      onMouseLeave={() => setTipPos(null)}
    >
      <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-default" />
      {tipPos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tipPos.top,
            left: tipPos.left,
            transform: 'translate(-68%, -100%) translateY(-8px)',
            zIndex: 99999,
          }}
          className="pointer-events-none w-56 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-xs leading-relaxed px-3 py-2 shadow-xl text-left whitespace-normal"
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
        </div>,
        document.body
      )}
    </span>
  )
}

export interface Patient {
  id: string
  name: string
  dateOfBirth?: string | null
  gender?: string | null
  phone: string
  email?: string | null
  address?: string | null
  nationalId?: string | null
  folderNumber?: string | null
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
  onNewSession,
  onBookAppt
}: {
  patient: Patient
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onNewSession: () => void
  onBookAppt: () => void
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
              {patient.folderNumber && (
                <span className="inline-flex items-center gap-0.5 text-xs font-mono font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                  #{patient.folderNumber}
                </span>
              )}
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
      <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-700/40 border-t border-slate-100 dark:border-slate-700 space-y-1.5" onClick={(e) => e.stopPropagation()}>
        {/* Primary CTA: Book Appointment (the intended journey start) */}
        <button
          onClick={onBookAppt}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 py-1.5 rounded-lg transition-colors"
        >
          <CalendarClock className="h-3.5 w-3.5" /> Book Appointment
        </button>
        {/* Secondary row */}
        <div className="flex items-center gap-1">
          <button
            onClick={onNewSession}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600/60 py-1.5 rounded-lg transition-colors"
            title="Walk-in — no appointment, start a session directly"
          >
            <Plus className="h-3 w-3" /> Walk-in
          </button>
          <button
            onClick={onView}
            className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            title={t('viewProfile')}
          >
            <Eye className="h-3.5 w-3.5" />
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
  const [bookApptPatient, setBookApptPatient] = useState<Patient | null>(null)

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
              onBookAppt={() => setBookApptPatient(p)}
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
      {bookApptPatient && (
        <AppointmentFormModal
          defaultPatientId={bookApptPatient.id}
          defaultPatientName={bookApptPatient.name}
          onClose={() => setBookApptPatient(null)}
          onSaved={() => { setBookApptPatient(null) }}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClinicPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('patients')
  const [overdueCount, setOverdueCount] = useState(0)
  const [showJourney, setShowJourney] = useState(false)
  const [dentistMode, setDentistMode] = useState(() => localStorage.getItem('clinicDentistMode') === 'true')

  function toggleDentistMode() {
    const next = !dentistMode
    setDentistMode(next)
    localStorage.setItem('clinicDentistMode', String(next))
  }

  // Fetch overdue follow-up count once for the tab badge
  useEffect(() => {
    window.api.clinic.appointments.getAllFollowUps({ filter: 'overdue' })
      .then((data: any[]) => setOverdueCount(data?.length ?? 0))
      .catch(() => {})
  }, [])

  const TAB_INFO: Partial<Record<Tab, string>> = {
    sessions:     'The actual visit record — created when a patient arrives. Stores vitals, diagnosis, prescriptions and payment.',
    appointments: 'A scheduled future slot on the calendar. No medical data yet — start a session from here when the patient shows up.',
    followups:    'Reminders set during a session ("come back in 2 weeks"). Shown here when the date is approaching, due today, or overdue.',
    expenses:     'Track clinic operating costs — rent, utilities, salaries, supplies, and more. View summaries and totals by period.',
  }

  const tabs: { key: Tab; label: string; Icon: React.ElementType; badge?: number }[] = [
    { key: 'patients',     label: t('clinicPatients'),                  Icon: BarChart3 },
    { key: 'appointments', label: t('clinicAppointments'),              Icon: Users },
    { key: 'sessions',     label: t('clinicSessions'),                  Icon: ClipboardList },
    { key: 'followups',    label: t('clinicFollowUps') ?? 'Follow-ups', Icon: Bell, badge: overdueCount },
    { key: 'stats',        label: t('clinicStats'),                     Icon: CalendarClock },
    { key: 'expenses',     label: t('clinicExpenses')  ?? 'Expenses',   Icon: Receipt },
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
        <button
          onClick={() => setShowJourney(true)}
          title="How the clinic system works — patient journey"
          className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 transition-all"
        >
          <Info className="h-3.5 w-3.5" /> How it works
        </button>
        {/* Dentist mode toggle */}
        <button
          onClick={toggleDentistMode}
          title={dentistMode ? 'Disable dentist mode' : 'Enable dentist mode (adds dental chart to sessions)'}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            dentistMode
              ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-teal-300 hover:text-teal-600 dark:hover:text-teal-400'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5" />
          <span className="inline-flex items-center gap-1">
            Dentist Mode
            <InfoTooltip text="Dentist Mode adds the Dental Chart (odontogram) to session forms, so you can record tooth-level findings and save them with the visit." />
          </span>
          <span className={`relative inline-block h-4 w-7 rounded-full transition-colors ${
            dentistMode ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}>
            <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
              dentistMode ? 'translate-x-3' : ''
            }`} />
          </span>
        </button>
      </div>
      {showJourney && <JourneyModal onClose={() => setShowJourney(false)} />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-0.5">
        {tabs.map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === key
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {TAB_INFO[key] && <InfoTooltip text={TAB_INFO[key]!} />}
            {badge != null && badge > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] inline-flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'patients'     && <PatientsTab />}
        {activeTab === 'sessions'     && <SessionsTab />}
        {activeTab === 'stats'        && <StatsTab />}
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'followups'    && <FollowUpsTab />}
        {activeTab === 'expenses'     && <ExpensesTab />}
      </div>
    </div>
  )
}
