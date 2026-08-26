import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock, CheckCircle2, Calendar, RefreshCw,
  AlertTriangle, Clock, Users, Phone, Info, Loader2
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import VetAppointmentFormModal from '../components/appointments/VetAppointmentFormModal'

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇',
  reptile: '🦎', fish: '🐠', other: '🐾'
}

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

function FollowUpHelp() {
  const [tipPos, setTipPos] = useState<{ top: number; right: number } | null>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  return (
    <span ref={tipRef} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { if (tipRef.current) { const r = tipRef.current.getBoundingClientRect(); setTipPos({ top: r.top, right: window.innerWidth - r.right }) } }}
      onMouseLeave={() => setTipPos(null)}>
      <Info size={13} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {tipPos && createPortal(
        <div style={{ position: 'fixed', top: tipPos.top, right: tipPos.right, transform: 'translateY(-100%) translateY(-8px)', zIndex: 9999 }}
          className="w-60 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl">
          <span className="block font-semibold text-violet-400 mb-1.5">Button guide</span>
          <span className="block mb-1"><span className="text-violet-300 font-medium">Book Appt</span> — Creates an appointment on the calendar. Reminder disappears once booked.</span>
          <span className="block"><span className="text-emerald-300 font-medium">Done</span> — Dismisses the reminder without scheduling.</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>,
        document.body
      )}
    </span>
  )
}

type FilterKey = 'all' | 'today' | 'overdue' | 'upcoming'

export default function VetFollowUpsTab() {
  const toast    = useToast()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const PAGE_SIZE = 10

  const [allFollowUps, setAllFollowUps] = useState<any[]>([])
  const [filter,       setFilter]       = useState<FilterKey>('today')
  const [page,         setPage]         = useState(1)
  const [loading,      setLoading]      = useState(true)
  const [clearingId,   setClearingId]   = useState<string | null>(null)
  const [bookingFor,   setBookingFor]   = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Load a wide window: past 30 days to next 90 days
      const from = new Date(Date.now() - 30 * 86_400_000).toISOString()
      const to   = new Date(Date.now() + 90 * 86_400_000).toISOString()
      const result = await window.api.vet?.sessions.getFollowUps({ from, to, skip: 0, take: 500 })
      setAllFollowUps(result?.data ?? [])
    } catch {
      toast.error('Failed to load follow-ups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleMarkDone(session: any) {
    setClearingId(session.id)
    try {
      await window.api.vet?.sessions.update(session.id, { followUpDate: null })
      toast.success(`Follow-up for ${session.patient?.name} marked as done`)
      setAllFollowUps(prev => prev.filter(f => f.id !== session.id))
    } catch {
      toast.error('Failed to clear follow-up')
    } finally {
      setClearingId(null)
    }
  }

  const todayCount    = allFollowUps.filter(f => daysDiff(f.followUpDate) === 0).length
  const overdueCount  = allFollowUps.filter(f => daysDiff(f.followUpDate) < 0).length
  const upcomingCount = allFollowUps.filter(f => daysDiff(f.followUpDate) > 0).length

  const filtered = allFollowUps.filter(f => {
    const diff = daysDiff(f.followUpDate)
    if (filter === 'today')    return diff === 0
    if (filter === 'overdue')  return diff < 0
    if (filter === 'upcoming') return diff > 0
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const FILTER_TABS: { key: FilterKey; label: string; color: string }[] = [
    { key: 'all',      label: `${t('vetFilterAll')||'All'} (${allFollowUps.length})`,          color: 'text-slate-600 dark:text-slate-300' },
    { key: 'today',    label: `${t('vetFilterToday')||'Due Today'} (${todayCount})`,           color: 'text-amber-600 dark:text-amber-400' },
    { key: 'overdue',  label: `${t('overdue')||'Overdue'} (${overdueCount})`,                 color: 'text-red-600 dark:text-red-400' },
    { key: 'upcoming', label: `${t('upcoming')||'Upcoming'} (${upcomingCount})`,              color: 'text-teal-600 dark:text-teal-400' },
  ]

  return (
    <div className="flex flex-col h-full gap-4 p-6">

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{t('vetFollowUpReminders')||'Follow-up Reminders'}</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('vetFollowUpSubtitle')||'— sessions where a follow-up date was set'}</span>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {t('vetRefresh')||'Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-3 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">{t('overdue')||'Overdue'}</p>
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{todayCount}</p>
            <p className="text-xs text-amber-500 dark:text-amber-400 font-medium">{t('vetFilterToday')||'Due Today'}</p>
          </div>
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/40 rounded-xl p-3 flex items-center gap-3">
          <Users className="h-8 w-8 text-teal-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{upcomingCount}</p>
            <p className="text-xs text-teal-500 dark:text-teal-400 font-medium">{t('upcoming')||'Upcoming'}</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1) }}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${
              filter === tab.key
                ? `border-current ${tab.color}`
                : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <CalendarClock size={32} className="opacity-30" />
            <p className="text-sm">{t('noFollowUps')||'No follow-ups in this category'}</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {paginated.map(fu => {
              const diff      = daysDiff(fu.followUpDate)
              const isClearing = clearingId === fu.id
              const rowBg = diff < 0
                ? 'border-red-200 dark:border-red-800/30 bg-red-50/40 dark:bg-red-900/10'
                : diff === 0
                  ? 'border-amber-200 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-900/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'

              return (
                <div key={fu.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${rowBg}`}>
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

                  {/* Pet + owner info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{SPECIES_EMOJI[fu.patient?.species ?? ''] ?? '🐾'}</span>
                      <button
                        onClick={() => fu.patient && navigate(`/vet/patients/${fu.patient.id}`)}
                        className="text-sm font-semibold text-slate-800 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
                      >
                        {fu.patient?.name ?? '—'}
                      </button>
                      <StatusBadge diff={diff} />
                    </div>
                    {fu.chiefComplaint && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{fu.chiefComplaint}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      {fu.patient?.owner && (
                        <span className="flex items-center gap-1">
                          <Phone size={9} /> {fu.patient.owner.name} · {fu.patient.owner.phone}
                        </span>
                      )}
                      {fu.vetName && <span>Dr. {fu.vetName}</span>}
                      <span>Last visit: {new Date(fu.visitDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setBookingFor(fu)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors shadow-sm"
                      title="Schedule a formal appointment from this follow-up reminder."
                    >
                      <Calendar size={11} /> Book Appt
                    </button>
                    <button
                      onClick={() => handleMarkDone(fu)}
                      disabled={isClearing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors"
                      title="Dismiss this reminder without scheduling."
                    >
                      {isClearing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Done
                    </button>
                    <FollowUpHelp />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <p className="text-xs text-slate-400">
            {t('vetPageLabel')||'Page'} <span className="font-semibold text-slate-600 dark:text-slate-300">{page}</span> {t('vetOfLabel')||'of'} <span className="font-semibold text-slate-600 dark:text-slate-300">{totalPages}</span>
            {' '}·{' '}{filtered.length} {t('vetRecordsLabel')||'records'}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ‹ {t('vetPrevLabel')||'Prev'}
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const n = start + i
              if (n > totalPages) return null
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                    n === page
                      ? 'bg-violet-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}>
                  {n}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {t('vetNextLabel')||'Next'} ›
            </button>
          </div>
        </div>
      )}

      {/* Book appointment modal */}
      {bookingFor && (
        <VetAppointmentFormModal
          preselectedPatient={bookingFor.patient}
          onSave={async () => {
            const scheduled = bookingFor
            setBookingFor(null)
            toast.success('Appointment booked')
            try {
              await window.api.vet?.sessions.update(scheduled.id, { followUpDate: null })
              setAllFollowUps(prev => prev.filter(f => f.id !== scheduled.id))
            } catch {}
          }}
          onClose={() => setBookingFor(null)}
        />
      )}
    </div>
  )
}