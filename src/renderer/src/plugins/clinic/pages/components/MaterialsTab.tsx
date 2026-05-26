import { useState, useEffect, useCallback } from 'react'
import {
  Package, Plus, Pencil, Trash2, Loader2, AlertTriangle,
  CheckCircle2, X, Search, RefreshCw, AlertCircle, Layers,
  Tag, Boxes, GripVertical, Save, TrendingDown
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Material {
  id: string
  name: string
  category?: string | null
  description?: string | null
  unit: string
  quantity: number
  minQuantity: number
  costPerUnit: number
  supplier?: string | null
  expiryDate?: string | null
  isActive: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  color: string
  sortOrder: number
}

interface Batch {
  id: string
  materialId: string
  batchNumber?: string | null
  quantity: number
  expiryDate?: string | null
  receivedAt: string
  costPerUnit?: number | null
  supplier?: string | null
  notes?: string | null
  isActive: boolean
}

interface MaterialStats {
  total: number
  lowStock: number
  expired: number
  expiringSoon: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const UNITS = ['piece', 'box', 'pack', 'ml', 'mg', 'g', 'kg', 'L', 'unit', 'vial', 'tube', 'roll', 'set']

const COLOR_OPTIONS = [
  { value: 'teal',    label: 'Teal' },
  { value: 'violet',  label: 'Violet' },
  { value: 'blue',    label: 'Blue' },
  { value: 'indigo',  label: 'Indigo' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'cyan',    label: 'Cyan' },
  { value: 'amber',   label: 'Amber' },
  { value: 'rose',    label: 'Rose' },
  { value: 'slate',   label: 'Slate' },
]

function categoryBadgeCls(color: string): string {
  const map: Record<string, string> = {
    teal:    'bg-teal-100   text-teal-700   dark:bg-teal-900/30   dark:text-teal-400',
    violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    blue:    'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
    indigo:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cyan:    'bg-cyan-100   text-cyan-700   dark:bg-cyan-900/30   dark:text-cyan-400',
    amber:   'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
    rose:    'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-400',
    slate:   'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-300',
  }
  return map[color] ?? map.slate
}

function expiryStatus(expiryDate?: string | null): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiryDate) return 'none'
  const exp = new Date(expiryDate)
  const now = new Date()
  if (exp < now) return 'expired'
  const soon = new Date(); soon.setDate(now.getDate() + 30)
  if (exp <= soon) return 'soon'
  return 'ok'
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString() } catch { return '—' }
}

// ─── Material Form Modal ─────────────────────────────────────────────────────
interface FormModalProps {
  existing?: Material | null
  onClose: () => void
  onSaved: () => void
}

function MaterialFormModal({ existing, onClose, onSaved }: FormModalProps) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName]               = useState(existing?.name ?? '')
  const [category, setCategory]       = useState(existing?.category ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [unit, setUnit]               = useState(existing?.unit ?? 'piece')
  const [quantity, setQuantity]       = useState(existing?.quantity?.toString() ?? '0')
  const [minQuantity, setMinQuantity] = useState(existing?.minQuantity?.toString() ?? '0')
  const [costPerUnit, setCostPerUnit] = useState(existing?.costPerUnit?.toString() ?? '0')
  const [supplier, setSupplier]       = useState(existing?.supplier ?? '')
  const [notes, setNotes]             = useState(existing?.notes ?? '')
  const [isActive, setIsActive]       = useState(existing?.isActive ?? true)

  useEffect(() => {
    window.api.clinic.materialCategories.getAll().then(setCategories).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { showToast('error', t('materialNameRequired')); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        category: category || null,
        description: description.trim() || null,
        unit,
        quantity: parseFloat(quantity) || 0,
        minQuantity: parseFloat(minQuantity) || 0,
        costPerUnit: parseFloat(costPerUnit) || 0,
        supplier: supplier.trim() || null,
        notes: notes.trim() || null,
        isActive,
      }
      if (existing) {
        await window.api.clinic.materials.update(existing.id, payload)
        showToast('success', t('updatedSuccessfully'))
      } else {
        await window.api.clinic.materials.create(payload)
        showToast('success', t('createdSuccessfully'))
      }
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow'
  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <Package className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {existing ? t('editMaterial') : t('newMaterial')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>{t('materialName')} *</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder={t('materialNamePlaceholder')} />
            </div>
            <div>
              <label className={labelCls}>{t('materialCategory')}</label>
              <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">{t('select')}</option>
                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>{t('description')}</label>
            <textarea className={`${inputCls} resize-none h-16`} value={description} onChange={e => setDescription(e.target.value)} placeholder={t('optional')} />
          </div>

          {/* Unit + Quantity + Min Qty */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{t('unit')}</label>
              <select className={inputCls} value={unit} onChange={e => setUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('materialQuantity')}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('materialMinQty')}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={minQuantity} onChange={e => setMinQuantity(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Cost + Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t('materialCostPerUnit')}</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t('supplier')}</label>
              <input className={inputCls} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder={t('optional')} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>{t('notes')}</label>
            <textarea className={`${inputCls} resize-none h-14`} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('optional')} />
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded accent-teal-600" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('materialActive')}</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {t('cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Log Material Loss Modal ──────────────────────────────────────────────────
function LogMaterialLossModal({ material, onClose, onSaved }: { material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const estimatedCost = parseFloat(qty) > 0 ? parseFloat(qty) * material.costPerUnit : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!qty.trim() || isNaN(q) || q <= 0) { showToast('error', t('materialAdjustInvalid')); return }
    setSaving(true)
    try {
      const description = `${t('materialLossExpenseDesc')} — ${material.name} (${q} ${material.unit})`
      await window.api.clinic.expenses.create({
        date: new Date().toISOString(),
        category: 'material_loss',
        description,
        amount: estimatedCost > 0 ? estimatedCost : q,
        vendor: material.supplier ?? null,
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: notes.trim() || null,
      })
      // Also reduce stock
      await window.api.clinic.materials.adjustStock(material.id, -q)
      showToast('success', t('expenseAdded'))
      onSaved()
    } catch {
      showToast('error', t('failedSaveExpense'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('logMaterialLossTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('clinicMaterialCurrentStock')}: <span className="text-rose-600 dark:text-rose-400 font-bold">{material.quantity} {material.unit}</span></p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('clinicMaterialQuantity')} ({t('unit')})</label>
              <input
                type="number" min="0.01" step="0.01"
                className={inputCls}
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="e.g. 5"
                autoFocus
              />
              {estimatedCost > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {t('expenseAmount')}: <span className="font-semibold text-rose-600 dark:text-rose-400">{estimatedCost.toFixed(2)}</span> ({material.costPerUnit.toFixed(2)} × {qty})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('expenseNotes')}</label>
              <textarea className={`${inputCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('optional')} />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
                {t('logMaterialLoss')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Log Material Expiry Modal ────────────────────────────────────────────────
function LogMaterialExpiryModal({ material, onClose, onSaved }: { material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [qty, setQty] = useState(() =>
    // default to full quantity if material is expired
    expiryStatus(material.expiryDate) === 'expired' ? String(material.quantity) : ''
  )
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const estimatedCost = parseFloat(qty) > 0 ? parseFloat(qty) * material.costPerUnit : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!qty.trim() || isNaN(q) || q <= 0) { showToast('error', t('materialAdjustInvalid')); return }
    setSaving(true)
    try {
      const description = `${t('materialExpiryExpenseDesc')} — ${material.name} (${q} ${material.unit})`
      await window.api.clinic.expenses.create({
        date: new Date().toISOString(),
        category: 'material_expiry',
        description,
        amount: estimatedCost > 0 ? estimatedCost : q,
        vendor: material.supplier ?? null,
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: notes.trim() || null,
      })
      await window.api.clinic.materials.adjustStock(material.id, -q)
      showToast('success', t('expenseAdded'))
      onSaved()
    } catch {
      showToast('error', t('failedSaveExpense'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('logMaterialExpiryTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('clinicMaterialCurrentStock')}: <span className="text-amber-600 dark:text-amber-400 font-bold">{material.quantity} {material.unit}</span></p>
            {material.expiryDate && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">{t('materialExpiryDate')}: {formatDate(material.expiryDate)}</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('logExpiredQtyLabel')} ({t('unit')})</label>
              <input
                type="number" min="0.01" step="0.01"
                className={inputCls}
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="e.g. 5"
                autoFocus
              />
              {estimatedCost > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {t('expenseAmount')}: <span className="font-semibold text-amber-600 dark:text-amber-400">{estimatedCost.toFixed(2)}</span> ({material.costPerUnit.toFixed(2)} × {qty})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('logExpiredNotes')}</label>
              <textarea className={`${inputCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('optional')} />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                {t('logMaterialExpiry')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Adjust Stock Modal ───────────────────────────────────────────────────────
function AdjustStockModal({ material, onClose, onSaved }: { material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [delta, setDelta] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const d = parseFloat(delta)
    if (!delta.trim() || isNaN(d) || d === 0) { showToast('error', t('materialAdjustInvalid')); return }
    setSaving(true)
    try {
      await window.api.clinic.materials.adjustStock(material.id, d)
      showToast('success', t('updatedSuccessfully'))
      onSaved()
    } catch {
      showToast('error', t('errorSavingRecord'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('clinicMaterialAdjustStock')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('clinicMaterialCurrentStock')}: <span className="text-teal-600 dark:text-teal-400 font-bold">{material.quantity} {material.unit}</span></p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('materialAdjustDelta')}</label>
              <input
                type="number" step="0.01"
                className={inputCls}
                value={delta}
                onChange={e => setDelta(e.target.value)}
                placeholder={t('materialAdjustPlaceholder')}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1.5">{t('materialAdjustHint')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t('save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Category Management Modal ────────────────────────────────────────────────
function CategoryManagementModal({ onClose }: { onClose: () => void }) {
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

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'

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
                    <select className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" value={editColor} onChange={e => setEditColor(e.target.value)}>
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
              <select className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" value={newColor} onChange={e => setNewColor(e.target.value)}>
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

// ─── Batch Form Values ────────────────────────────────────────────────────────
interface BatchFormValues {
  batchNumber: string
  quantity: string
  expiryDate: string
  costPerUnit: string
  supplier: string
  notes: string
  isActive: boolean
}

// ─── Batch Form (module-level — prevents remount / focus loss on parent re-render)
function BatchForm({ initial, showActive = false, saving, onSave, onCancel }: {
  initial?: Partial<BatchFormValues>
  showActive?: boolean
  saving: boolean
  onSave: (v: BatchFormValues) => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const [form, setForm] = useState<BatchFormValues>({
    batchNumber: initial?.batchNumber ?? '',
    quantity:    initial?.quantity    ?? '',
    expiryDate:  initial?.expiryDate  ?? '',
    costPerUnit: initial?.costPerUnit ?? '',
    supplier:    initial?.supplier    ?? '',
    notes:       initial?.notes       ?? '',
    isActive:    initial?.isActive    ?? true,
  })

  const set = (k: keyof Omit<BatchFormValues, 'isActive'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'
  const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1'

  return (
    <div className="space-y-3 p-4 rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t('materialBatchNumber') ?? 'Batch #'}</label>
          <input className={inputCls} value={form.batchNumber} onChange={set('batchNumber')} placeholder={t('optional')} />
        </div>
        <div>
          <label className={labelCls}>{t('materialQuantity')} *</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={form.quantity} onChange={set('quantity')} />
        </div>
        <div>
          <label className={labelCls}>{t('materialExpiryDate')}</label>
          <input type="date" className={inputCls} value={form.expiryDate} onChange={set('expiryDate')} />
        </div>
        <div>
          <label className={labelCls}>{t('materialCostPerUnit')}</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={form.costPerUnit} onChange={set('costPerUnit')} placeholder={t('optional')} />
        </div>
        <div>
          <label className={labelCls}>{t('supplier')}</label>
          <input className={inputCls} value={form.supplier} onChange={set('supplier')} placeholder={t('optional')} />
        </div>
        <div>
          <label className={labelCls}>{t('notes')}</label>
          <input className={inputCls} value={form.notes} onChange={set('notes')} placeholder={t('optional')} />
        </div>
      </div>
      {showActive && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded accent-teal-600" />
          <span className="text-sm text-slate-700 dark:text-slate-300">{t('materialActive')}</span>
        </label>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave(form)} disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t('save')}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

// ─── Batch-level: Adjust Quantity ─────────────────────────────────────────────
function BatchAdjustModal({ batch, material, onClose, onSaved }: { batch: Batch; material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [delta, setDelta] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const d = parseFloat(delta)
    if (!delta.trim() || isNaN(d) || d === 0) { showToast('error', t('materialAdjustInvalid')); return }
    const newQty = Math.max(0, batch.quantity + d)
    setSaving(true)
    try {
      await window.api.clinic.materialBatches.update(batch.id, { quantity: newQty })
      await window.api.clinic.materials.adjustStock(material.id, d)
      showToast('success', t('updatedSuccessfully'))
      onSaved()
    } catch { showToast('error', t('errorSavingRecord')) } finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('clinicMaterialAdjustStock')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3 space-y-0.5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            {batch.batchNumber && <p className="text-xs text-slate-400 font-mono">Batch #{batch.batchNumber}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('clinicMaterialCurrentStock')}: <span className="text-teal-600 dark:text-teal-400 font-bold">{batch.quantity} {material.unit}</span></p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('materialAdjustDelta')}</label>
              <input type="number" step="0.01" className={inputCls} value={delta} onChange={e => setDelta(e.target.value)} placeholder={t('materialAdjustPlaceholder')} autoFocus />
              <p className="text-xs text-slate-400 mt-1.5">{t('materialAdjustHint')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{t('save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Batch-level: Log as Loss ─────────────────────────────────────────────────
function BatchLossModal({ batch, material, onClose, onSaved }: { batch: Batch; material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const costPerUnit = batch.costPerUnit ?? material.costPerUnit
  const estimatedCost = parseFloat(qty) > 0 ? parseFloat(qty) * costPerUnit : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!qty.trim() || isNaN(q) || q <= 0 || q > batch.quantity) { showToast('error', t('materialAdjustInvalid')); return }
    const batchLabel = batch.batchNumber ? ` (Batch #${batch.batchNumber})` : ''
    setSaving(true)
    try {
      await window.api.clinic.expenses.create({
        date: new Date().toISOString(),
        category: 'material_loss',
        description: `${t('materialLossExpenseDesc')} — ${material.name}${batchLabel} (${q} ${material.unit})`,
        amount: estimatedCost > 0 ? estimatedCost : q,
        vendor: batch.supplier ?? material.supplier ?? null,
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: notes.trim() || null,
      })
      await window.api.clinic.materialBatches.update(batch.id, { quantity: Math.max(0, batch.quantity - q) })
      await window.api.clinic.materials.adjustStock(material.id, -q)
      showToast('success', t('expenseAdded'))
      onSaved()
    } catch { showToast('error', t('failedSaveExpense')) } finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('logMaterialLossTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 px-4 py-3 space-y-0.5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            {batch.batchNumber && <p className="text-xs text-slate-400 font-mono">Batch #{batch.batchNumber}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('clinicMaterialCurrentStock')}: <span className="text-rose-600 dark:text-rose-400 font-bold">{batch.quantity} {material.unit}</span></p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('clinicMaterialQuantity')} ({t('unit')})</label>
              <input type="number" min="0.01" step="0.01" max={batch.quantity} className={inputCls} value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 5" autoFocus />
              {estimatedCost > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">{t('expenseAmount')}: <span className="font-semibold text-rose-600 dark:text-rose-400">{estimatedCost.toFixed(2)}</span> ({costPerUnit.toFixed(2)} × {qty})</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('expenseNotes')}</label>
              <textarea className={`${inputCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('optional')} />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />} {t('logMaterialLoss')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Batch-level: Log as Expired ──────────────────────────────────────────────
function BatchExpiryModal({ batch, material, onClose, onSaved }: { batch: Batch; material: Material; onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [qty, setQty] = useState(String(batch.quantity))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const costPerUnit = batch.costPerUnit ?? material.costPerUnit
  const estimatedCost = parseFloat(qty) > 0 ? parseFloat(qty) * costPerUnit : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(qty)
    if (!qty.trim() || isNaN(q) || q <= 0 || q > batch.quantity) { showToast('error', t('materialAdjustInvalid')); return }
    const batchLabel = batch.batchNumber ? ` (Batch #${batch.batchNumber})` : ''
    setSaving(true)
    try {
      await window.api.clinic.expenses.create({
        date: new Date().toISOString(),
        category: 'material_expiry',
        description: `${t('materialExpiryExpenseDesc')} — ${material.name}${batchLabel} (${q} ${material.unit})`,
        amount: estimatedCost > 0 ? estimatedCost : q,
        vendor: batch.supplier ?? material.supplier ?? null,
        paymentMethod: 'cash',
        recurrence: 'one_time',
        notes: notes.trim() || null,
      })
      await window.api.clinic.materialBatches.update(batch.id, { quantity: Math.max(0, batch.quantity - q) })
      await window.api.clinic.materials.adjustStock(material.id, -q)
      showToast('success', t('expenseAdded'))
      onSaved()
    } catch { showToast('error', t('failedSaveExpense')) } finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('logMaterialExpiryTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 space-y-0.5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{material.name}</p>
            {batch.batchNumber && <p className="text-xs text-slate-400 font-mono">Batch #{batch.batchNumber}</p>}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('clinicMaterialCurrentStock')}: <span className="text-amber-600 dark:text-amber-400 font-bold">{batch.quantity} {material.unit}</span></p>
            {batch.expiryDate && <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{t('materialExpiryDate')}: {formatDate(batch.expiryDate)}</p>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('logExpiredQtyLabel')} ({t('unit')})</label>
              <input type="number" min="0.01" step="0.01" max={batch.quantity} className={inputCls} value={qty} onChange={e => setQty(e.target.value)} autoFocus />
              {estimatedCost > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">{t('expenseAmount')}: <span className="font-semibold text-amber-600 dark:text-amber-400">{estimatedCost.toFixed(2)}</span> ({costPerUnit.toFixed(2)} × {qty})</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{t('logExpiredNotes')}</label>
              <textarea className={`${inputCls} resize-none h-16`} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('optional')} />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />} {t('logMaterialExpiry')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Batch Management Modal ───────────────────────────────────────────────────
function BatchManagementModal({ material, onClose }: { material: Material; onClose: () => void }) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [logLossBatch, setLogLossBatch] = useState<Batch | null>(null)
  const [logExpiryBatch, setLogExpiryBatch] = useState<Batch | null>(null)
  const [adjustBatch, setAdjustBatch] = useState<Batch | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setBatches(await window.api.clinic.materialBatches.getByMaterial(material.id)) }
    catch { showToast('error', t('errorLoadingData')) }
    finally { setLoading(false) }
  }, [material.id, showToast, t])

  useEffect(() => { load() }, [load])

  async function handleAdd(values: BatchFormValues) {
    setSaving(true)
    try {
      await window.api.clinic.materialBatches.create(material.id, {
        batchNumber: values.batchNumber.trim() || undefined,
        quantity: parseFloat(values.quantity) || 0,
        expiryDate: values.expiryDate || undefined,
        costPerUnit: values.costPerUnit ? parseFloat(values.costPerUnit) : undefined,
        supplier: values.supplier.trim() || undefined,
        notes: values.notes.trim() || undefined,
      })
      setAdding(false)
      showToast('success', t('createdSuccessfully'))
      load()
    } catch { showToast('error', t('errorSavingRecord')) }
    finally { setSaving(false) }
  }

  async function handleUpdate(id: string, values: BatchFormValues) {
    setSaving(true)
    try {
      await window.api.clinic.materialBatches.update(id, {
        batchNumber: values.batchNumber.trim() || undefined,
        quantity: parseFloat(values.quantity) || 0,
        expiryDate: values.expiryDate || undefined,
        costPerUnit: values.costPerUnit ? parseFloat(values.costPerUnit) : undefined,
        supplier: values.supplier.trim() || undefined,
        notes: values.notes.trim() || undefined,
        isActive: values.isActive,
      })
      setEditingId(null)
      showToast('success', t('updatedSuccessfully'))
      load()
    } catch { showToast('error', t('errorSavingRecord')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    try {
      await window.api.clinic.materialBatches.delete(id)
      showToast('success', t('deletedSuccessfully'))
      load()
    } catch (err: any) {
      if (err?.message?.includes('BATCH_IN_USE')) showToast('error', 'Batch is used in a session and cannot be deleted.')
      else showToast('error', t('errorDeletingRecord'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Boxes className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('manageBatches') ?? 'Manage Batches'}</h3>
              <p className="text-xs text-slate-400">{material.name} &middot; {t('materialCurrentStock') ?? 'Stock'}: <span className="font-medium text-teal-600 dark:text-teal-400">{material.quantity} {material.unit}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
          ) : batches.length === 0 && !adding ? (
            <p className="text-center text-sm text-slate-400 py-6">{t('noBatches') ?? 'No batches yet. Add one to start tracking.'}</p>
          ) : (
            batches.map(b => {
              const exp = b.expiryDate ? new Date(b.expiryDate) : null
              const now = new Date()
              const soon = new Date(); soon.setDate(now.getDate() + 30)
              const expSt = exp ? (exp < now ? 'expired' : exp <= soon ? 'soon' : 'ok') : 'none'

              return (
                <div key={b.id} className={`rounded-xl border overflow-hidden ${!b.isActive ? 'opacity-50 border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700'}`}>
                  {editingId === b.id ? (
                    <div className="p-3">
                      <BatchForm
                        key={b.id}
                        initial={{
                          batchNumber: b.batchNumber ?? '',
                          quantity: b.quantity.toString(),
                          expiryDate: b.expiryDate ? b.expiryDate.slice(0, 10) : '',
                          costPerUnit: b.costPerUnit?.toString() ?? '',
                          supplier: b.supplier ?? '',
                          notes: b.notes ?? '',
                          isActive: b.isActive,
                        }}
                        showActive
                        saving={saving}
                        onSave={values => handleUpdate(b.id, values)}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-3 bg-white dark:bg-slate-800">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {b.batchNumber && <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-300">#{b.batchNumber}</span>}
                          {!b.isActive && <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">inactive</span>}
                          {expSt === 'expired' && <span className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />Expired {formatDate(b.expiryDate)}</span>}
                          {expSt === 'soon' && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Expires {formatDate(b.expiryDate)}</span>}
                          {expSt === 'ok' && <span className="text-xs text-slate-500">Exp: {formatDate(b.expiryDate)}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{b.quantity} {material.unit}</span>
                          {b.supplier && <span className="text-xs text-slate-400">{b.supplier}</span>}
                          {b.costPerUnit != null && <span className="text-xs text-slate-400">{b.costPerUnit} / {material.unit}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setAdjustBatch(b)} title={t('clinicMaterialAdjustStock')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setLogLossBatch(b)} title={t('logMaterialLoss')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                          <TrendingDown className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setLogExpiryBatch(b)} title={t('logMaterialExpiry')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                          <AlertCircle className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingId(b.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
          {adding && (
            <BatchForm
              key="new-batch"
              saving={saving}
              onSave={handleAdd}
              onCancel={() => setAdding(false)}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => setAdding(true)}
            disabled={adding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t('addBatch') ?? 'Add Batch'}
          </button>
        </div>
      </div>
      {adjustBatch && <BatchAdjustModal batch={adjustBatch} material={material} onClose={() => setAdjustBatch(null)} onSaved={() => { setAdjustBatch(null); load() }} />}
      {logLossBatch && <BatchLossModal batch={logLossBatch} material={material} onClose={() => setLogLossBatch(null)} onSaved={() => { setLogLossBatch(null); load() }} />}
      {logExpiryBatch && <BatchExpiryModal batch={logExpiryBatch} material={material} onClose={() => setLogExpiryBatch(null)} onSaved={() => { setLogExpiryBatch(null); load() }} />}
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onCancel}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('confirmDelete')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t('cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function MaterialsTab() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<MaterialStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all')
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'expiring_soon' | 'valid' | 'no_expiry'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiryDate' | 'updatedAt'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [managingBatchesFor, setManagingBatchesFor] = useState<Material | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    try { setCategories(await window.api.clinic.materialCategories.getAll()) } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter, stockFilter, expiryFilter, sortBy, sortDir, pageSize])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const skip = (page - 1) * pageSize
      const [res, s] = await Promise.all([
        window.api.clinic.materials.getAll({
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined,
          stockStatus: stockFilter,
          expiryStatus: expiryFilter,
          sortBy,
          sortDir,
          skip,
          take: pageSize,
        }),
        window.api.clinic.materials.stats(),
      ])
      setMaterials(res.data ?? [])
      setTotal(res.total ?? 0)
      setHasMore(Boolean(res.hasMore))
      setStats(s)
    } catch {
      showToast('error', t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, categoryFilter, stockFilter, expiryFilter, sortBy, sortDir, page, pageSize, showToast, t])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCategories() }, [loadCategories])

  async function handleDelete(id: string) {
    setDeleteConfirmId(id)
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    setDeleting(id)
    try {
      await window.api.clinic.materials.delete(id)
      showToast('success', t('deletedSuccessfully'))
      load()
    } catch (err: any) {
      if (err?.message?.includes('MATERIAL_IN_USE')) {
        showToast('error', t('materialInUseError'))
      } else {
        showToast('error', t('errorDeletingRecord'))
      }
    } finally {
      setDeleting(null)
    }
  }

  function clearFilters() {
    setSearch('')
    setCategoryFilter('')
    setStockFilter('all')
    setExpiryFilter('all')
    setSortBy('name')
    setSortDir('asc')
    setPage(1)
  }

  const hasActiveFilters = Boolean(search.trim() || categoryFilter || stockFilter !== 'all' || expiryFilter !== 'all' || sortBy !== 'name' || sortDir !== 'asc')

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Package className="h-5 w-5" />} label={t('materialStatsTotal')} value={stats.total} color="teal" onClick={() => { setStockFilter('all'); setExpiryFilter('all') }} active={stockFilter === 'all' && expiryFilter === 'all'} />
          <StatCard icon={<AlertTriangle className="h-5 w-5" />} label={t('materialStatsLowStock')} value={stats.lowStock} color={stats.lowStock > 0 ? 'amber' : 'teal'} onClick={() => setStockFilter('low_stock')} active={stockFilter === 'low_stock'} />
          <StatCard icon={<AlertCircle className="h-5 w-5" />} label={t('materialStatsExpired')} value={stats.expired} color={stats.expired > 0 ? 'red' : 'teal'} onClick={() => setExpiryFilter('expired')} active={expiryFilter === 'expired'} />
          <StatCard icon={<Layers className="h-5 w-5" />} label={t('materialStatsExpiringSoon')} value={stats.expiringSoon} color={stats.expiringSoon > 0 ? 'orange' : 'teal'} onClick={() => setExpiryFilter('expiring_soon')} active={expiryFilter === 'expiring_soon'} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('materialSearch')}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>

          {/* Stock filter */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
          >
            <option value="all">{t('materialStockAll') ?? 'All stock'}</option>
            <option value="in_stock">{t('materialStockIn') ?? 'In stock'}</option>
            <option value="out_of_stock">{t('materialStockOut') ?? 'Out of stock'}</option>
            <option value="low_stock">{t('materialStatsLowStock')}</option>
          </select>

          {/* Expiry filter */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value as typeof expiryFilter)}
          >
            <option value="all">{t('materialExpiryAll') ?? 'All expiry'}</option>
            <option value="expired">{t('materialExpiryExpired') ?? 'Expired'}</option>
            <option value="expiring_soon">{t('materialExpirySoon') ?? 'Expiring soon'}</option>
            <option value="valid">{t('materialExpiryValid') ?? 'Valid'}</option>
            <option value="no_expiry">{t('materialExpiryNone') ?? 'No expiry'}</option>
          </select>

          {/* Sort by */}
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors hover:border-slate-300 dark:hover:border-slate-600"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="name">{t('materialSortName') ?? 'Sort: Name'}</option>
            <option value="quantity">{t('materialSortQuantity') ?? 'Sort: Quantity'}</option>
            <option value="expiryDate">{t('materialSortExpiry') ?? 'Sort: Expiry'}</option>
            <option value="updatedAt">{t('materialSortUpdated') ?? 'Sort: Updated'}</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            {sortDir === 'asc' ? (t('ascending') ?? 'Asc') : (t('descending') ?? 'Desc')}
          </button>

          <button
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('clearFilters') ?? 'Clear filters'}
            </button>
          )}

          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-white bg-violet-600 hover:bg-violet-700 text-sm font-semibold transition-colors"
          >
            <Tag className="h-4 w-4" />
            {t('categories') ?? 'Categories'}
          </button>

          <button
            onClick={() => { setEditingMaterial(null); setShowFormModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm shadow-teal-500/20"
          >
            <Plus className="h-4 w-4" />
            {t('newMaterial')}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <MaterialsTableSkeleton />
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Package className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">{t('noMaterials')}</p>
          <button
            onClick={() => { setEditingMaterial(null); setShowFormModal(true) }}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" /> {t('newMaterial')}
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">{t('materialName')}</th>
                <th className="text-left px-5 py-3">{t('materialCategory')}</th>
                <th className="text-center px-5 py-3">{t('materialQuantity')}</th>
                <th className="text-center px-5 py-3">{t('materialExpiryDate')}</th>
                <th className="text-center px-5 py-3">{t('status')}</th>
                <th className="text-right px-5 py-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {materials.map(m => {
                const expStatus = expiryStatus(m.expiryDate)
                const isLow = m.minQuantity > 0 && m.quantity <= m.minQuantity
                return (
                  <tr key={m.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!m.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                      {m.supplier && <div className="text-xs text-slate-400 mt-0.5">{m.supplier}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.category ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryBadgeCls(categories.find(c => c.name === m.category)?.color ?? 'slate')}`}>
                          {m.category}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`font-semibold ${m.quantity <= 0 ? 'text-red-600 dark:text-red-400' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {m.quantity}
                      </span>
                      <span className="text-slate-400 text-xs"> {m.unit}</span>
                      {m.quantity <= 0 && <span className="ml-1 text-red-500 text-xs">●</span>}
                      {m.quantity > 0 && isLow && <span className="ml-1 text-amber-500 text-xs">⚠</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs">
                      {expStatus === 'expired' && (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <AlertCircle className="h-3 w-3" />{formatDate(m.expiryDate)}
                        </span>
                      )}
                      {expStatus === 'soon' && (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle className="h-3 w-3" />{formatDate(m.expiryDate)}
                        </span>
                      )}
                      {expStatus === 'ok' && <span className="text-slate-600 dark:text-slate-300">{formatDate(m.expiryDate)}</span>}
                      {expStatus === 'none' && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {m.isActive
                        ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" />{t('active')}</span>
                        : <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium"><X className="h-3.5 w-3.5" />{t('inactive')}</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setManagingBatchesFor(m)}
                          title={t('manageBatches') ?? 'Manage Batches'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Boxes className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingMaterial(m); setShowFormModal(true) }}
                          title={t('edit')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          title={t('delete')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          {deleting === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('clinicMaterialShowing') ?? 'Showing'} {materials.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} {t('clinicMaterialOf') ?? 'of'} {total}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500 dark:text-slate-400">{t('rowsPerPage') ?? 'Rows'}:</label>
          <select
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {t('clinicMaterialPrevious') ?? 'Previous'}
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('clinicMaterialPage') ?? 'Page'} {page}</span>
          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {t('clinicMaterialNext') ?? 'Next'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showFormModal && (
        <MaterialFormModal
          existing={editingMaterial}
          onClose={() => { setShowFormModal(false); setEditingMaterial(null) }}
          onSaved={() => { setShowFormModal(false); setEditingMaterial(null); load() }}
        />
      )}
      {managingBatchesFor && (
        <BatchManagementModal
          material={managingBatchesFor}
          onClose={() => { setManagingBatchesFor(null); load() }}
        />
      )}
      {showCategoryModal && (
        <CategoryManagementModal
          onClose={() => { setShowCategoryModal(false); loadCategories() }}
        />
      )}
      {deleteConfirmId && (
        <DeleteConfirmModal
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}

function MaterialsTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            <th className="px-4 py-3"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></th>
            <th className="px-4 py-3"><div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></th>
            <th className="px-4 py-3"><div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></th>
            <th className="px-4 py-3"><div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></th>
            <th className="px-4 py-3"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></th>
            <th className="px-4 py-3"><div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, idx) => (
            <tr key={idx} className="border-t border-slate-100 dark:border-slate-700">
              <td className="px-4 py-3"><div className="h-3 w-36 bg-slate-200 dark:bg-slate-700 rounded" /></td>
              <td className="px-4 py-3"><div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
              <td className="px-4 py-3"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
              <td className="px-4 py-3"><div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
              <td className="px-4 py-3"><div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
              <td className="px-4 py-3"><div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Stat card helper ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, onClick, active }: { icon: ReactNode; label: string; value: number; color: string; onClick?: () => void; active?: boolean }) {
  const iconCls: Record<string, string> = {
    teal:   'bg-teal-100   dark:bg-teal-900/30   text-teal-600   dark:text-teal-400',
    amber:  'bg-amber-100  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400',
    red:    'bg-red-100    dark:bg-red-900/30    text-red-600    dark:text-red-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border bg-white dark:bg-slate-800 p-5 flex items-start gap-4 transition-all ${active ? 'border-teal-400 dark:border-teal-500 ring-2 ring-teal-200/60 dark:ring-teal-700/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
    >
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconCls[color] ?? iconCls.teal}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </button>
  )
}
