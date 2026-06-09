/**
 * PantryTab – Ingredient stock tracking with low-stock alerts
 */
import { useState, useEffect } from 'react'
import { Package, Plus, AlertTriangle, Edit2, Trash2, SlidersHorizontal, ShoppingCart, CheckCircle2, TrendingUp, TrendingDown, Target, DollarSign, Warehouse, Bell, RotateCcw } from 'lucide-react'
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
  const [adjustMode, setAdjustMode] = useState<'add' | 'remove' | 'set'>('add')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [reorderTarget, setReorderTarget] = useState<PantryIngredient | null>(null)
  const [reorderReceived, setReorderReceived] = useState('')
  const [reorderPrice, setReorderPrice] = useState('')
  const [reorderNotes, setReorderNotes] = useState('')
  const [reorderDate, setReorderDate] = useState('')
  const [reorderSaving, setReorderSaving] = useState(false)
  const [showBulkRestock, setShowBulkRestock] = useState(false)
  const [bulkItems, setBulkItems] = useState<{ id: string; name: string; unit: string; currentStock: number; qty: string; price: string }[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

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

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setFormError(''); setShowForm(true) }
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
    setFormError('')
    setShowForm(true)
  }

  const save = async () => {
    setFormError('')
    const name = form.name.trim()
    if (!name) { setFormError(t('bakeryIngredientNameRequired')); return }
    if (isDuplicateName) { setFormError(t('bakeryDuplicateIngredient')); return }
    if (!form.unit.trim()) { setFormError(t('bakeryUnitRequired')); return }
    if (Number(form.costPerUnit) < 0) { setFormError(t('bakeryCostNegative')); return }
    if (form.lowStockThreshold !== '' && Number(form.lowStockThreshold) < 0) { setFormError(t('bakeryLowThresholdNegative')); return }
    if (form.reorderPoint !== '' && Number(form.reorderPoint) < 0) { setFormError(t('bakeryReorderPointNegative')); return }
    if (form.reorderQuantity !== '' && Number(form.reorderQuantity) < 0) { setFormError(t('bakeryReorderQtyNegative')); return }

    setSaving(true)
    try {
      await window.api.bakery.upsertPantryIngredient({
        id: form.id,
        name,
        currentStock: Number(form.currentStock) || 0,
        unit: form.unit.trim(),
        costPerUnit: Number(form.costPerUnit) || 0,
        lowStockThreshold: form.lowStockThreshold !== '' ? Number(form.lowStockThreshold) : undefined,
        reorderPoint: form.reorderPoint !== '' ? Number(form.reorderPoint) : undefined,
        reorderQuantity: form.reorderQuantity !== '' ? Number(form.reorderQuantity) : undefined,
        supplierName: form.supplierName || undefined,
        notes: form.notes || undefined
      })
      setShowForm(false)
      load()
    } catch (err: any) {
      if (err?.message === 'DUPLICATE_NAME') {
        setFormError(t('bakeryDuplicateIngredient'))
      } else {
        setFormError(t('bakerySaveInputError'))
      }
    } finally {
      setSaving(false)
    }
  }

  const openReorder = (item: PantryIngredient) => {
    setReorderTarget(item)
    setReorderReceived(item.reorderQuantity != null ? String(item.reorderQuantity) : '')
    setReorderPrice(item.costPerUnit > 0 ? String(item.costPerUnit) : '')
    setReorderNotes('')
    setReorderDate(new Date().toISOString().split('T')[0])
  }

  const doReorder = async () => {
    if (!reorderTarget) return
    setReorderSaving(true)
    try {
      await window.api.bakery.markPantryReordered({
        id: reorderTarget.id,
        quantityReceived: reorderReceived !== '' ? Number(reorderReceived) : undefined,
        purchasePrice: reorderPrice !== '' ? Number(reorderPrice) : undefined
      })
      setReorderTarget(null)
      setReorderReceived('')
      setReorderPrice('')
      setReorderNotes('')
      load()
    } catch {
      setError(t('bakeryReorderFailed'))
    } finally {
      setReorderSaving(false)
    }
  }

  const openBulkRestock = () => {
    const needingRestock = items.filter(i => needsReorder(i) || isLow(i))
    setBulkItems(needingRestock.map(i => ({
      id: i.id,
      name: i.name,
      unit: i.unit,
      currentStock: i.currentStock,
      qty: i.reorderQuantity != null ? String(i.reorderQuantity) : '',
      price: i.costPerUnit > 0 ? String(i.costPerUnit) : ''
    })))
    setShowBulkRestock(true)
  }

  const doBulkRestock = async () => {
    setBulkSaving(true)
    try {
      const payload = bulkItems
        .filter(i => i.qty !== '' && Number(i.qty) > 0)
        .map(i => ({
          id: i.id,
          quantityReceived: Number(i.qty),
          purchasePrice: i.price !== '' ? Number(i.price) : undefined
        }))
      await window.api.bakery.bulkRestock(payload)
      setShowBulkRestock(false)
      load()
    } catch {
      setError(t('bakeryReorderFailed'))
    } finally {
      setBulkSaving(false)
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

  const openAdjust = (item: PantryIngredient) => {
    setAdjustTarget(item)
    setAdjustAmt('')
    setAdjustMode('add')
    setAdjustReason('')
  }

  const calcNewStock = () => {
    if (!adjustTarget || adjustAmt === '') return adjustTarget?.currentStock ?? 0
    const n = Number(adjustAmt)
    if (adjustMode === 'add') return adjustTarget.currentStock + n
    if (adjustMode === 'remove') return adjustTarget.currentStock - n
    return n // set
  }

  const doAdjust = async () => {
    if (!adjustTarget || adjustAmt === '') return
    setAdjustSaving(true)
    try {
      let delta: number
      if (adjustMode === 'add') delta = Number(adjustAmt)
      else if (adjustMode === 'remove') delta = -Number(adjustAmt)
      else delta = Number(adjustAmt) - adjustTarget.currentStock // set exact
      await window.api.bakery.adjustPantryStock({ id: adjustTarget.id, adjustment: delta, reason: adjustReason || undefined })
      setAdjustTarget(null)
      setAdjustAmt('')
      setAdjustReason('')
      load()
    } catch {
      setError(t('bakeryPantrySaveFailed'))
    } finally {
      setAdjustSaving(false)
    }
  }

  const isDuplicateName = form.name.trim() !== '' &&
    items.some(i => i.name.trim().toLowerCase() === form.name.trim().toLowerCase() && i.id !== form.id)

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
        <div className="flex items-center gap-2">
          {items.some(i => needsReorder(i) || isLow(i)) && (
            <button
              onClick={openBulkRestock}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              {t('bakeryRestockAll')}
            </button>
          )}
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('bakeryAddIngredientStock')}
          </button>
        </div>
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

      {/* Add / Edit form — modal overlay */}
      {showForm && (() => {
        const stockValue = form.currentStock > 0 && form.costPerUnit > 0
          ? (form.currentStock * form.costPerUnit).toFixed(2)
          : null
        const QUICK_UNITS = ['g','kg','ml','L','pcs','bag','box','can','bottle','bunch','tsp','tbsp','cup']
        const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors'
        const labelCls = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {form.id ? t('bakeryEditIngredient') : t('bakeryAddIngredient')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {form.id ? t('bakeryEditIngredientDesc') : t('bakeryAddIngredientDesc')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {/* Section 1 — Basic Info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Warehouse className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('bakeryBasicInfo')}</span>
                  </div>
                  <div className="space-y-3">
                    {/* Name */}
                    <div>
                      <label className={labelCls}>
                        {t('bakeryIngredientName')} <span className="text-red-500 normal-case">*</span>
                      </label>
                      <input
                        autoFocus
                        className={`${inputCls} text-base font-medium ${
                          (!form.name.trim() && form.name !== '') || isDuplicateName
                            ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                            : form.name.trim() && !isDuplicateName
                            ? 'border-green-400 focus:ring-green-200 focus:border-green-400'
                            : ''
                        }`}
                        value={form.name}
                        onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError('') }}
                        placeholder={t('bakeryIngredientNamePlaceholder')}
                      />
                      {!form.name.trim() && form.name !== '' && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {t('bakeryNameRequired')}
                        </p>
                      )}
                      {isDuplicateName && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> "{form.name.trim()}" {t('bakeryNameAlreadyExists')}
                        </p>
                      )}
                    </div>

                    {/* Stock + Unit row */}
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-3">
                        <label className={labelCls}>{t('bakeryCurrentStock')}</label>
                        <input
                          type="number" step="0.01" min="0"
                          className={inputCls}
                          value={form.currentStock}
                          onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>{t('bakeryUnit')}</label>
                        <input
                          list="pantry-unit-suggestions"
                          className={inputCls}
                          value={form.unit}
                          onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                          placeholder="kg, g, L…"
                        />
                        <datalist id="pantry-unit-suggestions">
                          {QUICK_UNITS.map(u => <option key={u} value={u} />)}
                        </datalist>
                      </div>
                    </div>

                    {/* Quick unit chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_UNITS.map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, unit: u }))}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            form.unit === u
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 2 — Pricing */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('bakeryPricing')}</span>
                  </div>
                  <div>
                    <label className={labelCls}>{t('bakeryCostPerUnit', { unit: form.unit || t('bakeryUnit') })}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                      <input
                        type="number" step="0.01" min="0"
                        className={`${inputCls} pl-7`}
                        value={form.costPerUnit}
                        onChange={e => setForm(f => ({ ...f, costPerUnit: Number(e.target.value) }))}
                        placeholder="0.00"
                      />
                    </div>
                    {stockValue && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('bakeryTotalStockValue')} <span className="font-semibold">${stockValue}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Section 3 — Stock Alerts */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('bakeryStockAlertsSection')}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-700/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('bakeryLowStockAlert')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('bakeryLowStockAlertDesc')}</p>
                      </div>
                      <input
                        type="number" step="0.01" min="0" placeholder="—"
                        className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm text-end focus:outline-none focus:ring-2 focus:ring-amber-400 shrink-0"
                        value={form.lowStockThreshold}
                        onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))}
                      />
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between gap-4 bg-white dark:bg-slate-800">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('bakeryReorderPoint')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('bakeryReorderPointDesc')}</p>
                      </div>
                      <input
                        type="number" step="0.01" min="0" placeholder="—"
                        className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm text-end focus:outline-none focus:ring-2 focus:ring-amber-400 shrink-0"
                        value={form.reorderPoint}
                        onChange={e => setForm(f => ({ ...f, reorderPoint: e.target.value }))}
                      />
                    </div>
                  </div>
                  {/* Mini visual: current vs thresholds */}
                  {(form.lowStockThreshold !== '' || form.reorderPoint !== '') && form.currentStock > 0 && (() => {
                    const cur = form.currentStock
                    const low = form.lowStockThreshold !== '' ? Number(form.lowStockThreshold) : null
                    const rop = form.reorderPoint !== '' ? Number(form.reorderPoint) : null
                    const max = Math.max(cur, low ?? 0, rop ?? 0) * 1.25
                    const pct = Math.min((cur / max) * 100, 100)
                    const color = low && cur <= low ? 'bg-red-500' : rop && cur <= rop ? 'bg-amber-500' : 'bg-green-500'
                    return (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>0 {form.unit}</span>
                          <span className="font-medium text-slate-600 dark:text-slate-300">{cur} {form.unit} (current)</span>
                          <span>{max.toFixed(0)} {form.unit}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-visible relative">
                          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                          {low != null && <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-red-400 rounded" style={{ left: `${Math.min((low / max) * 100, 100)}%` }} title={`Low: ${low}`} />}
                          {rop != null && <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-amber-400 rounded" style={{ left: `${Math.min((rop / max) * 100, 100)}%` }} title={`Reorder: ${rop}`} />}
                        </div>
                        <div className="flex gap-3 text-[10px] text-slate-400">
                          {rop != null && <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />{t('bakeryReorderPoint')}: {rop}</span>}
                          {low != null && <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-red-400" />{t('bakeryLowStockAlert')}: {low}</span>}
                        </div>
                      </div>
                    )
                  })()}
                  {/* Threshold logic warning */}
                  {form.lowStockThreshold !== '' && form.reorderPoint !== '' &&
                   Number(form.lowStockThreshold) > 0 && Number(form.reorderPoint) > 0 &&
                   Number(form.lowStockThreshold) > Number(form.reorderPoint) && (
                    <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{t('bakeryThresholdWarning', { low: form.lowStockThreshold, rop: form.reorderPoint, unit: form.unit })}</span>
                    </div>
                  )}
                </div>

                {/* Section 4 — Reorder Settings */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('bakeryReorderSettings')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>{t('bakeryReorderQuantity')} <span className="normal-case font-normal text-slate-400">({form.unit || t('bakeryUnit')})</span></label>
                      <input
                        type="number" step="0.01" min="0" placeholder="e.g. 2000"
                        className={inputCls}
                        value={form.reorderQuantity}
                        onChange={e => setForm(f => ({ ...f, reorderQuantity: e.target.value }))}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">{t('bakeryReorderQtyHint')}</p>
                    </div>
                    <div>
                      <label className={labelCls}>{t('bakerySupplierName')}</label>
                      <input
                        className={inputCls}
                        value={form.supplierName}
                        placeholder={t('bakerySupplierPlaceholder')}
                        onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5 — Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {t('bakeryNotesLabel')} <span className="normal-case font-normal text-slate-400">{t('bakeryNotesOptionalLabel')}</span>
                  </label>
                  <textarea
                    rows={2}
                    className={`${inputCls} resize-none`}
                    value={form.notes}
                    placeholder={t('bakeryStorageNotesPlaceholder')}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                {formError && (
                  <div className="flex items-center gap-2 mx-6 mt-4 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formError}
                  </div>
                )}
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="text-xs text-slate-400">
                    {form.name.trim() && form.unit && !isDuplicateName && (
                      <span className="font-medium text-slate-500 dark:text-slate-300">
                        {form.name.trim()} · {form.currentStock} {form.unit}
                        {form.costPerUnit > 0 && ` · $${form.costPerUnit}/${form.unit}`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      {t('bakeryCancelBtn')}
                    </button>
                    <button
                      onClick={save}
                      disabled={saving || !form.name.trim() || isDuplicateName}
                      className="flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {saving
                        ? <><span className="animate-spin inline-block">⟳</span> {t('bakerySaving')}</>
                        : form.id ? t('bakerySaveChanges') : t('bakeryAddIngredient')
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Reorder modal */}
      {reorderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Receive Stock</h3>
                <p className="text-xs text-slate-500 mt-0.5">{reorderTarget.name}</p>
              </div>
              <button onClick={() => setReorderTarget(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            {/* Info chips */}
            <div className="px-6 pt-4 flex gap-3">
              <div className="flex-1 rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Current Stock</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{reorderTarget.currentStock} {reorderTarget.unit}</p>
              </div>
              {reorderTarget.reorderQuantity != null && (
                <div className="flex-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-center">
                  <p className="text-[10px] text-amber-600 uppercase tracking-wide mb-0.5">Suggested Qty</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{reorderTarget.reorderQuantity} {reorderTarget.unit}</p>
                </div>
              )}
              {reorderReceived !== '' && reorderPrice !== '' && Number(reorderReceived) > 0 && Number(reorderPrice) > 0 && (
                <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-center">
                  <p className="text-[10px] text-green-600 uppercase tracking-wide mb-0.5">Total Cost</p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {(Number(reorderReceived) * Number(reorderPrice)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            {/* Fields */}
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Qty Received <span className="text-slate-400 font-normal">({reorderTarget.unit})</span>
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={reorderReceived}
                    onChange={e => setReorderReceived(e.target.value)}
                    placeholder={reorderTarget.reorderQuantity != null ? String(reorderTarget.reorderQuantity) : '0'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Unit Price <span className="text-slate-400 font-normal">(updates cost)</span>
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={reorderPrice}
                    onChange={e => setReorderPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Delivery Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  value={reorderDate}
                  onChange={e => setReorderDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Reference / Notes</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  value={reorderNotes}
                  onChange={e => setReorderNotes(e.target.value)}
                  placeholder="Invoice #, supplier ref…"
                />
              </div>
            </div>
            {/* After-receipt indicator */}
            {reorderReceived !== '' && Number(reorderReceived) > 0 && (
              <div className="mx-6 mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Stock after receipt:
                <span className="font-semibold">{(reorderTarget.currentStock + Number(reorderReceived)).toFixed(2)} {reorderTarget.unit}</span>
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setReorderTarget(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t('bakeryCancelBtn')}
              </button>
              <button
                onClick={doReorder}
                disabled={reorderSaving}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {reorderSaving ? '…' : <><CheckCircle2 className="h-4 w-4" /> Confirm Receipt</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk restock modal */}
      {showBulkRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Bulk Restock</h3>
                <p className="text-xs text-slate-500 mt-0.5">{bulkItems.length} item(s) flagged for restocking</p>
              </div>
              <button onClick={() => setShowBulkRestock(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-start font-medium">Ingredient</th>
                    <th className="px-4 py-2 text-end font-medium">Current</th>
                    <th className="px-4 py-2 text-end font-medium w-32">Qty to Receive</th>
                    <th className="px-4 py-2 text-end font-medium w-32">Unit Price</th>
                    <th className="px-4 py-2 text-end font-medium w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {bulkItems.map((item, idx) => (
                    <tr key={item.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.unit}</p>
                      </td>
                      <td className="px-4 py-2.5 text-end text-slate-500 text-xs">{item.currentStock} {item.unit}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number" step="0.01" min="0"
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm text-end focus:outline-none focus:ring-2 focus:ring-green-400"
                          value={item.qty}
                          onChange={e => setBulkItems(prev => prev.map((bi, i) => i === idx ? { ...bi, qty: e.target.value } : bi))}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number" step="0.01" min="0"
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm text-end focus:outline-none focus:ring-2 focus:ring-green-400"
                          value={item.price}
                          onChange={e => setBulkItems(prev => prev.map((bi, i) => i === idx ? { ...bi, price: e.target.value } : bi))}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-end font-medium text-slate-700 dark:text-slate-300">
                        {item.qty !== '' && item.price !== '' && Number(item.qty) > 0 && Number(item.price) > 0
                          ? (Number(item.qty) * Number(item.price)).toFixed(2)
                          : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total cost:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {bulkItems
                    .filter(i => i.qty !== '' && i.price !== '' && Number(i.qty) > 0 && Number(i.price) > 0)
                    .reduce((sum, i) => sum + Number(i.qty) * Number(i.price), 0)
                    .toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkRestock(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('bakeryCancelBtn')}
                </button>
                <button
                  onClick={doBulkRestock}
                  disabled={bulkSaving || bulkItems.every(i => i.qty === '' || Number(i.qty) <= 0)}
                  className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 transition-colors"
                >
                  {bulkSaving ? '…' : <><CheckCircle2 className="h-4 w-4" /> Confirm All</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust stock modal */}
      {adjustTarget && (() => {
        const newStock = calcNewStock()
        const willBeLow = adjustTarget.lowStockThreshold != null && adjustTarget.lowStockThreshold > 0 && newStock <= adjustTarget.lowStockThreshold
        const willBeNegative = newStock < 0
        const isValid = adjustAmt !== '' && Number(adjustAmt) >= 0 && !willBeNegative
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <SlidersHorizontal className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Adjust Stock</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{adjustTarget.name}</p>
                  </div>
                </div>
                <button onClick={() => setAdjustTarget(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              {/* Current stock banner */}
              <div className="px-6 pt-5">
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 px-4 py-3 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Current</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{adjustTarget.currentStock}</p>
                    <p className="text-xs text-slate-400">{adjustTarget.unit}</p>
                  </div>
                  <div className="flex items-center text-slate-300 dark:text-slate-600">
                    <span className="text-2xl">→</span>
                  </div>
                  <div className={`flex-1 rounded-xl px-4 py-3 text-center ${
                    willBeNegative
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : willBeLow
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-green-50 dark:bg-green-900/20'
                  }`}>
                    <p className="text-[10px] uppercase tracking-widest mb-1 text-slate-400">After</p>
                    <p className={`text-xl font-bold ${
                      willBeNegative ? 'text-red-600 dark:text-red-400'
                      : willBeLow ? 'text-amber-600 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                    }`}>
                      {adjustAmt !== '' ? newStock.toFixed(2) : '—'}
                    </p>
                    <p className="text-xs text-slate-400">{adjustTarget.unit}</p>
                  </div>
                </div>

                {/* Threshold info */}
                {(adjustTarget.lowStockThreshold != null || adjustTarget.reorderPoint != null) && (
                  <div className="flex gap-2 mt-2">
                    {adjustTarget.lowStockThreshold != null && adjustTarget.lowStockThreshold > 0 && (
                      <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
                        Low alert ≤ {adjustTarget.lowStockThreshold} {adjustTarget.unit}
                      </span>
                    )}
                    {adjustTarget.reorderPoint != null && (
                      <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5">
                        Reorder ≤ {adjustTarget.reorderPoint} {adjustTarget.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Mode tabs */}
              <div className="px-6 pt-4">
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
                  {([
                    { key: 'add', label: 'Add', icon: <TrendingUp className="h-3.5 w-3.5" />, active: 'bg-green-600 text-white shadow-sm' },
                    { key: 'remove', label: 'Remove', icon: <TrendingDown className="h-3.5 w-3.5" />, active: 'bg-red-500 text-white shadow-sm' },
                    { key: 'set', label: 'Set to', icon: <Target className="h-3.5 w-3.5" />, active: 'bg-amber-500 text-white shadow-sm' },
                  ] as const).map(({ key, label, icon, active }) => (
                    <button
                      key={key}
                      onClick={() => { setAdjustMode(key); setAdjustAmt('') }}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        adjustMode === key
                          ? active
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input + quick presets */}
              <div className="px-6 pt-4 space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {adjustMode === 'add' ? 'Amount to add' : adjustMode === 'remove' ? 'Amount to remove' : 'New stock value'}
                  <span className="ml-1 font-normal text-slate-400">({adjustTarget.unit})</span>
                </label>
                <input
                  type="number" step="0.01" min="0"
                  autoFocus
                  className={`w-full px-4 py-3 rounded-xl border-2 text-lg font-semibold text-center transition-colors focus:outline-none ${
                    willBeNegative
                      ? 'border-red-400 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 focus:ring-2 focus:ring-red-300'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-200'
                  }`}
                  value={adjustAmt}
                  onChange={e => setAdjustAmt(e.target.value)}
                  placeholder="0"
                />
                {/* Quick preset buttons */}
                {adjustMode !== 'set' && (
                  <div className="flex gap-1.5">
                    {[1, 5, 10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        onClick={() => setAdjustAmt(String(n))}
                        className="flex-1 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="px-6 pt-3">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Reason <span className="font-normal text-slate-400">(optional)</span></label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                >
                  <option value="">— Select reason —</option>
                  {adjustMode === 'add' ? (
                    <>
                      <option value="Purchase received">Purchase received</option>
                      <option value="Inventory correction (count)">Inventory count correction</option>
                      <option value="Transfer in">Transfer in</option>
                      <option value="Return to stock">Return to stock</option>
                      <option value="Other">Other</option>
                    </>
                  ) : adjustMode === 'remove' ? (
                    <>
                      <option value="Used in production">Used in production</option>
                      <option value="Spoilage">Spoilage</option>
                      <option value="Breakage">Breakage</option>
                      <option value="Expired">Expired</option>
                      <option value="Inventory correction (count)">Inventory count correction</option>
                      <option value="Transfer out">Transfer out</option>
                      <option value="Other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="Physical count">Physical count</option>
                      <option value="System correction">System correction</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>

              {/* Warning banners */}
              <div className="px-6 pt-3 space-y-1.5">
                {willBeNegative && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Stock cannot go below zero
                  </div>
                )}
                {!willBeNegative && willBeLow && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Stock will fall below low-stock alert threshold
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end px-6 py-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setAdjustTarget(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('bakeryCancelBtn')}
                </button>
                <button
                  onClick={doAdjust}
                  disabled={!isValid || adjustSaving}
                  className={`flex items-center gap-2 px-5 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50 transition-colors ${
                    adjustMode === 'add' ? 'bg-green-600 hover:bg-green-700'
                    : adjustMode === 'remove' ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {adjustSaving ? '…' : adjustMode === 'add' ? 'Add Stock' : adjustMode === 'remove' ? 'Remove Stock' : 'Set Stock'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
                          onClick={() => openReorder(item)}
                          title={t('bakeryMarkReordered')}
                          className="p-1.5 rounded-lg text-amber-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openAdjust(item)}
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
