import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, RefreshCcw, Snowflake, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import SubscriptionFormModal from './SubscriptionFormModal'

type Filter = 'all' | 'active' | 'expiring' | 'expired' | 'frozen' | 'cancelled'

function statusBadge(s: any) {
  const map: Record<string, string> = { active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', frozen: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', expired: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', cancelled: 'bg-slate-100 dark:bg-slate-700 text-slate-500' }
  return map[s] ?? map.expired
}

function progressColor(daysLeft: number, totalDays: number) {
  const pct = totalDays > 0 ? (daysLeft / totalDays) * 100 : 0
  if (pct <= 15) return 'bg-red-500'
  if (pct <= 30) return 'bg-amber-500'
  return 'bg-orange-500'
}

const PAGE_SIZE = 30

export default function SubscriptionsTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const [subs, setSubs] = useState<any[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [expiringSoonCount, setExpiringSoonCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [freezeTarget, setFreezeTarget] = useState<any | null>(null)
  const [freezeDays, setFreezeDays] = useState(7)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async (pg = 0, f = filter) => {
    setLoading(true)
    try {
      const res = await (window.api as any).gym?.subscriptions?.getAll({
        status: f === 'all' ? undefined : f === 'expiring' ? 'active' : f,
        skip: pg * PAGE_SIZE, take: PAGE_SIZE
      })
      let data: any[] = Array.isArray(res) ? res : res?.data ?? []

      // Client-side filter expiring (≤7 days)
      if (f === 'expiring') {
        data = data.filter((s: any) => {
          const dl = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000)
          return dl >= 0 && dl <= 7
        })
      }

      setSubs(data)

      // Count expiring
      const expRes = await (window.api as any).gym?.subscriptions?.getAll({ status: 'active', skip: 0, take: 500 })
      const expData: any[] = Array.isArray(expRes) ? expRes : expRes?.data ?? []
      setExpiringSoonCount(expData.filter((s: any) => {
        const dl = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000)
        return dl >= 0 && dl <= 7
      }).length)
    } catch (err: any) { toast.error(err.message ?? 'Failed to load') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { setPage(0); load(0, filter) }, [filter])

  async function handleFreeze() {
    if (!freezeTarget) return
    setActing(freezeTarget.id)
    try {
      await (window.api as any).gym?.subscriptions?.freeze(freezeTarget.id, { days: freezeDays, reason: 'Manual freeze' })
      toast.success(`Frozen for ${freezeDays} days`)
      setFreezeTarget(null)
      load(page, filter)
    } catch (err: any) { toast.error(err.message ?? 'Freeze failed') }
    finally { setActing(null) }
  }

  async function handleUnfreeze(id: string) {
    setActing(id)
    try {
      await (window.api as any).gym?.subscriptions?.unfreeze(id)
      toast.success('Subscription unfrozen')
      load(page, filter)
    } catch (err: any) { toast.error(err.message ?? 'Unfreeze failed') }
    finally { setActing(null) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await (window.api as any).gym?.subscriptions?.delete(deleteTarget.id)
      toast.success('Subscription deleted')
      setDeleteTarget(null)
      load(page, filter)
    } catch (err: any) { toast.error(err.message ?? 'Delete failed') }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all',       label: t('gymFilterAll') },
    { key: 'active',    label: t('gymFilterActive') },
    { key: 'expiring',  label: `${t('gymFilterExpiring')}${expiringSoonCount > 0 ? ` (${expiringSoonCount})` : ''}` },
    { key: 'frozen',    label: t('gymFilterFrozen') },
    { key: 'expired',   label: t('gymFilterExpired') },
    { key: 'cancelled', label: t('gymFilterCancelled') },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1">
          {filters.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === key ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'} ${key === 'expiring' && expiringSoonCount > 0 && filter !== key ? 'border border-amber-400' : ''}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(page, filter)} disabled={loading} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-medium rounded-xl transition-colors">
            <Plus size={14} /> {t('gymNewSubscription')}
          </button>
        </div>
      </div>

      {/* Expiring alert */}
      {expiringSoonCount > 0 && filter !== 'expiring' && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle size={13} />
          <span><strong>{expiringSoonCount}</strong> {t('gymExpiringSoonAlert')}</span>
          <button onClick={() => setFilter('expiring')} className="underline font-medium">{t('gymViewThem')}</button>
        </div>
      )}

      {loading && subs.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-sm">{t('gymNoSubscriptions')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(s => {
            const now = Date.now()
            const start = new Date(s.startDate).getTime()
            const end = new Date(s.endDate).getTime()
            const totalDays = Math.max(1, Math.ceil((end - start) / 86_400_000))
            const daysLeft = Math.ceil((end - now) / 86_400_000)
            const elapsed = totalDays - Math.max(0, daysLeft)
            const pct = Math.max(0, Math.min(100, (elapsed / totalDays) * 100))

            return (
              <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{s.trainee?.name ?? '—'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${statusBadge(s.status)}`}>{s.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-medium">{s.plan?.name ?? '—'}</span>
                      {s.coach && <span>👤 {s.coach.name}</span>}
                      <span>📅 {new Date(s.endDate).toLocaleDateString()}</span>
                      {s.status === 'active' && daysLeft >= 0 && <span className={daysLeft <= 7 ? 'text-amber-600 font-semibold' : ''}>{daysLeft}d left</span>}
                    </div>
                    {/* Progress bar */}
                    {(s.status === 'active' || s.status === 'expired') && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${progressColor(daysLeft, totalDays)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.status === 'active' && (
                      <button onClick={() => { setFreezeTarget(s); setFreezeDays(7) }}
                        disabled={acting === s.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        <Snowflake size={10} /> {t('gymFreeze')}
                      </button>
                    )}
                    {s.status === 'frozen' && (
                      <button onClick={() => handleUnfreeze(s.id)} disabled={acting === s.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
                        {acting === s.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />} {t('gymUnfreeze')}
                      </button>
                    )}
                    {(s.status === 'expired' || s.status === 'cancelled') && (
                      <button onClick={() => setFormOpen(true)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors">
                        {t('gymRenew')}
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Freeze modal */}
      {freezeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Snowflake size={18} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('gymFreezeSubscription')}</h3>
          </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {t('gymFreezeDesc')}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('gymFreezeDuration')}</label>
              <input type="number" min="1" max={freezeTarget.plan?.maxFreezeDays ?? 30} className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
                value={freezeDays} onChange={e => setFreezeDays(Number(e.target.value))} />
              {freezeTarget.plan?.maxFreezeDays > 0 && (
                <p className="text-[11px] text-slate-400 mt-1">{t('gymFreezeMax')}: {freezeTarget.plan.maxFreezeDays} {t('gymFreezeDaysFor')}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setFreezeTarget(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm">{t('gymCancel')}</button>
              <button onClick={handleFreeze} className="flex-1 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">{t('gymFreeze')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{t('gymDeleteSubscription')}</h3>
            <p className="text-xs text-slate-500 mb-4">{deleteTarget.trainee?.name} · {deleteTarget.plan?.name}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm">{t('gymCancel')}</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">{t('gymDelete')}</button>
            </div>
          </div>
        </div>
      )}

      <SubscriptionFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={() => load(0, filter)} />
    </div>
  )
}
