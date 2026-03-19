import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Plus, Loader2, Pencil, Trash2, Check, X,
  ChevronLeft, ChevronRight, Clock, PlayCircle
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import AppointmentFormModal from './AppointmentFormModal'
import SessionFormModal from './SessionFormModal'

interface Appointment {
  id: string
  patientId: string
  patient: { id: string; name: string; phone: string; bloodType?: string }
  appointmentDate: string
  duration?: number | null
  type: string
  doctorName?: string | null
  notes?: string | null
  status: string
}

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  follow_up:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  procedure:    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  checkup:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  no_show:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toIsoDate(d)
}

// ─── Individual appointment row ───────────────────────────────────────────────
function AppointmentRow({
  appt, updating, onEdit, onDelete, onStatusChange, onViewPatient, onStartSession
}: {
  appt: Appointment
  updating: boolean
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (s: string) => void
  onViewPatient: () => void
  onStartSession: () => void
}) {
  const { t } = useLanguage()
  const time = new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const isActive = ['scheduled', 'confirmed'].includes(appt.status)

  const TYPE_LABELS: Record<string, string> = {
    consultation: t('apptTypeConsultation'),
    follow_up:    t('apptTypeFollowUp'),
    procedure:    t('apptTypeProcedure'),
    checkup:      t('apptTypeCheckup'),
  }
  const STATUS_LABELS: Record<string, string> = {
    scheduled: t('apptStatusScheduled'),
    confirmed: t('apptStatusConfirmed'),
    completed: t('apptStatusCompleted'),
    cancelled: t('cancelled'),
    no_show:   t('apptStatusNoShow'),
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      isActive
        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700/50 hover:shadow-sm'
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 opacity-70'
    }`}>
      {/* Time block */}
      <div className="flex-shrink-0 text-center bg-teal-50 dark:bg-teal-900/20 rounded-xl px-3 py-2 min-w-[58px]">
        <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{time}</p>
        {appt.duration && <p className="text-[10px] text-slate-400">{appt.duration}m</p>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onViewPatient}
            className="font-semibold text-sm text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            {appt.patient.name}
          </button>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[appt.type] ?? 'bg-slate-100 text-slate-500'}`}>
            {TYPE_LABELS[appt.type] ?? appt.type.replace('_', ' ')}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {STATUS_LABELS[appt.status] ?? appt.status.replace('_', ' ')}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
          <span>{appt.patient.phone}</span>
          {appt.doctorName && <span>Dr. {appt.doctorName}</span>}
          {appt.notes && <span className="truncate max-w-[180px]" title={appt.notes}>{appt.notes}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {updating ? (
          <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
        ) : (
          <>
            {isActive && (
              <button onClick={onStartSession} title={t('startSession')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg border border-teal-200 dark:border-teal-800/40 transition-colors">
                <PlayCircle className="h-3.5 w-3.5" /> {t('startSession')}
              </button>
            )}
            {appt.status === 'scheduled' && (
              <button onClick={() => onStatusChange('confirmed')} title={t('confirmAppt')}
                className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                <Check className="h-4 w-4" />
              </button>
            )}
            {isActive && (
              <>
                <button onClick={() => onStatusChange('completed')} title={t('markCompleted')}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-base">
                  ✓
                </button>
                <button onClick={() => onStatusChange('cancelled')} title={t('cancel')}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
            <button onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AppointmentsTab() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [selectedDate,     setSelectedDate]     = useState<string>(toIsoDate(new Date()))
  const [appointments,     setAppointments]     = useState<Appointment[]>([])
  const [loading,          setLoading]          = useState(true)
  const [showForm,         setShowForm]         = useState(false)
  const [editingAppt,      setEditingAppt]      = useState<Appointment | null>(null)
  const [updatingId,       setUpdatingId]       = useState<string | null>(null)
  const [showSessionForm,  setShowSessionForm]  = useState(false)
  const [sessionAppt,      setSessionAppt]      = useState<Appointment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.clinic.appointments.getAll({ date: selectedDate })
      setAppointments(res ?? [])
    } catch {
      showToast('error', t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [selectedDate, showToast, t])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return
    try {
      await window.api.clinic.appointments.delete(id)
      showToast('success', t('appointmentDeleted'))
      load()
    } catch { showToast('error', t('failedDeleteAppointment')) }
  }

  const handleStatusChange = async (appt: Appointment, status: string) => {
    setUpdatingId(appt.id)
    try {
      await window.api.clinic.appointments.update(appt.id, { status })
      showToast('success', t('appointmentUpdated'))
      load()
    } catch { showToast('error', t('failedUpdateStatus')) }
    finally { setUpdatingId(null) }
  }

  const isToday        = selectedDate === toIsoDate(new Date())
  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const displayDate = selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const pending = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status))
  const done    = appointments.filter(a => !['scheduled', 'confirmed'].includes(a.status))

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Date nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(shiftDay(selectedDate, -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input type="date" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <button onClick={() => setSelectedDate(shiftDay(selectedDate, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(toIsoDate(new Date()))}
              className="px-3 py-2 rounded-xl text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors border border-teal-200 dark:border-teal-800/40">
              {t('todayBadge')}
            </button>
          )}
        </div>
        <button onClick={() => { setEditingAppt(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-teal-500/20">
          <Plus className="h-4 w-4" /> {t('bookAppointment')}
        </button>
      </div>

      {/* ── Date header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-teal-500" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{displayDate}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
          {appointments.length} {t('clinicAppointments').toLowerCase()}
        </span>
        {isToday && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium">{t('todayBadge')}</span>
        )}
      </div>

      {/* ── Appointment list ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-7 w-7 animate-spin text-teal-500" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <Calendar className="h-10 w-10 opacity-30 mb-2" />
          <p className="text-sm font-medium">{t('noAppointmentsDay')}</p>
          <button onClick={() => { setEditingAppt(null); setShowForm(true) }}
            className="mt-3 flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline">
            <Plus className="h-3.5 w-3.5" /> {t('bookOneAppt')}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('apptUpcoming')} — {pending.length}
              </p>
              {pending.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt}
                  updating={updatingId === appt.id}
                  onEdit={() => { setEditingAppt(appt); setShowForm(true) }}
                  onDelete={() => handleDelete(appt.id)}
                  onStatusChange={(s) => handleStatusChange(appt, s)}
                  onViewPatient={() => navigate(`/clinic/patients/${appt.patientId}`)}
                  onStartSession={() => { setSessionAppt(appt); setShowSessionForm(true) }}
                />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t('apptDoneCancelled')} — {done.length}
              </p>
              {done.map((appt) => (
                <AppointmentRow key={appt.id} appt={appt}
                  updating={updatingId === appt.id}
                  onEdit={() => { setEditingAppt(appt); setShowForm(true) }}
                  onDelete={() => handleDelete(appt.id)}
                  onStatusChange={(s) => handleStatusChange(appt, s)}
                  onViewPatient={() => navigate(`/clinic/patients/${appt.patientId}`)}
                  onStartSession={() => { setSessionAppt(appt); setShowSessionForm(true) }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <AppointmentFormModal
          existing={editingAppt}
          defaultDate={selectedDate}
          onClose={() => { setShowForm(false); setEditingAppt(null) }}
          onSaved={() => { setShowForm(false); setEditingAppt(null); load() }}
        />
      )}

      {showSessionForm && sessionAppt && (
        <SessionFormModal
          defaultAppointment={{
            id: sessionAppt.id,
            appointmentDate: sessionAppt.appointmentDate,
            type: sessionAppt.type,
            doctorName: sessionAppt.doctorName,
            notes: sessionAppt.notes,
            patient: sessionAppt.patient
          }}
          onClose={() => { setShowSessionForm(false); setSessionAppt(null) }}
          onSaved={() => { setShowSessionForm(false); setSessionAppt(null); load() }}
        />
      )}
    </div>
  )
}
