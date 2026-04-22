import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Trash2, RefreshCcw, Filter } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import WalkInFormModal from './WalkInFormModal'

type Period = 'today' | 'week' | 'month' | 'year'

const PAGE_SIZE = 50

export default function WalkInsTab() {
  const toast = useToast()
  const [sessions, setSessions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState<Period>('today')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const load = useCallback(async (pg = 0) => {
    setLoading(true)
    try {
      const res = await (window.api as any).gym?.sessions?.getAll({ period, type: typeFilter || undefined, skip: pg * PAGE_SIZE, take: PAGE_SIZE })
      setSessions(Array.isArray(res) ? res : res?.data ?? [])
      setTotal(res?.total ?? 0)
    } catch (err: any) { toast.error(err.message ?? 'Failed to load') }
    finally { setLoading(false) }
  }, [period, typeFilter])

  useEffect(() => { setPage(0); load(0) }, [period, typeFilter])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await (window.api as any).gym?.sessions?.delete(deleteTarget.id)
      toast.success('Session deleted')
      setDeleteTarget(null)
      load(page)
    } catch (err: any) { toast.error(err.message ?? 'Delete failed') }
  }

  const totalRevenue = sessions.reduce((s, x) => s + (x.amount ?? 0), 0)
  const hasMore = (page + 1) * PAGE_SIZE < total

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period */}
          <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 gap-0.5">
            {(['today','week','month','year'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {p}
              </button>
            ))}
          </div>
          {/* Type */}
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-slate-400" />
            <select
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="walkin">Walk-in</option>
              <option value="subscription_visit">Subscription</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(page)} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={14} /> Log Visit
          </button>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="flex gap-4 text-sm">
          <span className="text-slate-500">{total} session{total !== 1 ? 's' : ''}</span>
          {totalRevenue > 0 && <span className="text-orange-600 font-semibold">Revenue: {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>}
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="text-4xl mb-3">🚶</span>
          <p className="text-sm">No sessions {period === 'today' ? 'today' : `this ${period}`}</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/60">
                <tr>
                  {['Date','Member','Type','Coach','Amount','Method',''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {sessions.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(s.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">{s.trainee?.name ?? <span className="text-slate-400 italic">Anonymous</span>}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.type === 'walkin' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                        {s.type === 'walkin' ? '🚶 Walk-in' : '✅ Subscription'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{s.coach?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-orange-600 dark:text-orange-400 tabular-nums">
                      {s.amount > 0 ? s.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{s.amount > 0 ? s.paymentMethod : '—'}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <button onClick={() => { const next = page + 1; setPage(next); load(next) }} disabled={loading}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Delete this session?</h3>
            <p className="text-xs text-slate-500 mb-4">{deleteTarget.trainee?.name ?? 'Anonymous'} · {new Date(deleteTarget.date).toLocaleDateString()}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      <WalkInFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={() => load(0)} />
    </div>
  )
}
