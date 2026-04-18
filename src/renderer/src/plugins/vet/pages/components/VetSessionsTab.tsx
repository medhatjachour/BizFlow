import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Loader2, Pencil, Trash2, Eye, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@renderer/contexts/ToastContext'
import VetSessionFormModal from './VetSessionFormModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'

function SessionHelp() {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { if (ref.current) { const r = ref.current.getBoundingClientRect(); setPos({ top: r.top, right: window.innerWidth - r.right }) } }}
      onMouseLeave={() => setPos(null)}>
      <Info size={13} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos && createPortal(
        <div style={{ position:'fixed', top: pos.top, right: pos.right, transform:'translateY(-100%) translateY(-8px)', zIndex:9999 }}
          className="w-60 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl">
          <span className="block font-semibold text-violet-400 mb-1.5">Sessions</span>
          <span className="block mb-0.5">Each row is a completed vet visit with diagnosis, prescription and billing.</span>
          <span className="block mb-0.5"><span className="text-blue-300">Eye</span> — view the full patient profile and history.</span>
          <span className="block mb-0.5"><span className="text-blue-300">Pencil</span> — edit notes, charges or follow-up date.</span>
          <span className="block"><span className="text-red-300">Trash</span> — permanently remove this session record.</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>,
        document.body
      )}
    </span>
  )
}

type Filter = 'today' | 'week' | 'month' | 'all'

const VISIT_TYPE_COLORS: Record<string, string> = {
  wellness_exam: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  vaccination:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  surgery:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  emergency:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  follow_up:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  grooming:      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
}

function visitTypeLabel(t: string): string {
  const m: Record<string, string> = {
    wellness_exam: 'Wellness Exam', vaccination: 'Vaccination',
    surgery: 'Surgery', emergency: 'Emergency', follow_up: 'Follow-up', grooming: 'Grooming'
  }
  return m[t] ?? t
}

export default function VetSessionsTab() {
  const toast = useToast()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [sessions, setSessions] = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [filter,   setFilter]   = useState<Filter>('today')
  const [page,     setPage]     = useState(0)

  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const PAGE_SIZE = 50

  const load = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const currentPage = reset ? 0 : page
      if (reset) setPage(0)
      const result = await window.api.vet?.sessions.getRecent({
        filter: filter === 'all' ? undefined : filter,
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE
      })
      if (result) {
        setSessions(reset || currentPage === 0 ? result.data : prev => [...prev, ...result.data])
        setTotal(result.total)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { load(true) }, [filter])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await window.api.vet?.sessions.delete(deleteTarget.id)
      setDeleteTarget(null)
      load(true)
      toast.success('Session deleted')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['today', 'week', 'month', 'all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${filter === f ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {f === 'today' ? (t('vetFilterToday')||'Today') : f === 'week' ? (t('vetFilterWeek')||'Week') : f === 'month' ? (t('vetFilterMonth')||'Month') : (t('vetFilterAll')||'All')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg">
            <Plus className="h-4 w-4" /> {t('vetNewSession')||'New Session'}
          </button>
          <SessionHelp />
        </div>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">{t('noSessions')||'No sessions for this period'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${VISIT_TYPE_COLORS[s.visitType] ?? 'bg-slate-100 text-slate-600'}`}>
                  {visitTypeLabel(s.visitType)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {s.patient?.name ?? '—'} <span className="text-slate-400 text-xs capitalize">({s.patient?.species})</span>
                  </p>
                  <p className="text-xs text-slate-400">{new Date(s.visitDate).toLocaleString()}{s.vetName ? ` · Dr. ${s.vetName}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.amountCharged != null && (
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{Number(s.amountCharged).toFixed(2)}</span>
                )}
                <button onClick={() => s.patient && navigate(`/vet/patients/${s.patient.id}`)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <Eye className="h-4 w-4" />
                </button>
                <button onClick={() => { setEditTarget(s); setShowForm(true) }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(s)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
                <SessionHelp />
              </div>
            </div>
          ))}
          {sessions.length < total && (
            <div className="flex justify-center pt-4">
              <button onClick={() => { setPage(p => p + 1); load() }} disabled={loading}
                className="px-6 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `${t('vetLoadMore')||'Load more'} (${total - sessions.length} ${t('remaining')||'remaining'})`}
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <VetSessionFormModal
          session={editTarget}
          onSave={() => { setShowForm(false); setEditTarget(null); load(true); toast.success('Session saved') }}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="font-semibold text-slate-900 dark:text-white mb-2">{t('vetDeleteSession')||'Delete Session'}</p>
            <p className="text-sm text-slate-500 mb-6">{t('vetDeletePermanent')||'This action cannot be undone.'}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('cancel')||'Cancel'}</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (t('vetDeleteConfirm')||'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
