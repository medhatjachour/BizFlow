import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Loader2, ChevronLeft, ChevronRight, QrCode, Pencil } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import TraineeFormModal from './TraineeFormModal'
import TraineeProfileModal from './TraineeProfileModal'

function subBadge(trainee: any) {
  const sub = trainee.subscriptions?.[0]
  if (!sub) return { label: 'No subscription', cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' }
  const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000)
  if (sub.status === 'frozen') return { label: '❄️ Frozen', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' }
  if (sub.status === 'cancelled') return { label: 'Cancelled', cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500' }
  if (sub.status === 'expired' || daysLeft < 0) return { label: 'Expired', cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' }
  if (daysLeft <= 7) return { label: `⚠️ ${daysLeft}d left`, cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
  return { label: `${daysLeft}d left`, cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' }
}

const PAGE_SIZE = 20

export default function TraineesTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const [trainees, setTrainees] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [profileTarget, setProfileTarget] = useState<any | null>(null)

  const load = useCallback(async (pg = page, q = search) => {
    setLoading(true)
    try {
      const res = await (window.api as any).gym?.trainees?.getAll({ search: q, skip: pg * PAGE_SIZE, take: PAGE_SIZE })
      setTrainees(Array.isArray(res) ? res : res?.data ?? [])
      setTotal(res?.total ?? 0)
    } catch (err: any) { toast.error(err.message ?? 'Failed to load trainees') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load(page, search) }, [page, search])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setSearch(searchInput)
  }

  function openAdd() { setEditTarget(null); setFormOpen(true) }
  function openEdit(t: any, ev: React.MouseEvent) {
    ev.stopPropagation()
    setEditTarget(t); setFormOpen(true)
  }
  function handleSaved(t: any) {
    if (editTarget) setTrainees(ts => ts.map(x => x.id === t.id ? t : x))
    else load(0, search)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 min-w-[200px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder={t('gymSearchTrainees')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{t('gymSearch')}</button>
        </form>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap">
          <Plus size={14} /> {t('gymAddTrainee')}
        </button>
      </div>

      {/* Total */}
      {!loading && <p className="text-xs text-slate-400">{total} trainee{total !== 1 ? 's' : ''}</p>}

      {loading && trainees.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : trainees.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="text-4xl mb-3">🏋️</span>
          <p className="text-sm font-medium">{search ? t('gymNoTraineesMatch') : t('gymNoTrainees')}</p>
          {!search && <p className="text-xs mt-1">{t('gymAddFirstMember')}</p>}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/60">
                <tr>
                  {[t('gymTraineeName'), t('gymTraineePhone'), t('gymTraineeEmail'), t('gymTraineeSubscription'), t('gymTraineeSessions'), ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {trainees.map(t => {
                  const badge = subBadge(t)
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-orange-50/30 dark:hover:bg-orange-900/10 cursor-pointer transition-colors"
                      onClick={() => setProfileTarget(t)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-orange-600">{t.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{t.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{t.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{t._count?.sessions ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => openEdit(t, e)} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setProfileTarget(t) }}
                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          >
                            <QrCode size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">{t('gymPage')} {page + 1} {t('gymPageOf')} {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <TraineeFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} initial={editTarget} />
      {profileTarget && <TraineeProfileModal trainee={profileTarget} onClose={() => setProfileTarget(null)} onEdited={(t) => { setTrainees(ts => ts.map(x => x.id === t.id ? t : x)); setProfileTarget(t) }} />}
    </div>
  )
}
