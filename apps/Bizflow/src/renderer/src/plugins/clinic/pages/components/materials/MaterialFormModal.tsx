import { useState, useEffect } from 'react'
import { Package, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Category, FormModalProps } from './materialsTab.types'
import { UNITS } from './materialsTab.shared'

export default function MaterialFormModal({ existing, onClose, onSaved }: FormModalProps) {
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

  const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-shadow'
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
