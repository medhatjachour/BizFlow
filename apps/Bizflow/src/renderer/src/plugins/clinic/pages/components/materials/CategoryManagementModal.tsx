import { useState, useEffect, useCallback } from 'react'
import { Tag, X, Loader2, GripVertical, Save, Pencil, Trash2, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Category } from './materialsTab.types'
import { COLOR_OPTIONS, categoryBadgeCls } from './materialsTab.shared'

export default function CategoryManagementModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('teal')
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('teal')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setCategories(await window.api.clinic.materialCategories.getAll()) } catch { showToast('error', t('errorLoadingData')) }
    finally { setLoading(false) }
  }, [showToast, t])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await window.api.clinic.materialCategories.create({ name: newName.trim(), color: newColor })
      setNewName(''); setNewColor('teal'); setAdding(false)
      showToast('success', t('createdSuccessfully'))
      load()
    } catch { showToast('error', t('errorSavingRecord')) }
    finally { setSaving(false) }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await window.api.clinic.materialCategories.update(id, { name: editName.trim(), color: editColor })
      setEditingId(null)
      showToast('success', t('updatedSuccessfully'))
      load()
    } catch { showToast('error', t('errorSavingRecord')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    try {
      await window.api.clinic.materialCategories.delete(id)
      showToast('success', t('deletedSuccessfully'))
      load()
    } catch { showToast('error', t('errorDeletingRecord')) }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('manageCategories') ?? 'Manage Categories'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
          ) : categories.length === 0 && !adding ? (
            <p className="text-center text-sm text-slate-400 py-6">{t('noCategories') ?? 'No categories yet'}</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                {editingId === cat.id ? (
                  <>
                    <input className={`${inputCls} flex-1`} value={editName} onChange={e => setEditName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleUpdate(cat.id); if (e.key === 'Escape') setEditingId(null) }} />
                    <select className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]" value={editColor} onChange={e => setEditColor(e.target.value)}>
                      {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <button onClick={() => handleUpdate(cat.id)} disabled={saving} className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700"><Save className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><X className="h-3.5 w-3.5" /></button>
                  </>
                ) : (
                  <>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryBadgeCls(cat.color)}`}>{cat.name}</span>
                    <span className="flex-1" />
                    <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color) }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                  </>
                )}
              </div>
            ))
          )}

          {adding && (
            <div className="flex items-center gap-2 p-2 rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
              <input className={`${inputCls} flex-1`} value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('categoryName') ?? 'Category name'} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }} />
              <select className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]" value={newColor} onChange={e => setNewColor(e.target.value)}>
                {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <button onClick={handleAdd} disabled={saving || !newName.trim()} className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}</button>
              <button onClick={() => { setAdding(false); setNewName('') }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => { setAdding(true); setNewName(''); setNewColor('teal') }}
            disabled={adding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t('addCategory') ?? 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  )
}
