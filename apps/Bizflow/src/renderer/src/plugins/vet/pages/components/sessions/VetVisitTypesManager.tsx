import { useState, useEffect } from 'react'
import { X, Plus, Loader2, Pencil, Trash2, Check, Tag } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { visitTypeLabel, type VisitType } from './visitTypes'

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]'

const SWATCHES = ['#6366f1', '#06b6d4', '#0ea5e9', '#3b82f6', '#14b8a6', '#84cc16', '#f59e0b', '#ef4444', '#f97316', '#a855f7', '#10b981', '#ec4899', '#64748b']

function vt() { return (window as any).api?.vet?.visitTypes }

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SWATCHES.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full transition-transform ${value === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
          style={{ backgroundColor: c }} aria-label={c}>
          {value === c && <Check size={13} className="text-white mx-auto" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

export default function VetVisitTypesManager({ onClose, onChanged }: { onClose: () => void; onChanged?: () => void }) {
  const { t } = useLanguage()
  const toast = useToast()
  const [types, setTypes] = useState<VisitType[]>([])
  const [loading, setLoading] = useState(true)

  // add form
  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCHES[0])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(SWATCHES[0])

  // delete
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; count: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try { setTypes(await vt()?.getAll() ?? []) }
    catch { toast.error(t('vetFailedLoadVisitTypes') || 'Failed to load visit types') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function notify() { onChanged?.() }

  async function add() {
    const v = name.trim()
    if (!v) { setError(t('vetVisitTypeNameRequired') || 'Name is required'); return }
    setSaving(true)
    try {
      await vt()?.create({ name: v, color })
      setName(''); setColor(SWATCHES[0]); setError('')
      await load(); notify()
    } catch (err: any) { setError(err?.message ?? 'Failed to add') }
    finally { setSaving(false) }
  }

  function startEdit(it: VisitType) { setEditId(it.id); setEditName(visitTypeLabel(it.name)); setEditColor(it.color) }

  async function saveEdit(id: string) {
    try {
      await vt()?.update(id, { name: editName.trim(), color: editColor })
      setEditId(null); await load(); notify()
    } catch (err: any) { toast.error(err?.message ?? 'Failed to update') }
  }

  async function askDelete(it: VisitType) {
    try {
      const res = await vt()?.getUsageCount(it.name)
      setConfirmDelete({ id: it.id, name: it.name, count: res?.count ?? 0 })
    } catch { setConfirmDelete({ id: it.id, name: it.name, count: 0 }) }
  }

  async function doDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await vt()?.delete(confirmDelete.id)
      toast.success(t('vetVisitTypeDeleted') || 'Visit type deleted')
      setConfirmDelete(null); await load(); notify()
    } catch (err: any) { toast.error(err?.message ?? 'Failed to delete') }
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[88vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-violet-500" />
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{t('vetManageVisitTypes') || 'Manage Visit Types'}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{types.length} {types.length === 1 ? (t('vetType') || 'type') : (t('vetTypes') || 'types')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Add new */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('vetAddVisitType') || 'Add Visit Type'}</label>
          <div className="flex gap-2">
            <input value={name} onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
              placeholder={t('vetVisitTypePlaceholder') || 'e.g. Sonar, Visit, Surgery'} className={inputCls + ' flex-1'} />
            <button onClick={add} disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {t('vetAdd') || 'Add'}
            </button>
          </div>
          <ColorPicker value={color} onChange={setColor} />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
          ) : types.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">{t('vetNoVisitTypesYet') || 'No visit types yet — add one above.'}</p>
          ) : types.map(it => (
            <div key={it.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              {editId === it.id ? (
                <div className="p-3 space-y-2.5">
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(it.id); if (e.key === 'Escape') setEditId(null) }}
                    className={inputCls} />
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">{t('vetCancel') || 'Cancel'}</button>
                    <button onClick={() => saveEdit(it.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg">{t('vetSave') || 'Save'}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 group">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: it.color }} />
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{visitTypeLabel(it.name)}</span>
                  {it.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">{t('vetDefault') || 'default'}</span>
                  )}
                  <button onClick={() => startEdit(it)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 opacity-0 group-hover:opacity-100 transition"><Pencil size={14} /></button>
                  <button onClick={() => askDelete(it)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">{t('vetDeleteVisitType') || 'Delete visit type?'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              {t('vetDeleteVisitTypeMsg') || 'Remove'} “{visitTypeLabel(confirmDelete.name)}” {t('vetFromPicker') || 'from the picker'}.
            </p>
            {confirmDelete.count > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                {confirmDelete.count} {t('vetSessionsKeepLabel') || 'session(s) use it — they keep their label, only the picker entry is removed.'}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">{t('vetCancel') || 'Cancel'}</button>
              <button onClick={doDelete} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 disabled:opacity-50">
                {deleting && <Loader2 size={14} className="animate-spin" />}{t('vetDelete') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
