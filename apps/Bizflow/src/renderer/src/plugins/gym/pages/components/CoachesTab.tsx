import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Loader2, ChevronLeft, ChevronRight, Pencil, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import CoachFormModal from './CoachFormModal'
import CoachProfileModal from './CoachProfileModal'

const PAGE_SIZE = 20

export default function CoachesTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const [coaches, setCoaches] = useState<any[]>([])
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
      const res = await (window.api as any).gym?.coaches?.getAll({ search: q, skip: pg * PAGE_SIZE, take: PAGE_SIZE })
      setCoaches(Array.isArray(res) ? res : res?.data ?? [])
      setTotal(res?.total ?? 0)
    } catch (err: any) { toast.error(err.message ?? 'Failed to load coaches') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load(page, search) }, [page, search])

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(0); setSearch(searchInput) }
  function openAdd() { setEditTarget(null); setFormOpen(true) }
  function openEdit(c: any, ev: React.MouseEvent) { ev.stopPropagation(); setEditTarget(c); setFormOpen(true) }
  function handleSaved(c: any) {
    if (editTarget) setCoaches(cs => cs.map(x => x.id === c.id ? c : x))
    else load(0, search)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 min-w-[200px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder={t('gymSearchCoaches')}
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{t('gymSearch')}</button>
        </form>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap">
          <Plus size={14} /> {t('gymAddCoach')}
        </button>
      </div>

      {!loading && <p className="text-xs text-slate-400">{total} coach{total !== 1 ? 'es' : ''}</p>}

      {loading && coaches.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : coaches.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="text-4xl mb-3">🧑‍🏫</span>
          <p className="text-sm font-medium">{search ? t('gymNoCoachesMatch') : t('gymNoCoaches')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coaches.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800/40 transition-all"
                onClick={() => setProfileTarget(c)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-600">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.specialty ?? 'General'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {c.isActive
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <XCircle size={14} className="text-slate-400" />}
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.email && <p>✉️ {c.email}</p>}
                  {c.salary != null && <p>💵 {c.salary.toLocaleString()} / {c.salaryType?.replace('_', ' ')}</p>}
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                  <button onClick={(e) => openEdit(c, e)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-600 transition-colors">
                    <Pencil size={11} /> {t('gymEdit')}
                  </button>
                </div>
              </div>
            ))}
          </div>
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

      <CoachFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaved} initial={editTarget} />
      {profileTarget && <CoachProfileModal coach={profileTarget} onClose={() => setProfileTarget(null)} onEdited={c => { setCoaches(cs => cs.map(x => x.id === c.id ? c : x)); setProfileTarget(c) }} />}
    </div>
  )
}
