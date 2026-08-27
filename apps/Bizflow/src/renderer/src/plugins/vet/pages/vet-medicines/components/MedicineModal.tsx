
import React, { useState } from 'react'
import { Loader2, X, Settings } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS } from '../constants'
import { UnitManagerModal } from './UnitManagerModal'
import { CategoryManagerModal } from './CategoryManagerModal'
import type { Medicine, UnitItem } from '../types'

interface MedicineModalProps {
  initial?: Medicine | null
  categories: string[]
  units: string[]
  unitRecords: UnitItem[]
  onRefresh: () => void
  onUnitsChange: () => void
  onSave: () => void
  onClose: () => void
}

export const MedicineModal: React.FC<MedicineModalProps> = ({
  initial,
  categories,
  units,
  unitRecords,
  onRefresh,
  onUnitsChange,
  onSave,
  onClose
}) => {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [showUnitMgr, setShowUnitMgr] = useState(false)
  const [showCatMgr, setShowCatMgr] = useState(false)

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    category: initial?.category ?? 'general',
    unit: initial?.unit ?? 'tablet',
    subUnit: initial?.subUnit ?? '',
    subUnitsPerContainer: initial?.subUnitsPerContainer ? String(initial.subUnitsPerContainer) : '',
    description: initial?.description ?? '',
    minimumStock: String(initial?.minimumStock ?? 0)
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const trimmedSubUnit = form.subUnit.trim() || null
      const subUnitsPerContainer =
        trimmedSubUnit && form.subUnitsPerContainer ? parseFloat(form.subUnitsPerContainer) : null
      const isValidRatio =
        subUnitsPerContainer && isFinite(subUnitsPerContainer) && subUnitsPerContainer > 0

      const data: any = {
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        minimumStock: parseFloat(form.minimumStock) || 0,
        description: form.description.trim() || null,
        subUnit: trimmedSubUnit,
        subUnitsPerContainer: isValidRatio ? subUnitsPerContainer : null
      }

      if (initial) {
        await (window as any).api?.vet?.medicines?.update(initial.id, data)
      } else {
        await (window as any).api?.vet?.medicines?.create(data)
      }

      toast.success(
        initial
          ? t('vetMedicineUpdated') || 'Medicine updated'
          : t('vetMedicineAdded') || 'Medicine added'
      )
      onSave()
    } catch (err: any) {
      toast.error(err?.message ?? 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">
            {initial ? t('vetEditMedicine') || 'Edit Medicine' : t('vetAddMedicine') || 'Add Medicine'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('vetMedNameLabel') || 'Name'} *
            </label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Amoxicillin"
              className={INPUT_BASE_CLS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t('vetMedCategory') || 'Category'}
              </label>
              <div className="flex gap-1">
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className={`${INPUT_BASE_CLS} flex-1`}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCatMgr(true)}
                  className="shrink-0 px-2 py-1.5 text-slate-400 hover:text-violet-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title={t('vetManageCategories') || 'Manage Categories'}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t('vetMedUnit') || 'Container Unit'}
              </label>
              <div className="flex gap-1">
                <select
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className={`${INPUT_BASE_CLS} flex-1`}
                >
                  {units.map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowUnitMgr(true)}
                  className="shrink-0 px-2 py-1.5 text-slate-400 hover:text-violet-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title={t('vetManageUnits') || 'Manage Units'}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>

          {showUnitMgr && (
            <UnitManagerModal
              unitRecords={unitRecords}
              onRefresh={onUnitsChange}
              onClose={() => setShowUnitMgr(false)}
            />
          )}
          {showCatMgr && (
            <CategoryManagerModal
              onRefresh={onRefresh}
              onClose={() => setShowCatMgr(false)}
            />
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('vetUnitConversion') || 'Unit Conversion'}{' '}
              <span className="font-normal text-slate-400">
                ({t('vetUnitConversionOptional') || 'optional'})
              </span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {t('vetSubUnitLabel') || 'Sub-unit label'}
                </label>
                <input
                  value={form.subUnit}
                  onChange={e => setForm(f => ({ ...f, subUnit: e.target.value }))}
                  placeholder="e.g. ml, cc, mg"
                  className={INPUT_BASE_CLS}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {t('vetSubUnitsPerContainer', { unit: form.unit || 'container' }) ||
                    `Sub-units per ${form.unit || 'container'}`}
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={form.subUnitsPerContainer}
                  onChange={e => setForm(f => ({ ...f, subUnitsPerContainer: e.target.value }))}
                  placeholder="e.g. 100"
                  className={INPUT_BASE_CLS}
                />
              </div>
            </div>
            {form.subUnit && form.subUnitsPerContainer && (
              <p className="text-[11px] text-violet-600 dark:text-violet-400">
                1 {form.unit} = {form.subUnitsPerContainer} {form.subUnit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('vetMedMinStock') || 'Min. Stock Alert'}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.minimumStock}
              onChange={e => setForm(f => ({ ...f, minimumStock: e.target.value }))}
              className={INPUT_BASE_CLS}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('vetMedDescription') || 'Description'}
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={`${INPUT_BASE_CLS} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl"
            >
              {t('vetMedCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('vetMedSave') || 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}