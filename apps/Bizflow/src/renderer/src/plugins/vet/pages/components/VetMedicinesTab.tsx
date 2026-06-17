import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Pill, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Loader2,
  PackagePlus, AlertTriangle, Clock, Search, X, Package, Info, XCircle, Settings,
  History, Calendar, ShoppingCart, ArrowDownToLine, TrendingUp, DollarSign
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import VetPeriodFilter from './VetPeriodFilter'

const api = (window as any).api?.vet?.medicines
const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Medicine {
  id: string; name: string; category: string; unit: string
  subUnit?: string | null; subUnitsPerContainer?: number | null
  description?: string | null; minimumStock: number
  totalStock: number; nearestExpiry: string | null
  hasExpired: boolean; expiresWithin30Days: boolean
  isLowStock: boolean; batchCount: number; activeBatchCount: number
  batches: Batch[]
}

interface Batch {
  id: string; batchNumber?: string | null; supplier?: string | null
  expiryDate: string; quantity: number; initialQty: number
  costPerUnit: number; sellingPrice?: number | null
  receivedDate: string; notes?: string | null
  status?: string; disposedAt?: string | null
}

const DEFAULT_UNITS = ['tablet', 'capsule', 'ml', 'vial', 'tube', 'bottle', 'sachet', 'other']
const UNITS_KEY = 'vet_medicine_units'
function loadUnits(): string[] {
  try { const s = localStorage.getItem(UNITS_KEY); if (s) return JSON.parse(s) } catch {}
  return [...DEFAULT_UNITS]
}
function saveUnits(us: string[]) {
  localStorage.setItem(UNITS_KEY, JSON.stringify(us))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(date: string) {
  return Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
}

function ExpiryBadge({ date, qty }: { date: string; qty: number }) {
  const { t } = useLanguage()
  if (qty <= 0) return <span className="text-xs text-slate-400">—</span>
  const days = daysUntil(date)
  if (days < 0)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('vetExpiredBadge')||'Expired'}</span>
  if (days <= 7)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{days}d</span>
  if (days <= 30) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{days}d</span>
  return <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(date).toLocaleDateString()}</span>
}

function StoreHelp() {
  const { t } = useLanguage()
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = { current: null as HTMLSpanElement | null }
  return (
    <span ref={r => { ref.current = r }} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { const r = ref.current?.getBoundingClientRect(); if (r) setPos({ top: r.top, right: window.innerWidth - r.right }) }}
      onMouseLeave={() => setPos(null)}>
      <Info size={13} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos && createPortal(
        <div style={{ position: 'fixed', top: pos.top, right: pos.right, transform: 'translateY(-100%) translateY(-8px)', zIndex: 9999 }}
          className="w-64 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl">
          <span className="block font-semibold text-violet-400 mb-1.5">{t('vetMedStore')||'Medicine Store'}</span>
          <span className="block mb-0.5">{t('vetMedStoreHelpDesc')||'Add medicines to the catalogue, then receive batches — each with its own expiry date and lot #.'}</span>
          <span className="block text-slate-300 mt-1">{t('vetMedStoreHelpLegend')||'🔴 Expired  🟡 Expiring ≤30d  🟠 Low stock'}</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>, document.body
      )}
    </span>
  )
}

// ── Category Manager Modal ───────────────────────────────────────────────────

function CategoryManagerModal({ onRefresh, onClose }: {
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
                    className="flex-1 px-2 py-1 text-sm border border-violet-400 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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

// ── Unit Manager Modal ──────────────────────────────────────────────────────

function UnitManagerModal({ onChange, onClose }: {
  onChange: (units: string[]) => void; onClose: () => void
}) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<{ id: string; name: string; isDefault?: boolean }[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  async function load() {
    try {
      const r = await (window as any).api?.vet?.medicineUnits?.getAll()
      const list = r ?? []
      setRows(list)
      const names = list.map((u: any) => u.name)
      saveUnits(names)
      onChange(names)
    } catch {}
  }
  useEffect(() => { load() }, [])

  async function add() {
    const v = input.trim().toLowerCase()
    if (!v) { setError(t('vetUnitNameRequired') || 'Unit name is required'); return }
    if (rows.some(u => u.name === v)) { setError(t('vetUnitExists') || 'Unit already exists'); return }
    try {
      await (window as any).api?.vet?.medicineUnits?.create({ name: v })
      setInput(''); setError(''); await load()
    } catch (e: any) { setError(e?.message ?? 'Failed to add') }
  }

  async function remove(u: { id: string; name: string }) {
    try { await (window as any).api?.vet?.medicineUnits?.delete(u.id); await load() }
    catch { setError('Failed to remove') }
  }

  const units = rows.map(r => r.name)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm">{t('vetManageUnits') || 'Manage Container Units'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
              placeholder={t('vetUnitNamePlaceholder') || 'e.g. ampoule, strip, pack'}
              className={inputCls + ' flex-1'}
            />
            <button onClick={add}
              className="px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors">
              <Plus size={16} />
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {rows.map(u => (
              <span key={u.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                <span className="capitalize">{u.name}</span>
                <button onClick={() => remove(u)}
                  className="text-violet-400 hover:text-red-500 transition-colors"
                  title={t('vetDeleteUnit') || 'Remove'}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {units.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{t('vetNoUnitsYet') || 'No units yet — add one above.'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Medicine Form ─────────────────────────────────────────────────────────────

function MedicineModal({ initial, categories, units, onRefresh, onUnitsChange, onSave, onClose }: {
  initial?: Medicine | null
  categories: string[]
  units: string[]
  onRefresh: () => void
  onUnitsChange: (units: string[]) => void
  onSave: () => void
  onClose: () => void
}) {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: initial?.name ?? '', category: initial?.category ?? 'general',
    unit: initial?.unit ?? 'tablet',
    subUnit: initial?.subUnit ?? '',
    subUnitsPerContainer: initial?.subUnitsPerContainer ? String(initial.subUnitsPerContainer) : '',
    description: initial?.description ?? '',
    minimumStock: String(initial?.minimumStock ?? 0)
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const [showUnitMgr, setShowUnitMgr] = useState(false)
  const [showCatMgr, setShowCatMgr]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const trimmedSubUnit = form.subUnit.trim() || null
      const subUnitsPerContainer = trimmedSubUnit && form.subUnitsPerContainer
        ? parseFloat(form.subUnitsPerContainer)
        : null
      const isValidRatio = subUnitsPerContainer && isFinite(subUnitsPerContainer) && subUnitsPerContainer > 0
      const data: any = {
        ...form,
        minimumStock: parseFloat(form.minimumStock) || 0,
        subUnit: trimmedSubUnit,
        subUnitsPerContainer: isValidRatio ? subUnitsPerContainer : null
      }
      if (initial) await api.update(initial.id, data)
      else         await api.create(data)
      toast.success(initial ? t('vetMedicineUpdated')||'Medicine updated' : t('vetMedicineAdded')||'Medicine added')
      onSave()
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{initial ? t('vetEditMedicine')||'Edit Medicine' : t('vetAddMedicine')||'Add Medicine'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedNameLabel')||'Name'} *</label>
            <input required value={form.name} onChange={set('name')} placeholder="e.g. Amoxicillin" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedCategory')||'Category'}</label>
              <div className="flex gap-1">
                <select value={form.category} onChange={set('category')} className={inputCls + ' flex-1'}>
                  {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
                <button type="button" onClick={() => setShowCatMgr(true)}
                  className="shrink-0 px-2 py-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title={t('vetManageCategories') || 'Manage Categories'}>
                  <Settings size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedUnit')||'Container Unit'}</label>
              <div className="flex gap-1">
                <select value={form.unit} onChange={set('unit')} className={inputCls + ' flex-1'}>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button type="button" onClick={() => setShowUnitMgr(true)}
                  className="shrink-0 px-2 py-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title={t('vetManageUnits') || 'Manage Units'}>
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>
          {showUnitMgr && <UnitManagerModal onChange={onUnitsChange} onClose={() => setShowUnitMgr(false)} />}
          {showCatMgr  && <CategoryManagerModal onRefresh={onRefresh} onClose={() => setShowCatMgr(false)} />}
          {/* Unit conversion — optional */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('vetUnitConversion') || 'Unit Conversion'}{' '}
              <span className="font-normal text-slate-400">({t('vetUnitConversionOptional') || 'optional'})</span>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('vetUnitConversionDesc') || 'Enable to sell partial containers — e.g. sell individual ml from a bottle.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t('vetSubUnitLabel') || 'Sub-unit label'}</label>
                <input value={form.subUnit} onChange={set('subUnit')} placeholder="e.g. ml, cc, mg"
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {t('vetSubUnitsPerContainer', { unit: form.unit || 'container' }) || `Sub-units per ${form.unit || 'container'}`}
                </label>
                <input type="number" min="0.001" step="any" value={form.subUnitsPerContainer}
                  onChange={set('subUnitsPerContainer')} placeholder="e.g. 100"
                  className={inputCls} />
              </div>
            </div>
            {form.subUnit && form.subUnitsPerContainer && (
              <p className="text-[11px] text-violet-600 dark:text-violet-400">
                {t('vetCategoryEqPreview', { unit: form.unit, count: form.subUnitsPerContainer, subUnit: form.subUnit })
                  || `1 ${form.unit} = ${form.subUnitsPerContainer} ${form.subUnit}`}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedMinStock')||'Min. Stock Alert'}</label>
            <input type="number" min="0" step="any" value={form.minimumStock} onChange={set('minimumStock')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetMedDescription')||'Description'}</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className={inputCls + ' resize-none'} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl">{t('vetMedCancel')||'Cancel'}</button>
            <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('vetMedSave')||'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Batch Form ────────────────────────────────────────────────────────────────

function BatchModal({ medicineId, unit, initial, onSave, onClose }: {
  medicineId: string; unit: string; initial?: Batch | null; onSave: () => void; onClose: () => void
}) {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    batchNumber:  initial?.batchNumber ?? '',
    supplier:     initial?.supplier ?? '',
    expiryDate:   initial ? new Date(initial.expiryDate).toISOString().slice(0, 10) : '',
    quantity:     String(initial?.quantity ?? ''),
    costPerUnit:  String(initial?.costPerUnit ?? ''),
    sellingPrice: String(initial?.sellingPrice ?? ''),
    receivedDate: initial ? new Date(initial.receivedDate).toISOString().slice(0, 10) : today,
    notes:        initial?.notes ?? ''
  })
  // Separate state for margin input so user can type freely without binding to form
  const [marginStr, setMarginStr] = useState(() => {
    const cost = Number(initial?.costPerUnit) || 0
    const sell = Number(initial?.sellingPrice) || 0
    if (cost > 0 && sell > 0) return ((sell - cost) / cost * 100).toFixed(1)
    return ''
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleCostChange(v: string) {
    setForm(f => {
      const newCost = parseFloat(v) || 0
      const pct = parseFloat(marginStr)
      // If margin is pinned, recompute selling price
      if (!isNaN(pct) && newCost > 0) {
        return { ...f, costPerUnit: v, sellingPrice: (newCost * (1 + pct / 100)).toFixed(4) }
      }
      // If selling price is set but margin isn't, keep selling price and recompute marginStr
      const sell = parseFloat(f.sellingPrice) || 0
      if (newCost > 0 && sell > 0) {
        setMarginStr(((sell - newCost) / newCost * 100).toFixed(1))
      }
      return { ...f, costPerUnit: v }
    })
  }

  function handleSellingPriceChange(v: string) {
    setForm(f => ({ ...f, sellingPrice: v }))
    const cost = parseFloat(form.costPerUnit) || 0
    const sell = parseFloat(v) || 0
    if (cost > 0 && sell > 0) setMarginStr(((sell - cost) / cost * 100).toFixed(1))
    else if (!v) setMarginStr('')
  }

  function handleMarginChange(v: string) {
    setMarginStr(v)
    const cost = parseFloat(form.costPerUnit) || 0
    const pct  = parseFloat(v)
    if (!isNaN(pct) && cost > 0) {
      setForm(f => ({ ...f, sellingPrice: (cost * (1 + pct / 100)).toFixed(4) }))
    }
  }

  // Live preview
  const previewCost = parseFloat(form.costPerUnit) || 0
  const previewSell = parseFloat(form.sellingPrice) || 0
  const previewMargin = previewCost > 0 && previewSell > 0
    ? ((previewSell - previewCost) / previewCost * 100)
    : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.expiryDate) { toast.error(t('vetExpiryDateRequired')||'Expiry date is required'); return }
    setBusy(true)
    try {
      const sellingPriceVal = parseFloat(form.sellingPrice)
      const data: any = {
        medicineId,
        batchNumber:  form.batchNumber  || undefined,
        supplier:     form.supplier     || undefined,
        expiryDate:   form.expiryDate,
        quantity:     parseFloat(form.quantity)     || 0,
        costPerUnit:  parseFloat(form.costPerUnit)  || 0,
        sellingPrice: isNaN(sellingPriceVal) || sellingPriceVal === 0 ? undefined : sellingPriceVal,
        receivedDate: form.receivedDate || undefined,
        notes:        form.notes        || undefined
      }
      if (initial) await api.updateBatch(initial.id, data)
      else         await api.addBatch(data)
      toast.success(initial ? t('vetBatchUpdated')||'Batch updated' : t('vetBatchReceived')||'Batch received')
      onSave()
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{initial ? t('vetEditBatch')||'Edit Batch' : t('vetReceiveBatch')||'Receive New Batch'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchLotNum')||'Batch / Lot #'}</label>
              <input value={form.batchNumber} onChange={set('batchNumber')} placeholder={t('vetOptional')||'Optional'} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchSupplier')||'Supplier'}</label>
              <input value={form.supplier} onChange={set('supplier')} placeholder={t('vetOptional')||'Optional'} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchExpiryDate')||'Expiry Date'} *</label>
              <input required type="date" value={form.expiryDate} onChange={set('expiryDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchReceivedDate')||'Received Date'}</label>
              <input type="date" value={form.receivedDate} onChange={set('receivedDate')} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchQtyLabel')||'Qty'} ({unit}) *</label>
              <input required type="number" min="0.01" step="any" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchCostLabel')||'Cost'} / {unit}</label>
              <input type="number" min="0" step="any" value={form.costPerUnit}
                onChange={e => handleCostChange(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
          </div>

          {/* ── Pricing section ── */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">
              {t('vetBatchPricing') || 'Pricing'}
              <span className="ml-1 font-normal text-violet-500">{t('vetOptional') || '(optional)'}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('vetBatchSellingPrice') || 'Selling Price'} / {unit}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">$</span>
                  <input type="number" min="0" step="any" value={form.sellingPrice}
                    onChange={e => handleSellingPriceChange(e.target.value)}
                    placeholder="0.00" className={inputCls + ' pl-6'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('vetBatchMargin') || 'Margin %'}
                </label>
                <div className="relative">
                  <input type="number" step="0.1" value={marginStr}
                    onChange={e => handleMarginChange(e.target.value)}
                    placeholder="e.g. 30" className={inputCls + ' pr-6'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                </div>
              </div>
            </div>
            {previewMargin !== null && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                previewMargin >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                Cost ${previewCost.toFixed(2)}
                <span className="text-slate-400">→</span>
                Sell ${previewSell.toFixed(2)}
                <span>= {previewMargin >= 0 ? '+' : ''}{previewMargin.toFixed(1)}% margin</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {t('vetBatchPricingHint') || 'Set a selling price here and it will be pre-filled automatically when you make a sale from this batch.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetBatchNotesLabel')||'Notes'}</label>
            <input value={form.notes} onChange={set('notes')} className={inputCls} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl">{t('vetMedCancel')||'Cancel'}</button>
            <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : initial ? t('vetMedUpdate')||'Update' : t('vetAddBatch')||'Add Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onCancel, busy }: { label: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <p className="font-semibold text-slate-900 dark:text-white mb-2">{label}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('vetDeletePermanent')||'This action cannot be undone.'}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('vetMedCancel')||'Cancel'}</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('vetDeleteConfirm')||'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DisposeConfirm({
  batch, medicineName, unit, onConfirm, onCancel, busy
}: {
  batch: Batch; medicineName: string; unit: string
  onConfirm: (reason: string) => void; onCancel: () => void; busy: boolean
}) {
  const { t } = useLanguage()
  const [reason, setReason] = useState('')
  const lossAmount = batch.quantity * (batch.costPerUnit ?? 0)
  const lotLabel   = batch.batchNumber ? ` LOT-${batch.batchNumber}` : ''
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t('vetWriteOffTitle')||'Write Off Expired Batch'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{medicineName}{lotLabel}</p>
          </div>
        </div>
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 mb-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{t('vetWriteOffQtyLabel')||'Quantity to write off'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">{batch.quantity} {unit}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{t('vetWriteOffCostUnit')||'Cost per unit'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">${(batch.costPerUnit ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-red-200 dark:border-red-700 pt-1 mt-1">
            <span className="font-semibold text-red-700 dark:text-red-400">{t('vetWriteOffLoss')||'Loss recorded'}</span>
            <span className="font-bold text-red-700 dark:text-red-400">${lossAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('vetWriteOffReason')||'Reason (optional)'}</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Expired — not administered"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          This will zero the batch stock and record a <strong>${lossAmount.toFixed(2)}</strong> loss under <em>Medications</em> expenses.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">{t('vetMedCancel')||'Cancel'}</button>
          <button onClick={() => onConfirm(reason)} disabled={busy}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-3.5 w-3.5" /> {t('vetWriteOff')||'Write Off'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Medicine History Modal ─────────────────────────────────────────────────

interface HistoryEvent {
  id: string; type: 'received' | 'sold' | 'disposed'; date: string
  batchNumber?: string | null; quantity: number; unit: string; subUnit?: string | null
  saleUnit?: string; costPerUnit?: number; totalCost?: number; totalPrice?: number
  unitPrice?: number; discount?: number; grossProfit?: number; lossAmount?: number
  supplier?: string | null; expiryDate?: string; reason?: string | null
  ownerName?: string | null; paymentStatus?: string; notes?: string | null
}

function MedicineHistoryModal({ medicineId, medicineName, onClose }: {
  medicineId: string; medicineName: string; onClose: () => void
}) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [summary, setSummary] = useState<any | null>(null)
  const [medUnit, setMedUnit] = useState('')
  const [range, setRange] = useState<{ from?: string; to?: string }>({})
  const [typeFilter, setTypeFilter] = useState<'all' | 'received' | 'sold' | 'disposed'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getHistory(medicineId, { from: range.from, to: range.to })
      setEvents(res?.events ?? [])
      setSummary(res?.summary ?? null)
      setMedUnit(res?.medicine?.unit ?? '')
    } catch { setEvents([]); setSummary(null) }
    finally { setLoading(false) }
  }, [medicineId, range.from, range.to])

  useEffect(() => { load() }, [load])

  const shown = events.filter(e => typeFilter === 'all' || e.type === typeFilter)

  const EVENT_META: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    received: { icon: ArrowDownToLine, color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/30',     label: t('vetHistReceived') || 'Stock received' },
    sold:     { icon: ShoppingCart,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: t('vetHistSold') || 'Sold' },
    disposed: { icon: XCircle,         color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-100 dark:bg-red-900/30',       label: t('vetHistDisposed') || 'Written off' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <History className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{medicineName}</h2>
              <p className="text-xs text-slate-400">{t('vetMedicineHistory') || 'Inventory history & activity'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5">
          <VetPeriodFilter onChange={r => setRange({ from: r.from, to: r.to })} defaultPreset="all" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">{t('vetHistType') || 'Type'}:</span>
            {(['all', 'received', 'sold', 'disposed'] as const).map(ty => (
              <button key={ty} onClick={() => setTypeFilter(ty)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize transition-colors
                  ${typeFilter === ty ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                {ty === 'all' ? (t('vetFilterAll') || 'All') : EVENT_META[ty]?.label ?? ty}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 border-b border-slate-100 dark:border-slate-800">
            {[
              { label: t('vetHistReceivedTotal') || 'Received', val: `${summary.totalReceived ?? 0} ${medUnit}`, icon: ArrowDownToLine, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: t('vetHistRevenue') || 'Revenue', val: `$${(summary.salesRevenue ?? 0).toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: t('vetHistProfit') || 'Profit', val: `$${(summary.salesProfit ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
              { label: t('vetHistLoss') || 'Write-off loss', val: `$${(summary.disposalLoss ?? 0).toFixed(2)}`, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2 flex items-center gap-2.5`}>
                <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-black ${s.color} leading-none truncate`}>{s.val}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <History className="h-9 w-9 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('vetHistNoEvents') || 'No activity in this period'}</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-1">
              {/* vertical line */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />
              {shown.map(e => {
                const meta = EVENT_META[e.type]
                const Icon = meta.icon
                const d = new Date(e.date)
                const unitLabel = e.type === 'sold' && e.saleUnit === 'sub' && e.subUnit ? e.subUnit : (e.unit || medUnit)
                return (
                  <div key={e.id} className="relative flex gap-3 py-2">
                    <div className={`absolute -left-6 mt-0.5 w-4 h-4 rounded-full ${meta.bg} ring-4 ring-white dark:ring-slate-900 flex items-center justify-center`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.color.replace('text-', 'bg-')}`} />
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">{meta.label}</span>
                          {e.batchNumber && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">LOT {e.batchNumber}</span>}
                          {e.type === 'sold' && e.paymentStatus && e.paymentStatus !== 'paid' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 capitalize">{e.paymentStatus}</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" /> {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {e.type === 'received' && (
                          <>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">+{e.quantity} {unitLabel}</span>
                            {e.costPerUnit ? ` @ $${e.costPerUnit.toFixed(2)} = $${(e.totalCost ?? 0).toFixed(2)}` : ''}
                            {e.supplier ? ` · ${e.supplier}` : ''}
                            {e.expiryDate ? ` · ${t('vetExpPrefix') || 'Exp:'} ${new Date(e.expiryDate).toLocaleDateString()}` : ''}
                          </>
                        )}
                        {e.type === 'sold' && (
                          <>
                            <span className="font-semibold text-red-500">−{e.quantity} {unitLabel}</span>
                            {` @ $${(e.unitPrice ?? 0).toFixed(2)} = $${(e.totalPrice ?? 0).toFixed(2)}`}
                            {(e.discount ?? 0) > 0 ? ` · −$${(e.discount ?? 0).toFixed(2)} disc` : ''}
                            {e.ownerName ? ` · ${e.ownerName}` : ''}
                            {typeof e.grossProfit === 'number' ? <span className={e.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{` · ${e.grossProfit >= 0 ? '+' : ''}$${e.grossProfit.toFixed(2)} ${t('vetProfit') || 'profit'}`}</span> : ''}
                          </>
                        )}
                        {e.type === 'disposed' && (
                          <>
                            <span className="font-semibold text-red-500">−{e.quantity} {unitLabel}</span>
                            {` · −$${(e.lossAmount ?? 0).toFixed(2)} ${t('vetHistLoss') || 'loss'}`}
                            {e.reason ? ` · ${e.reason}` : ''}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {shown.length} {shown.length === 1 ? (t('vetHistEvent') || 'event') : (t('vetHistEvents') || 'events')}
          </p>
          <button onClick={onClose} className="px-4 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            {t('vetClose') || 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function VetMedicinesTab() {
  const { t } = useLanguage()
  const toast = useToast()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('all')
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())

  const [dbCategories, setDbCategories] = useState<{ id: string; name: string; color: string }[]>([])
  const [units, setUnits]           = useState<string[]>(loadUnits)
  // Container units are persisted in the DB; localStorage is just a warm cache.
  useEffect(() => {
    ;(window as any).api?.vet?.medicineUnits?.getAll()
      .then((r: { name: string }[]) => { if (r?.length) { const names = r.map(u => u.name); setUnits(names); saveUnits(names) } })
      .catch(() => {})
  }, [])
  const [showCatManager, setShowCatManager] = useState(false)
  const [medModal, setMedModal]     = useState<{ open: boolean; item: Medicine | null }>({ open: false, item: null })
  const [batchModal, setBatchModal] = useState<{ open: boolean; medId: string; unit: string; item: Batch | null }>({ open: false, medId: '', unit: '', item: null })
  const [delTarget, setDelTarget]   = useState<{ type: 'medicine' | 'batch'; id: string; label: string } | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [showLowStock, setShowLowStock] = useState(false)
  const [medPage, setMedPage] = useState(1)
  const [batchFilter,  setBatchFilter]  = useState<'expired' | 'expiring' | null>(null)
  const [disposeTarget, setDisposeTarget] = useState<{ batch: Batch; medicineName: string; unit: string } | null>(null)
  const [disposing, setDisposing]   = useState(false)
  const [historyTarget, setHistoryTarget] = useState<{ id: string; name: string } | null>(null)

  // Reset active category filter if its category was deleted
  const categoryNames = ['all', ...dbCategories.map(c => c.name)]
  useEffect(() => {
    if (category !== 'all' && !categoryNames.includes(category)) setCategory('all')
  }, [dbCategories])

  const loadCategories = useCallback(async () => {
    try {
      const rows = await (window as any).api?.vet?.medicineCategories?.getAll()
      setDbCategories(rows ?? [])
    } catch {}
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getAll({ search: search || undefined, category: category !== 'all' ? category : undefined, take: 1000 })
      setMedicines(res.data ?? []); setTotal(res.total ?? 0)
    } catch (err: any) { toast.error(err?.message ?? 'Failed to load') }
    finally { setLoading(false) }
  }, [search, category])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function confirmDelete() {
    if (!delTarget) return
    setDeleting(true)
    try {
      if (delTarget.type === 'medicine') await api.delete(delTarget.id)
      else                               await api.deleteBatch(delTarget.id)
      toast.success(t('vetDeleted')||'Deleted')
      setDelTarget(null)
      load()
    } catch (err: any) { toast.error(err?.message ?? 'Delete failed') }
    finally { setDeleting(false) }
  }

  async function confirmDispose(reason: string) {
    if (!disposeTarget) return
    setDisposing(true)
    try {
      const res = await api.disposeBatch(disposeTarget.batch.id, { reason: reason || undefined })
      toast.success((t('vetWriteOffSuccess')||'Written off — ${amount} loss recorded').replace('${amount}', `$${(res.lossAmount ?? 0).toFixed(2)}`))
      setDisposeTarget(null)
      load()
    } catch (err: any) { toast.error(err?.message ?? 'Dispose failed') }
    finally { setDisposing(false) }
  }

  const lowStockMeds = medicines.filter(m => m.isLowStock)
  const displayedMedicines = (() => {
    if (showLowStock) return lowStockMeds
    if (batchFilter === 'expired')  return medicines.filter(m => m.hasExpired)
    if (batchFilter === 'expiring') return medicines.filter(m => m.expiresWithin30Days && !m.hasExpired)
    return medicines
  })()

  // Client-side pagination keeps the list snappy with large catalogues (500+).
  const MED_PAGE_SIZE = 24
  const medTotalPages = Math.max(1, Math.ceil(displayedMedicines.length / MED_PAGE_SIZE))
  const safePage = Math.min(medPage, medTotalPages)
  const pagedMedicines = displayedMedicines.slice((safePage - 1) * MED_PAGE_SIZE, safePage * MED_PAGE_SIZE)
  useEffect(() => { setMedPage(1) }, [search, category, showLowStock, batchFilter])

  return (
    <div className="p-6 space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('vetSearchMedicines')||'Search medicines…'}
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-52" />
          </div>
          <div className="flex gap-0.5 flex-wrap items-center">
            {categoryNames.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                  ${category === c
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {c === 'all' ? t('vetFilterAll') || 'All' : c}
              </button>
            ))}
            <button
              onClick={() => setShowCatManager(true)}
              className="p-1.5 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={t('vetManageCategories') || 'Manage Categories'}>
              <Settings size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMedModal({ open: true, item: null })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> {t('vetAddMedicineBtn')||'Add Medicine'}
          </button>
          <StoreHelp />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: t('vetTotalMedicines')||'Total Medicines',   value: total,                                                                  icon: Pill,          color: 'text-violet-600 dark:text-violet-400', clickable: true,     filterKey: null },
          { label: t('vetExpiredBatches')||'Expired Batches',   value: medicines.filter(m => m.hasExpired).length,                            icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',        clickable: true,     filterKey: 'expired' as const },
          { label: t('vetExpiring30')||'Expiring ≤30 days', value: medicines.filter(m => m.expiresWithin30Days && !m.hasExpired).length,  icon: Clock,         color: 'text-amber-600 dark:text-amber-400',    clickable: true,     filterKey: 'expiring' as const },
          { label: t('vetLowStockCard')||'Low Stock',         value: lowStockMeds.length,                                                   icon: Package,       color: 'text-orange-600 dark:text-orange-400',  clickable: true,     filterKey: null },
          { label: t('vetStockValue')||'Stock Value',         value: `$${medicines.reduce((sum, m) => sum + (m.batches?.reduce((bs, b) => bs + b.quantity * (b.costPerUnit || 0), 0) ?? 0), 0).toFixed(0)}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', clickable: false, filterKey: null },
        ].map(s => {
          const isTotal         = s.label === (t('vetTotalMedicines')||'Total Medicines')
          const anyFilterActive  = showLowStock || batchFilter !== null || category !== 'all'
          const isLowStockActive = s.label === (t('vetLowStockCard')||'Low Stock') && showLowStock
          const isBatchActive    = s.filterKey !== null && batchFilter === s.filterKey
          const isActive         = isLowStockActive || isBatchActive || (isTotal && anyFilterActive)
          return (
            <div key={s.label}
              onClick={s.clickable ? () => {
                if (isTotal) {
                  setShowLowStock(false)
                  setBatchFilter(null)
                  setCategory('all')
                } else if (s.filterKey !== null) {
                  setShowLowStock(false)
                  setBatchFilter(batchFilter === s.filterKey ? null : s.filterKey)
                } else if (s.label === (t('vetLowStockCard')||'Low Stock')) {
                  setBatchFilter(null)
                  setShowLowStock(v => !v)
                }
              } : undefined}
              className={`border rounded-xl p-4 text-center transition-all
                ${s.clickable ? 'cursor-pointer select-none' : ''}
                ${isActive
                  ? 'ring-2 ' + (
                      s.filterKey === 'expired' ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 ring-red-400/40'
                      : s.filterKey === 'expiring' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600 ring-amber-400/40'
                      : 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 ring-orange-400/40'
                    )
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{s.label}</p>
              {isActive && (
                <span className="mt-1 inline-block text-[10px] font-medium opacity-70">
                  {isTotal && anyFilterActive ? '✕ clear filters' : '● filtered'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Medicine list */}
      {loading && medicines.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : displayedMedicines.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{showLowStock ? t('vetAllStockedUp')||'No low-stock medicines — all stocked up!' : batchFilter === 'expired' ? 'No expired medicines' : batchFilter === 'expiring' ? 'No medicines expiring within 30 days' : t('vetNoMedicinesFound')||'No medicines found'}</p>
          {(showLowStock || batchFilter)
            ? <button onClick={() => { setShowLowStock(false); setBatchFilter(null) }} className="mt-2 text-sm text-slate-500 dark:text-slate-400 hover:underline">{t('vetClearFilter')||'Clear filter'}</button>
            : <button onClick={() => setMedModal({ open: true, item: null })} className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">{t('vetAddFirstMedicine')||'Add the first medicine'}</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {category !== 'all' && (
            <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2">
              <span className="text-xs text-violet-700 dark:text-violet-300 font-medium capitalize">
                {medicines.length} result{medicines.length !== 1 ? 's' : ''} in &ldquo;{category}&rdquo;
              </span>
              <button onClick={() => setCategory('all')}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
                <X size={11} /> {t('vetClearFilter')||'Clear filter'}
              </button>
            </div>
          )}
          {showLowStock && (
            <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2">
              <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                {lowStockMeds.length} {t('vetLowStockCard')||'Low Stock'}
              </span>
              <button onClick={() => setShowLowStock(false)}
                className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline">
                <X size={11} /> {t('vetClearFilter')||'Clear filter'}
              </button>
            </div>
          )}
          {batchFilter && (
            <div className={`flex items-center justify-between border rounded-lg px-3 py-2 ${
              batchFilter === 'expired'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
              <span className={`text-xs font-medium ${
                batchFilter === 'expired' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {batchFilter === 'expired'
                  ? `${medicines.filter(m => m.hasExpired).length} Expired Batches`
                  : `${medicines.filter(m => m.expiresWithin30Days && !m.hasExpired).length} Expiring \u226430 days`}
              </span>
              <button onClick={() => setBatchFilter(null)}
                className={`flex items-center gap-1 text-xs hover:underline ${
                  batchFilter === 'expired' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                <X size={11} /> {t('vetClearFilter')||'Clear filter'}
              </button>
            </div>
          )}
          {pagedMedicines.map(med => (
            <div key={med.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {/* Medicine header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggle(med.id)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors shrink-0">
                  {expanded.has(med.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900 dark:text-white text-sm">{med.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 capitalize">{med.category}</span>
                    {med.hasExpired && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">{t('vetExpiredBadge')||'Expired'}</span>}
                    {!med.hasExpired && med.expiresWithin30Days && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">{t('vetExpiringSoon')||'Expiring soon'}</span>}
                    {med.isLowStock && <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium">{t('vetLowStockBadge')||'Low stock'}</span>}
                  </div>
                  {med.description && <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{med.description}</p>}
                </div>

                <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
                  <div>
                    <p className={`text-lg font-bold ${med.isLowStock ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>{med.totalStock}</p>
                    <p className="text-[11px] text-slate-400">{med.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{med.activeBatchCount}</p>
                    <p className="text-[11px] text-slate-400">{t('vetBatchesLabel')||'batches'}</p>
                  </div>
                  {med.nearestExpiry && (
                    <div>
                      <ExpiryBadge date={med.nearestExpiry} qty={1} />
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('vetNearestLabel')||'nearest'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setHistoryTarget({ id: med.id, name: med.name })} title={t('vetViewHistory') || 'View history'}
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 transition-colors">
                    <History size={15} />
                  </button>
                  <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: null })} title="Receive batch"
                    className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors">
                    <PackagePlus size={15} />
                  </button>
                  <button onClick={() => setMedModal({ open: true, item: med })}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDelTarget({ type: 'medicine', id: med.id, label: `Delete "${med.name}"?` })}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded batches */}
              {expanded.has(med.id) && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                  {med.batches.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-5 text-slate-400 text-sm">
                      <PackagePlus size={15} /> {t('vetNoBatches')||'No batches yet'} —
                      <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: null })}
                        className="text-violet-600 dark:text-violet-400 hover:underline">{t('vetReceiveFirstBatch')||'receive the first batch'}</button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                            {[t('vetBatchNumHeader')||'Batch #', t('vetExpiryHeader')||'Expiry', t('vetRemainingHeader')||'Remaining', t('vetInitialHeader')||'Initial', t('vetCostUnitHeader')||'Cost/unit', t('vetSellPriceHeader')||'Sell price', t('vetValueHeader')||'Stock value', t('vetBatchSupplier')||'Supplier', ''].map((h, i) => (
                                <th key={`${h}-${i}`} className="px-4 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {med.batches.map(b => {
                              const days  = daysUntil(b.expiryDate)
                              const isExp = days < 0
                              const isWarn = !isExp && days <= 30
                              const stockValue = b.quantity * (b.costPerUnit ?? 0)
                              const margin = (b.sellingPrice && b.costPerUnit) ? ((b.sellingPrice - b.costPerUnit) / b.sellingPrice) * 100 : null
                              return (
                                <tr key={b.id} className={`transition-colors ${isExp ? 'bg-red-50/60 dark:bg-red-900/10' : isWarn ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/20'}`}>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.batchNumber ?? '—'}</td>
                                  <td className="px-4 py-2.5"><ExpiryBadge date={b.expiryDate} qty={b.quantity} /></td>
                                  <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{b.quantity} <span className="text-slate-400 font-normal">{med.unit}</span></td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.initialQty}</td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{b.costPerUnit > 0 ? `$${b.costPerUnit.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 whitespace-nowrap">
                                    {b.sellingPrice != null
                                      ? <span className="text-violet-600 dark:text-violet-400 font-medium">${b.sellingPrice.toFixed(2)}{margin != null && <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">{margin >= 0 ? '+' : ''}{margin.toFixed(0)}%</span>}</span>
                                      : <span className="text-slate-400">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{stockValue > 0 ? `$${stockValue.toFixed(2)}` : '—'}</td>
                                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.supplier ?? '—'}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: b })}
                                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <Pencil size={13} />
                                      </button>
                                      {isExp && b.quantity > 0 && b.status !== 'disposed' && (
                                        <button onClick={() => setDisposeTarget({ batch: b, medicineName: med.name, unit: med.unit })}
                                          title="Write off expired batch"
                                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 dark:hover:text-red-400">
                                          <XCircle size={13} />
                                        </button>
                                      )}
                                      <button onClick={() => setDelTarget({ type: 'batch', id: b.id, label: 'Delete this batch?' })}
                                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500">
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 flex justify-end border-t border-slate-100 dark:border-slate-700">
                        <button onClick={() => setBatchModal({ open: true, medId: med.id, unit: med.unit, item: null })}
                          className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
                          <Plus size={11} /> {t('vetReceiveNewBatch')||'Receive new batch'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {medTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                {t('vetShowing') || 'Showing'} {(safePage - 1) * MED_PAGE_SIZE + 1}–{Math.min(safePage * MED_PAGE_SIZE, displayedMedicines.length)} {t('vetOfLabel') || 'of'} {displayedMedicines.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setMedPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronUp className="h-3.5 w-3.5 -rotate-90" />
                </button>
                <span className="px-3 text-xs font-semibold text-slate-600 dark:text-slate-300">{safePage} / {medTotalPages}</span>
                <button onClick={() => setMedPage(p => Math.min(medTotalPages, p + 1))} disabled={safePage === medTotalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCatManager && (
        <CategoryManagerModal
          onRefresh={loadCategories}
          onClose={() => setShowCatManager(false)} />
      )}
      {medModal.open && (
        <MedicineModal initial={medModal.item}
          categories={dbCategories.map(c => c.name)}
          units={units}
          onRefresh={loadCategories}
          onUnitsChange={us => { setUnits(us); saveUnits(us) }}
          onSave={() => { setMedModal({ open: false, item: null }); load() }}
          onClose={() => setMedModal({ open: false, item: null })} />
      )}
      {batchModal.open && (
        <BatchModal medicineId={batchModal.medId} unit={batchModal.unit} initial={batchModal.item}
          onSave={() => { setBatchModal({ open: false, medId: '', unit: '', item: null }); load() }}
          onClose={() => setBatchModal({ open: false, medId: '', unit: '', item: null })} />
      )}
      {delTarget && (
        <DeleteConfirm label={delTarget.label} busy={deleting}
          onConfirm={confirmDelete} onCancel={() => setDelTarget(null)} />
      )}
      {disposeTarget && (
        <DisposeConfirm
          batch={disposeTarget.batch}
          medicineName={disposeTarget.medicineName}
          unit={disposeTarget.unit}
          busy={disposing}
          onConfirm={confirmDispose}
          onCancel={() => setDisposeTarget(null)}
        />
      )}
      {historyTarget && (
        <MedicineHistoryModal
          medicineId={historyTarget.id}
          medicineName={historyTarget.name}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  )
}
