import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock, CheckCircle2, Calendar, RefreshCw,
  AlertTriangle, Clock, Users, Filter, Phone
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import AppointmentFormModal from './AppointmentFormModal'

interface FollowUp {
  id: string
  patientId: string
  patient: { id: string; name: string; phone: string }
  followUpDate: string
  chiefComplaint: string
  diagnosis?: string | null
  visitDate: string
  doctorName?: string | null
}

type Filter = 'all' | 'today' | 'overdue' | 'upcoming'

function daysDiff(dateStr: string): number {
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function StatusBadge({ diff }: { diff: number }) {
  if (diff === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <Clock size={10} /> Due today
    </span>
  )
  if (diff < 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <AlertTriangle size={10} /> {Math.abs(diff)}d overdue
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
      <CalendarClock size={10} /> in {diff}d
    </span>
  )
}

export default function FollowUpsTab() {
  const toast = useToast()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<Filter>('all')
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [clearingId, setClearingId] = useState<string | null>(null)
  const [bookingFor, setBookingFor] = useState<FollowUp | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.clinic.appointments.getAllFollowUps({ filter })
      setFollowUps(data ?? [])
    } catch {
      toast.error('Failed to load follow-ups')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleMarkDone(fu: FollowUp) {
    setClearingId(fu.id)
    try {
      await window.api.clinic.appointments.clearFollowUp(fu.id)
      toast.success(`Follow-up for ${fu.patient.name} marked as done`)
      setFollowUps(prev => prev.filter(f => f.id !== fu.id))
    } catch {
      toast.error('Failed to clear follow-up')
    } finally {
      setClearingId(null)
    }
  }

  // Summary counts (from current loaded list)
  const todayCount    = followUps.filter(f => daysDiff(f.followUpDate) === 0).length
  const overdueCount  = followUps.filter(f => daysDiff(f.followUpDate) < 0).length
  const upcomingCount = followUps.filter(f => daysDiff(f.followUpDate) > 0).length

  const FILTER_TABS: { key: Filter; label: string; color: string }[] = [
    { key: 'all',      label: `All (${followUps.length})`,       color: 'text-slate-600 dark:text-slate-300' },
    { key: 'today',    label: `Due Today (${todayCount})`,        color: 'text-amber-600 dark:text-amber-400' },
    { key: 'overdue',  label: `Overdue (${overdueCount})`,        color: 'text-red-600 dark:text-red-400' },
    { key: 'upcoming', label: `Upcoming (${upcomingCount})`,      color: 'text-teal-600 dark:text-teal-400' },
  ]

  return (
    <div className="flex flex-col h-full gap-4">

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Follow-up Reminders</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">— sessions where a follow-up date was set by the doctor</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">Overdue</p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todayCount}</p>
            <p className="text-xs text-amber-500 dark:text-amber-400 font-medium">Due Today</p>
          </div>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/40 rounded-xl p-3 flex items-center gap-3">
          <Users className="h-8 w-8 text-teal-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{upcomingCount}</p>
            <p className="text-xs text-teal-500 dark:text-teal-400 font-medium">Upcoming</p>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              filter === tab.key
                ? `border-current ${tab.color}`
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── List ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : followUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <CalendarClock size={32} className="opacity-30" />
            <p className="text-sm">No follow-ups in this category</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {followUps.map(fu => {
              const diff = daysDiff(fu.followUpDate)
              const isClearing = clearingId === fu.id
              const rowBg = diff < 0
                ? 'border-red-200 dark:border-red-800/30 bg-red-50/40 dark:bg-red-900/10'
                : diff === 0
                  ? 'border-amber-200 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-900/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'

              return (
                <div
                  key={fu.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${rowBg}`}
                >
                  {/* Date block */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200 leading-none">
                      {new Date(fu.followUpDate).toLocaleDateString('en', { day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                      {new Date(fu.followUpDate).toLocaleDateString('en', { month: 'short' })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(fu.followUpDate).getFullYear()}
                    </p>
                  </div>

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/clinic/patients/${fu.patientId}`)}
                        className="text-sm font-semibold text-slate-800 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 hover:underline"
                      >
                        {fu.patient.name}
                      </button>
                      <StatusBadge diff={diff} />
                    </div>
                    {(fu.diagnosis || fu.chiefComplaint) && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {fu.diagnosis || fu.chiefComplaint}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      {fu.patient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={9} /> {fu.patient.phone}
                        </span>
                      )}
                      {fu.doctorName && (
                        <span>Dr. {fu.doctorName}</span>
                      )}
                      <span>
                        Session: {new Date(fu.visitDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setBookingFor(fu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                      <Calendar size={11} /> Book Appt
                    </button>
                    <button
                      onClick={() => handleMarkDone(fu)}
                      disabled={isClearing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors"
                    >
                      {isClearing
                        ? <RefreshCw size={11} className="animate-spin" />
                        : <CheckCircle2 size={11} />
                      }
                      Done
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Book Appointment Modal ─────────────────────────────────────── */}
      {bookingFor && (
        <AppointmentFormModal
          defaultPatientId={bookingFor.patientId}
          defaultPatientName={bookingFor.patient.name}
          onClose={() => setBookingFor(null)}
          onSaved={() => {
            setBookingFor(null)
            toast.success('Appointment booked')
          }}
        />
      )}
    </div>
  )
}
