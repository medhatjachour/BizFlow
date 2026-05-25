import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Plus, Loader2, Pencil, Trash2, Check, X,
  ChevronLeft, ChevronRight, PlayCircle, LayoutGrid, List, Info
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import VetAppointmentFormModal from './VetAppointmentFormModal'
import VetSessionFormModal from './VetSessionFormModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

const TYPE_COLORS: Record<string, string> = {
  consultation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  follow_up:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  vaccination:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  surgery:      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  grooming:     'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
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
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return toIsoDate(d)
}

function getWeekDates(anchor: string): string[] {
  const d = new Date(anchor + 'T00:00:00')
  const dow = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon); day.setDate(mon.getDate() + i); return toIsoDate(day)
  })
}

// ─── (i) Help tooltip ──────────────────────────────────────────────────────────
function ApptHelp() {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.top, right: window.innerWidth - r.right }) } }}
      onMouseLeave={() => setPos(null)}
      onClick={e => e.stopPropagation()}>
      <Info className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos && createPortal(
        <div style={{ position: 'fixed', top: pos.top, right: pos.right, transform: 'translateY(-100%) translateY(-8px)', zIndex: 9999 }}
          className="w-64 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl whitespace-normal">
          <span className="block font-semibold text-violet-400 mb-1.5">Button guide</span>
          <span className="block mb-0.5"><span className="text-violet-300 font-medium">Start Session</span> — Pet arrived; opens the visit record.</span>
          <span className="block mb-0.5"><span className="text-slate-300 font-medium">Check</span> — Confirm: Scheduled → Confirmed.</span>
          <span className="block mb-0.5"><span className="text-emerald-300 font-medium">Complete</span> — Mark done without opening a session.</span>
          <span className="block mb-0.5"><span className="text-red-300 font-medium">Cancel</span> — Cancel this appointment.</span>
          <span className="block mb-0.5"><span className="text-blue-300 font-medium">Edit</span> — Change date, type, vet or notes.</span>
          <span className="block"><span className="text-red-300 font-medium">Delete</span> — Permanently remove this appointment.</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>,
        document.body
      )}
    </span>
  )
}

// ─── Appointment row ──────────────────────────────────────────────────────────
function AppointmentRow({
  appt, updating, onEdit, onDelete, onStatusChange, onViewPatient, onStartSession, t
}: {
  appt: any; updating: boolean
  onEdit: () => void; onDelete: () => void
  onStatusChange: (s: string) => void; onViewPatient: () => void; onStartSession: () => void
  t: (key: string) => string
}) {
  const time = new Date(appt.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const isActive = ['scheduled', 'confirmed'].includes(appt.status)

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      isActive
        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700/50 hover:shadow-sm'
        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 opacity-70'
    }`}>
      {/* Time block */}
      <div className="flex-shrink-0 text-center bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2 min-w-[58px]">
        <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{time}</p>
        {appt.duration && <p className="text-[10px] text-slate-400">{appt.duration}m</p>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onViewPatient}
            className="font-semibold text-sm text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            {appt.patient?.name ?? '—'}
          </button>
          <span className="text-xs text-slate-400 capitalize">({appt.patient?.species})</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[appt.type] ?? 'bg-slate-100 text-slate-500'}`}>
            {appt.type?.replace('_', ' ')}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {appt.status?.replace('_', ' ')}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
          {appt.patient?.owner?.phone && <span>{appt.patient.owner.phone}</span>}
          {appt.vetName && <span>Dr. {appt.vetName}</span>}
          {appt.notes && <span className="truncate max-w-[160px]" title={appt.notes}>{appt.notes}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {updating ? (
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
        ) : (
          <>
            {isActive && (
              <button onClick={onStartSession}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-lg border border-violet-200 dark:border-violet-800/40 transition-colors">
                <PlayCircle className="h-3.5 w-3.5" /> {t('startSession')||'Start'}
              </button>
            )}
            {appt.status === 'scheduled' && (
              <button onClick={() => onStatusChange('confirmed')} title="Confirm"
                className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                <Check className="h-4 w-4" />
              </button>
            )}
            {isActive && (
              <>
                <button onClick={() => onStatusChange('completed')} title="Mark completed"
                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-base">
                  ✓
                </button>
                <button onClick={() => onStatusChange('cancelled')} title="Cancel"
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
            <ApptHelp />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VetAppointmentsTab() {
  const toast    = useToast()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [selectedDate,    setSelectedDate]    = useState(toIsoDate(new Date()))
  const [appointments,    setAppointments]    = useState<any[]>([])
  const [weekAppts,       setWeekAppts]       = useState<Record<string, any[]>>({})
  const [loading,         setLoading]         = useState(true)
  const [viewMode,        setViewMode]        = useState<'day' | 'week'>('day')
  const [showForm,        setShowForm]        = useState(false)
  const [editTarget,      setEditTarget]      = useState<any | null>(null)
  const [updatingId,      setUpdatingId]      = useState<string | null>(null)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionAppt,     setSessionAppt]     = useState<any | null>(null)
  const [deleteTarget,    setDeleteTarget]    = useState<any | null>(null)
  const [isDeleting,      setIsDeleting]      = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (viewMode === 'day') {
        const from = new Date(selectedDate + 'T00:00:00').toISOString()
        const to   = new Date(selectedDate + 'T23:59:59').toISOString()
        const result = await window.api.vet?.appointments.getAll({ from, to, skip: 0, take: 200 })
        setAppointments(result?.data ?? [])
      } else {
        const days = getWeekDates(selectedDate)
        const results = await Promise.all(days.map(d => {
          const from = new Date(d + 'T00:00:00').toISOString()
          const to   = new Date(d + 'T23:59:59').toISOString()
          return window.api.vet?.appointments.getAll({ from, to, skip: 0, take: 200 }).catch(() => ({ data: [] }))
        }))
        const map: Record<string, any[]> = {}
        days.forEach((d, i) => { map[d] = (results[i] as any)?.data ?? [] })
        setWeekAppts(map)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, viewMode])

  useEffect(() => { load() }, [selectedDate, viewMode])

  const handleStatusChange = async (appt: any, status: string) => {
    setUpdatingId(appt.id)
    try {
      await window.api.vet?.appointments.update(appt.id, { status })
      toast.success('Appointment updated')
      load()
    } catch { toast.error('Failed to update status') }
    finally { setUpdatingId(null) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await window.api.vet?.appointments.delete(deleteTarget.id)
      setDeleteTarget(null)
      load()
      toast.success('Appointment deleted')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const isToday    = selectedDate === toIsoDate(new Date())
  const pending    = appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status))
  const done       = appointments.filter(a => !['scheduled', 'confirmed'].includes(a.status))
  const weekDays   = viewMode === 'week' ? getWeekDates(selectedDate) : []

  const apptRow = (a: any) => (
    <AppointmentRow
      key={a.id}
      appt={a}
      updating={updatingId === a.id}
      onEdit={() => { setEditTarget(a); setShowForm(true) }}
      onDelete={() => setDeleteTarget(a)}
      onStatusChange={s => handleStatusChange(a, s)}
      onViewPatient={() => navigate(`/vet/patients/${a.patient?.id}`)}
      onStartSession={() => { setSessionAppt(a); setShowSessionForm(true) }}
      t={t}
    />
  )

  return (
    <div className="space-y-4 p-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSelectedDate(shiftDay(selectedDate, viewMode === 'week' ? -7 : -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button onClick={() => setSelectedDate(shiftDay(selectedDate, viewMode === 'week' ? 7 : 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!isToday && (
            <button onClick={() => setSelectedDate(toIsoDate(new Date()))}
              className="px-3 py-2 rounded-xl text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors border border-violet-200 dark:border-violet-800/40">
              {t('vetFilterToday')||'Today'}
            </button>
          )}
          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'day' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <List className="h-3.5 w-3.5" /> {t('dayView')||'Day'}
            </button>
            <button onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l border-slate-200 dark:border-slate-700 ${viewMode === 'week' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> {t('weekView')||'Week'}
            </button>
          </div>
        </div>
        <button onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> {t('bookAppointment')||'Book Appointment'}
        </button>
      </div>

      {/* ── Week view ──────────────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-violet-500" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const dayAppts  = weekAppts[day] ?? []
              const dayObj    = new Date(day + 'T00:00:00')
              const isToday   = day === toIsoDate(new Date())
              const isSelected = day === selectedDate
              return (
                <div key={day}
                  className={`rounded-xl border cursor-pointer transition-all hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm ${
                    isSelected ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                  onClick={() => { setSelectedDate(day); setViewMode('day') }}>
                  <div className={`px-2 py-2 text-center border-b ${isSelected ? 'border-violet-200 dark:border-violet-700/50' : 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      {dayObj.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div className={`text-base font-bold ${isToday ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {dayObj.getDate()}
                    </div>
                    {dayAppts.length > 0 && (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 mt-0.5">
                        {dayAppts.length}
                      </span>
                    )}
                  </div>
                  <div className="px-1.5 py-1.5 space-y-1 max-h-36 overflow-y-auto">
                    {dayAppts.slice(0, 4).map(a => (
                      <div key={a.id} className={`text-[10px] px-1.5 py-1 rounded-lg truncate font-medium ${
                        ['scheduled','confirmed'].includes(a.status)
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {new Date(a.appointmentDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} {a.patient?.name}
                      </div>
                    ))}
                    {dayAppts.length > 4 && (
                      <div className="text-[10px] text-center text-slate-400">+{dayAppts.length - 4} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── Day view ───────────────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">{t('noAppointments')||'No appointments for this day'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {t('pending')||'Pending'} ({pending.length})
                </p>
                <div className="space-y-2">{pending.map(apptRow)}</div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {t('done')||'Done'} ({done.length})
                </p>
                <div className="space-y-2">{done.map(apptRow)}</div>
              </div>
            )}
          </div>
        )
      )}

      {/* Modals */}
      {showForm && (
        <VetAppointmentFormModal
          appointment={editTarget}
          onSave={() => { setShowForm(false); setEditTarget(null); load(); toast.success('Appointment saved') }}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {showSessionForm && sessionAppt && (
        <VetSessionFormModal
          preselectedPatient={sessionAppt.patient}
          onSave={async () => {
            setShowSessionForm(false)
            try { await window.api.vet?.appointments.update(sessionAppt.id, { status: 'completed' }) } catch {}
            setSessionAppt(null)
            load()
            toast.success('Session started')
          }}
          onClose={() => { setShowSessionForm(false); setSessionAppt(null) }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="font-semibold text-slate-900 dark:text-white mb-1">{t('vetDeleteAppointment')||'Delete Appointment?'}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {new Date(deleteTarget.appointmentDate).toLocaleString()} — {deleteTarget.patient?.name}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl">{t('cancel')||'Cancel'}</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (t('vetDeleteConfirm')||'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}