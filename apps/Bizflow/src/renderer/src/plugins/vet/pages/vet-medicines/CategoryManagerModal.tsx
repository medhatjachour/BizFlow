import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { inputCls } from './vetMedicines.shared'

export default function CategoryManagerModal({ onRefresh, onClose }: {
  onRefresh: () => void; onClose: () => void
}) {
  const { t } = useLanguage()
  const toast = useToast()
  const [categories, setCategories] = useState<{ id: string; name: string; color: string; isDefault: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; count: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function loadCats() {
    setLoading(true)
    try {
      const rows = await (window as any).api?.vet?.medicineCategories?.getAll()
      setCategories(rows ?? [])
    } catch { toast.error('Failed to load categories') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCats() }, [])

  async function add() {
    const v = input.trim().toLowerCase()
    if (!v) { setError(t('vetCategoryNameRequired') || 'Category name is required'); return }
    if (categories.some(c => c.name === v)) { setError(t('vetCategoryExists') || 'Category already exists'); return }
    try {
      await (window as any).api?.vet?.medicineCategories?.create({ name: v })
      setInput(''); setError('')
      await loadCats(); onRefresh()
    } catch (err: any) { setError(err?.message ?? 'Failed to add') }
  }

  async function startEdit(cat: { id: string; name: string }) {
    setEditingId(cat.id); setEditName(cat.name); setEditError('')
  }

  async function saveEdit(id: string) {
    const v = editName.trim().toLowerCase()
    if (!v) { setEditError('Name is required'); return }
    if (categories.some(c => c.name === v && c.id !== id)) { setEditError('Name already used'); return }
    try {
      await (window as any).api?.vet?.medicineCategories?.update(id, { name: v })
      setEditingId(null); setEditName(''); setEditError('')
      await loadCats(); onRefresh()
    } catch (err: any) { setEditError(err?.message ?? 'Failed to rename') }
  }

  async function askDelete(cat: { id: string; name: string }) {
    try {
      const res = await (window as any).api?.vet?.medicineCategories?.getUsageCount(cat.name)
      setConfirmDelete({ id: cat.id, name: cat.name, count: res?.count ?? 0 })
    } catch { setConfirmDelete({ id: cat.id, name: cat.name, count: 0 }) }
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await (window as any).api?.vet?.medicineCategories?.delete(confirmDelete.id)
      if (res?.reassigned > 0) {
        toast.success(`Category deleted — ${res.reassigned} medicine(s) moved to "general"`)
      } else {
        toast.success('Category deleted')
      }
      setConfirmDelete(null)
      await loadCats(); onRefresh()
    } catch (err: any) { toast.error(err?.message ?? 'Failed to delete') }
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">{t('vetManageCategories') || 'Manage Categories'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Add new */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Add New Category</label>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
              placeholder={t('vetCategoryNamePlaceholder') || 'e.g. antiparasitic'}
              className={inputCls + ' flex-1'}
            />
            <button onClick={add}
              className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-1.5">
              <Plus size={14} /> Add
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">{t('vetNoCategoriesYet') || 'No categories yet — add one above.'}</p>
          ) : categories.map(cat => (
            <div key={cat.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 group">

              {/* Color dot */}
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />

              {/* Name or edit input */}
              {editingId === cat.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => { setEditName(e.target.value); setEditError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                    className="flex-1 px-2 py-1 text-sm border border-[color:var(--accent)] rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                  {editError && <span className="text-[10px] text-red-500 shrink-0">{editError}</span>}
                  <button onClick={() => saveEdit(cat.id)}
                    className="px-2.5 py-1 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">Save</button>
                  <button onClick={() => setEditingId(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{cat.name}</span>
                  {cat.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">default</span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(cat)}
                      title="Rename"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => askDelete(cat)}
                      title={t('vetDeleteCategory') || 'Delete'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Delete confirmation dialog */}
        {confirmDelete && (
          <div className="px-6 py-4 border-t border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 shrink-0 rounded-b-2xl">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
              Delete "{confirmDelete.name}"?
            </p>
            {confirmDelete.count > 0 ? (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                {confirmDelete.count} medicine(s) use this category — they will be moved to "general".
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">This category is not used by any medicine.</p>
            )}
            <div className="flex items-center gap-2">
              <button onClick={confirmAndDelete} disabled={deleting}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
