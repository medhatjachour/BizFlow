import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Loader2, Lock, Unlock, Pencil, X, User, Calendar } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

const ZONES = ['all', 'general', 'men', 'women', 'vip'] as const
type Zone = typeof ZONES[number]

const zoneBadge: Record<string, string> = {
  general: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  men:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  women:   'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  vip:     'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1'
const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'

/* ─── Add / Edit Locker Modal ─── */
function LockerFormModal({ initial, onClose, onSaved }: { initial?: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [form, setForm] = useState({ number: initial?.number ?? '', zone: initial?.zone ?? 'general', notes: initial?.notes ?? '' })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.number.trim()) return
    setSaving(true)
    try {
      if (initial) {
        await (window.api.gym as any)?.lockers.update({ id: initial.id, data: { zone: form.zone, notes: form.notes.trim() || undefined } })
        toast.success('Locker updated')
      } else {
        await (window.api.gym as any)?.lockers.create({ number: form.number.trim(), zone: form.zone, notes: form.notes.trim() || undefined })
        toast.success('Locker added')
      }
      onSaved()
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-orange-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{initial ? t('gymEditLocker') : t('gymAddLocker')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymLockerNumber')}</label>
              <input className={inputCls} value={form.number} onChange={set('number')} placeholder="e.g. A-01" required disabled={Boolean(initial)} />
            </div>
            <div>
              <label className={labelCls}>{t('gymLockerZone')}</label>
              <select className={inputCls} value={form.zone} onChange={set('zone')}>
                {['general', 'men', 'women', 'vip'].map(z => (
                  <option key={z} value={z}>{z === 'general' ? t('gymZoneGeneral') : z === 'men' ? t('gymZoneMen') : z === 'women' ? t('gymZoneWomen') : t('gymZoneVip')}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('gymNotes')}</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} placeholder={t('gymLockerNotes')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('gymCancel')}</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {saving ? t('gymLoggingIn') : initial ? t('gymSave') : t('gymAddLocker')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Assign Member Modal ─── */
function AssignModal({ locker, onClose, onSaved }: { locker: any; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await (window.api.gym as any)?.trainees.searchLite(search).catch(() => [])
      setResults(res ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      await (window.api.gym as any)?.lockers.assign({ lockerId: locker.id, traineeId: selected.id, endDate: endDate || undefined, notes: notes.trim() || undefined })
      toast.success(`Locker ${locker.number} assigned to ${selected.name}`)
      onSaved()
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <User size={16} className="text-orange-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('gymAssignMember')}</h3>
              <p className="text-xs text-slate-500">Locker <span className="font-semibold">{locker.number}</span> · <span className="capitalize">{locker.zone}</span> zone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Member *</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} placeholder={t('gymSearchMemberAssign')} value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null) }} />
            </div>
            {results.length > 0 && !selected && (
              <div className="mt-1 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden shadow-lg">
                {results.map(m => (
                  <button key={m.id} type="button" onClick={() => { setSelected(m); setSearch(m.name); setResults([]) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors">
                    <span className="font-medium text-slate-900 dark:text-white">{m.name}</span>
                    {m.phone && <span className="text-slate-400 ml-2 text-xs">{m.phone}</span>}
                  </button>
                ))}
              </div>
            )}
            {selected && (
              <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{selected.name.charAt(0)}</div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{selected.name}</span>
                {selected.phone && <span className="text-xs text-slate-400">{selected.phone}</span>}
                <button type="button" onClick={() => { setSelected(null); setSearch('') }} className="ml-auto p-1 text-slate-400 hover:text-red-500 rounded transition-colors"><X size={12} /></button>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>{t('gymEndDate')}</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" className={`${inputCls} pl-9`} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t('gymNotes')}</label>
            <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Combination given, key tag #5…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('gymCancel')}</button>
            <button type="submit" disabled={saving || !selected} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
              {saving ? t('gymLoggingIn') : t('gymAssign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Main component ─── */
export default function LockersTab() {
  const toast = useToast()
  const { t } = useLanguage()
  const [lockers, setLockers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [zone, setZone] = useState<Zone>('all')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [assignTarget, setAssignTarget] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLockers(await (window.api.gym as any)?.lockers.getAll() ?? [])
    } catch (e: any) { toast.error(e.message ?? 'Failed to load lockers') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUnassign(lockerId: string, memberName: string) {
    try {
      await (window.api.gym as any)?.lockers.unassign(lockerId)
      toast.success(`Locker freed from ${memberName}`)
      load()
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  async function handleDelete(id: string) {
    try {
      await (window.api.gym as any)?.lockers.delete(id)
      toast.success('Locker deleted')
      load()
    } catch (e: any) { toast.error(e.message ?? 'Failed') }
  }

  const filtered = lockers
    .filter(l => zone === 'all' || l.zone === zone)
    .filter(l => !search.trim() ||
      l.number.toLowerCase().includes(search.toLowerCase()) ||
      l.assignments?.[0]?.trainee?.name?.toLowerCase().includes(search.toLowerCase()))

  const occupied = lockers.filter(l => l.assignments?.length > 0).length

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('gymTotal'),    value: lockers.length,            color: 'text-slate-700 dark:text-slate-200',         bg: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700' },
          { label: t('gymOccupied'),  value: occupied,                   color: 'text-red-600 dark:text-red-400',             bg: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40' },
          { label: t('gymAvailable'), value: lockers.length - occupied,  color: 'text-emerald-600 dark:text-emerald-400',     bg: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl p-4 text-center ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Search locker or member name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap">
          <Plus size={14} /> {t('gymAddLocker')}
        </button>
      </div>

      {/* Zone tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {ZONES.map(z => (
          <button key={z} onClick={() => setZone(z)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              zone === z
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-orange-300 dark:hover:border-orange-700'
            }`}>
            {z === 'all' ? t('gymZoneAll') : z === 'general' ? t('gymZoneGeneral') : z === 'men' ? t('gymZoneMen') : z === 'women' ? t('gymZoneWomen') : t('gymZoneVip')}
          </button>
        ))}
      </div>

      {!loading && <p className="text-xs text-slate-400">{filtered.length} locker{filtered.length !== 1 ? 's' : ''}</p>}

      {/* Content */}
      {loading && lockers.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-orange-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="text-4xl mb-3">🔒</span>
          <p className="text-sm font-medium">{lockers.length === 0 ? t('gymNoLockers') : t('gymNoLockersMatch')}</p>
          {lockers.length === 0 && <p className="text-xs mt-1">Click "Add Locker" to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(locker => {
            const assignment = locker.assignments?.[0]
            const isOccupied = Boolean(assignment)
            return (
              <div key={locker.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border p-4 transition-all ${
                  isOccupied
                    ? 'border-red-200 dark:border-red-800/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800/40 hover:shadow-md'
                }`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isOccupied ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                      {isOccupied
                        ? <Lock size={15} className="text-red-500" />
                        : <Unlock size={15} className="text-emerald-500" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{locker.number}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${zoneBadge[locker.zone] ?? zoneBadge.general}`}>{locker.zone}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isOccupied ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                    {isOccupied ? t('gymOccupied') : t('gymAvailable')}
                  </span>
                </div>

                {/* Info */}
                {isOccupied ? (
                  <div className="space-y-1 mb-3 text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{assignment.trainee?.name ?? '—'}</p>
                    {assignment.trainee?.phone && <p>📞 {assignment.trainee.phone}</p>}
                    {assignment.endDate && <p>📅 Until {new Date(assignment.endDate).toLocaleDateString()}</p>}
                    {assignment.notes && <p className="italic">{assignment.notes}</p>}
                  </div>
                ) : (
                  <div className="mb-3 min-h-[36px]">
                    <p className="text-xs text-slate-400 italic">{locker.notes || 'Available for assignment'}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-700">
                  {isOccupied ? (
                    <button onClick={() => handleUnassign(locker.id, assignment.trainee?.name ?? 'member')}
                      className="flex-1 py-1.5 text-xs font-medium text-red-600 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      {t('gymUnassign')}
                    </button>
                  ) : (
                    <button onClick={() => setAssignTarget(locker)}
                      className="flex-1 py-1.5 text-xs font-medium text-orange-600 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                      {t('gymAssignMember')}
                    </button>
                  )}
                  <button onClick={() => setEditTarget(locker)} title="Edit"
                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(locker.id)} title="Delete"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <X size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {addOpen    && <LockerFormModal                  onClose={() => setAddOpen(false)}      onSaved={() => { setAddOpen(false);      load() }} />}
      {editTarget && <LockerFormModal initial={editTarget} onClose={() => setEditTarget(null)}  onSaved={() => { setEditTarget(null);   load() }} />}
      {assignTarget && <AssignModal locker={assignTarget} onClose={() => setAssignTarget(null)} onSaved={() => { setAssignTarget(null); load() }} />}
    </div>
  )
}
