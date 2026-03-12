/**
 * PantryTab – Ingredient stock tracking with low-stock alerts
 */
import { useState, useEffect } from 'react'
import { Package, Plus, AlertTriangle, Edit2, Trash2, SlidersHorizontal, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface PantryIngredient {
  id: string
  name: string
  currentStock: number
  unit: string
  costPerUnit: number
  lowStockThreshold: number | null
  reorderPoint: number | null
  reorderQuantity: number | null
  lastOrderedDate: string | null
  supplierName: string | null
  notes: string | null
  _count?: { recipeIngredients: number }
}

const EMPTY_FORM = {
  id: undefined as string | undefined,
  name: '',
  currentStock: 0,
  unit: 'kg',
  costPerUnit: 0,
  lowStockThreshold: '' as string | number,
  reorderPoint: '' as string | number,
  reorderQuantity: '' as string | number,
  supplierName: '',
  notes: ''
}

export default function PantryTab() {
  const { t } = useLanguage()
  const [items, setItems] = useState<PantryIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{
    id?: string
    name: string
    currentStock: number
    unit: string
    costPerUnit: number
    lowStockThreshold: string | number
    reorderPoint: string | number
    reorderQuantity: string | number
    supplierName: string
    notes: string
  }>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<PantryIngredient | null>(null)
  const [adjustAmt, setAdjustAmt] = useState('')
  const [reorderTarget, setReorderTarget] = useState<PantryIngredient | null>(null)
  const [reorderReceived, setReorderReceived] = useState('')
  const [reorderSaving, setReorderSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api.bakery.getPantry()
      setItems(data)
    } catch {
      setError(t('bakeryPantryLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setShowForm(true) }
  const openEdit = (item: PantryIngredient) => {
    setForm({
      id: item.id,
      name: item.name,
      currentStock: item.currentStock,
      unit: item.unit,
      costPerUnit: item.costPerUnit,
      lowStockThreshold: item.lowStockThreshold ?? ('' as unknown as number),
      reorderPoint: item.reorderPoint ?? ('' as unknown as number),
      reorderQuantity: item.reorderQuantity ?? ('' as unknown as number),
      supplierName: item.supplierName ?? '',
      notes: item.notes ?? ''
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await window.api.bakery.upsertPantryIngredient({
        id: form.id,
        name: form.name.trim(),
        currentStock: Number(form.currentStock) || 0,
        unit: form.unit,
        costPerUnit: Number(form.costPerUnit) || 0,
        lowStockThreshold: form.lowStockThreshold !== '' ? Number(form.lowStockThreshold) : undefined,
        reorderPoint: form.reorderPoint !== '' ? Number(form.reorderPoint) : undefined,
        reorderQuantity: form.reorderQuantity !== '' ? Number(form.reorderQuantity) : undefined,
        supplierName: form.supplierName || undefined,
        notes: form.notes || undefined
      })
      setShowForm(false)
      load()
    } catch {
      setError(t('bakeryPantrySaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const doReorder = async () => {
    if (!reorderTarget) return
    setReorderSaving(true)
    try {
      await window.api.bakery.markPantryReordered({
        id: reorderTarget.id,
        quantityReceived: reorderReceived !== '' ? Number(reorderReceived) : undefined
      })
      setReorderTarget(null)
      setReorderReceived('')
      load()
    } catch {
      setError(t('bakeryReorderFailed'))
    } finally {
      setReorderSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t('bakeryDeletePantryConfirm'))) return
    try {
      await window.api.bakery.deletePantryIngredient(id)
      load()
    } catch {
      setError(t('bakeryPantryLoadFailed'))
    }
  }

  const doAdjust = async () => {
    if (!adjustTarget || adjustAmt === '') return
    try {
      await window.api.bakery.adjustPantryStock({ id: adjustTarget.id, adjustment: Number(adjustAmt) })
      setAdjustTarget(null)
      setAdjustAmt('')
      load()
    } catch {
      setError(t('bakeryPantrySaveFailed'))
    }
  }

  const isLow = (item: PantryIngredient) =>
    item.lowStockThreshold !== null && item.lowStockThreshold > 0 && item.currentStock <= item.lowStockThreshold
  const needsReorder = (item: PantryIngredient) =>
    item.reorderPoint !== null && item.currentStock <= item.reorderPoint

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('bakeryPantryTab')}</h2>
          <p className="text-sm text-slate-500">{t('bakeryPantrySubtitle')}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('bakeryAddIngredientStock')}
        </button>
      </div>

      {/* Low stock alerts */}
      {items.filter(isLow).length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-medium">{t('bakeryLowStock')}: </span>
            {items.filter(isLow).map(i => i.name).join(', ')}
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            {form.id ? t('bakeryEditIngredientStock') : t('bakeryAddIngredientStock')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryIngredientStockName')}</label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryCurrentStock')}</label>
              <input
                type="number" step="0.01"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.currentStock}
                onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryIngredientUnit')}</label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryPantryCostPerUnit')}</label>
              <input
                type="number" step="0.01"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.costPerUnit}
                onChange={e => setForm(f => ({ ...f, costPerUnit: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryLowStockThreshold')}</label>
              <input
                type="number" step="0.01"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.lowStockThreshold}
                onChange={e => setForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryReorderPoint')}</label>
              <input
                type="number" step="0.01" placeholder="e.g. 500"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.reorderPoint}
                onChange={e => setForm(f => ({ ...f, reorderPoint: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakeryReorderQuantity')}</label>
              <input
                type="number" step="0.01" placeholder="e.g. 2000"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.reorderQuantity}
                onChange={e => setForm(f => ({ ...f, reorderQuantity: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('bakerySupplierName')}</label>
              <input
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                value={form.supplierName}
                onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {t('bakeryCancelBtn')}
            </button>
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="px-3 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50"
            >
              {saving ? '…' : t('bakerySaveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* Reorder modal */}
      {reorderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-5 w-80">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{t('bakeryMarkReordered')}</h3>
            <p className="text-xs text-slate-500 mb-1">{reorderTarget.name}</p>
            {reorderTarget.reorderQuantity && (
              <p className="text-xs text-amber-600 mb-3">{t('bakeryReorderQuantity')}: {reorderTarget.reorderQuantity} {reorderTarget.unit}</p>
            )}
            <label className="block text-xs text-slate-500 mb-1">{t('bakeryReceiveQty')} ({t('bakeryIngredientUnit')}: {reorderTarget.unit})</label>
            <input
              type="number" step="0.01" min="0"
              placeholder="Optional"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm mb-3"
              value={reorderReceived}
              onChange={e => setReorderReceived(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setReorderTarget(null); setReorderReceived('') }} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">
                {t('bakeryCancelBtn')}
              </button>
              <button onClick={doReorder} disabled={reorderSaving} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50">
                {reorderSaving ? '…' : <><CheckCircle2 className="h-4 w-4" /> {t('bakeryReorderDone')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust stock modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-5 w-80">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{t('bakeryAdjustStock')}</h3>
            <p className="text-xs text-slate-500 mb-3">{adjustTarget.name} — {t('bakeryCurrentStock')}: {adjustTarget.currentStock} {adjustTarget.unit}</p>
            <label className="block text-xs text-slate-500 mb-1">{t('bakeryAdjustmentAmount')}</label>
            <input
              type="number" step="0.01"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm mb-3"
              value={adjustAmt}
              onChange={e => setAdjustAmt(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAdjustTarget(null); setAdjustAmt('') }} className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">
                {t('bakeryCancelBtn')}
              </button>
              <button onClick={doAdjust} disabled={adjustAmt === ''} className="px-3 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50">
                {t('bakeryAdjustStock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('bakeryLoadingRecipes')}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{t('bakeryNoPantryItems')}</p>
          <p className="text-slate-400 text-sm">{t('bakeryNoPantryDesc')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('bakeryIngredientStockName')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('bakeryCurrentStock')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('bakeryPantryCostPerUnit')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('bakerySupplierName')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('bakeryScheduleStatus')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('bakeryLinkedRecipes')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {items.map(item => (
                <tr key={item.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-300">
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-end text-slate-600 dark:text-slate-400">
                    {item.costPerUnit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.supplierName ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isLow(item)
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {isLow(item) ? <AlertTriangle className="h-3 w-3" /> : null}
                        {isLow(item) ? t('bakeryLowStock') : t('bakeryInStock')}
                      </span>
                      {needsReorder(item) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <ShoppingCart className="h-3 w-3" /> {t('bakeryNeedsReorder')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{item._count?.recipeIngredients ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {needsReorder(item) && (
                        <button
                          onClick={() => { setReorderTarget(item); setReorderReceived('') }}
                          title={t('bakeryMarkReordered')}
                          className="p-1.5 rounded-lg text-amber-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setAdjustTarget(item); setAdjustAmt('') }}
                        title={t('bakeryAdjustStock')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        title={t('bakeryEditIngredientStock')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
