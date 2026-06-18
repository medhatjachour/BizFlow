import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Loader2, Pencil, Trash2, Eye, Info, Wallet, X, Tag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@renderer/contexts/ToastContext'
import VetSessionFormModal from './VetSessionFormModal'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import VetPeriodFilter, { rangeForPreset } from './VetPeriodFilter'
import { VISIT_TYPE_COLORS, visitTypeLabel, useVisitTypes } from './visitTypes'
import VetVisitTypesManager from './VetVisitTypesManager'

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

const SESSION_PAY_COLOR: Record<string, string> = {
  paid:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unpaid:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  waived:  'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

// ── Session row with payment status + inline settle ───────────────────────────
function SessionRow({ s, onUpdated, onView, onEdit, onDelete, typeHex }: {
  s: any; onUpdated: (u: any) => void
  onView: () => void; onEdit: () => void; onDelete: () => void
  typeHex?: string
}) {
  const { t } = useLanguage()
  const toast = useToast()
  const [paying, setPaying] = useState(false)
  const [payAmt, setPayAmt] = useState('')
  const [busy, setBusy] = useState(false)

  const charged = Number(s.amountCharged) || 0
  const paid = Number(s.amountPaid) || 0
  const outstanding = Math.max(0, charged - paid)
  const status: string = s.paymentStatus ?? (charged <= 0 ? 'unpaid' : outstanding <= 0.005 ? 'paid' : paid > 0 ? 'partial' : 'unpaid')
  const canPay = status !== 'waived' && outstanding > 0.005

  async function pay(full: boolean) {
    const amt = full ? undefined : parseFloat(payAmt)
    if (!full && (isNaN(amt as number) || (amt as number) <= 0)) { toast.error(t('vetEnterValidAmount') || 'Enter a valid amount'); return }
    setBusy(true)
    try {
      const updated = await window.api.vet?.sessions.settlePayment(s.id, full ? { payFull: true } : { amount: amt })
      toast.success(t('vetPaymentRecorded') || 'Payment recorded')
      setPaying(false); setPayAmt('')
      if (updated) onUpdated(updated)
    } catch (e: any) { toast.error(e?.message ?? 'Failed to record payment') }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${typeHex ? '' : (VISIT_TYPE_COLORS[s.visitType] ?? 'bg-slate-100 text-slate-600')}`}
            style={typeHex ? { backgroundColor: typeHex + '22', color: typeHex } : undefined}>
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
          {charged > 0 && (
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">${charged.toFixed(2)}</p>
              {outstanding > 0.005 && <p className="text-[10px] text-red-500">−${outstanding.toFixed(2)} {t('vetDue') || 'due'}</p>}
            </div>
          )}
          {charged > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${SESSION_PAY_COLOR[status] ?? SESSION_PAY_COLOR.unpaid}`}>{status}</span>
          )}
          {canPay && !paying && (
            <button onClick={() => setPaying(true)} title={t('vetRecordPayment') || 'Record payment'}
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 transition-colors flex items-center gap-1">
              <Wallet className="h-3 w-3" /> {t('vetPay') || 'Pay'}
            </button>
          )}
          <button onClick={onView}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {paying && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('vetOutstanding') || 'Outstanding'}: <span className="font-bold text-red-500">${outstanding.toFixed(2)}</span></span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
            <input type="number" min="0" max={outstanding} step="any" placeholder={outstanding.toFixed(2)}
              value={payAmt} onChange={e => setPayAmt(e.target.value)} autoFocus
              className="w-28 pl-5 pr-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
          <button onClick={() => pay(false)} disabled={busy}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 hover:bg-violet-200 disabled:opacity-50 transition-colors">
            {busy ? '…' : (t('vetPayAmount') || 'Pay amount')}
          </button>
          <button onClick={() => pay(true)} disabled={busy}
            className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {busy ? '…' : (t('vetPayAll') || 'Pay all')}
          </button>
          <button onClick={() => { setPaying(false); setPayAmt('') }} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  )
}

export default function VetSessionsTab() {
  const toast = useToast()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const [sessions, setSessions] = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [range,    setRange]    = useState<{ from?: string; to?: string }>(() => rangeForPreset('today'))
  const [page,     setPage]     = useState(0)

  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTypeMgr, setShowTypeMgr] = useState(false)
  const { hexColor, reload: reloadVisitTypes } = useVisitTypes()

  const PAGE_SIZE = 50

  const load = useCallback(async (reset = false, explicitPage?: number) => {
    setLoading(true)
    try {
      const currentPage = reset ? 0 : (explicitPage ?? page)
      if (reset) setPage(0)
      const result = await window.api.vet?.sessions.getRecent({
        startDate: range.from ? range.from + 'T00:00:00.000' : undefined,
        endDate:   range.to   ? range.to   + 'T23:59:59.999' : undefined,
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
  }, [range.from, range.to, page])

  useEffect(() => { load(true) }, [range.from, range.to])

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
        <VetPeriodFilter defaultPreset="today" onChange={r => { setRange({ from: r.from, to: r.to }); setPage(0) }} />
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTypeMgr(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
            <Tag className="h-4 w-4" /> {t('vetVisitTypes') || 'Visit Types'}
          </button>
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
            <SessionRow key={s.id} s={s} typeHex={hexColor(s.visitType)}
              onUpdated={(u) => setSessions(prev => prev.map(x => x.id === u.id ? { ...x, ...u } : x))}
              onView={() => s.patient && navigate(`/vet/patients/${s.patient.id}`)}
              onEdit={() => { setEditTarget(s); setShowForm(true) }}
              onDelete={() => setDeleteTarget(s)} />
          ))}
          {sessions.length < total && (
            <div className="flex justify-center pt-4">
              <button onClick={() => { const next = page + 1; setPage(next); load(false, next) }} disabled={loading}
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

      {showTypeMgr && (
        <VetVisitTypesManager onClose={() => setShowTypeMgr(false)} onChanged={reloadVisitTypes} />
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
