/**
 * WasteTab – Log and summarise ingredient / product / batch waste
 *
 * Waste types:
 *   ingredient        – raw pantry stock lost (auto-deducts pantry)
 *   finished_product  – finished product units lost (auto-deducts product variant stock)
 *   production_batch  – an entire production batch was scrapped
 *   other             – free-text, no automatic stock deduction
 */
import { useState, useEffect } from 'react'
import { Trash2, Plus, AlertTriangle, PackageX, FlaskConical, Box, HelpCircle, Filter } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Pagination from './Pagination'

// ─── Types ────────────────────────────────────────────────────────────────────

type WasteType = 'ingredient' | 'finished_product' | 'production_batch' | 'other'

interface Recipe {
  id: string
  name: string
  outputProductId?: string | null
  outputProduct?: { id: string; name: string } | null
}

interface PantryItem {
  id: string
  name: string
  unit: string
  currentStock: number
  costPerUnit?: number | null
}

interface WasteLog {
  id: string
  wasteType: string
  itemName: string
  quantity: number
  unit: string
  cost: number
  reason: string | null
  wasteDate: string
  notes: string | null
  recipe?: { id: string; name: string } | null
  product?: { id: string; name: string } | null
  pantryIngredient?: { id: string; name: string; unit: string } | null
}

interface WasteSummary {
  totalCost: number
  totalQuantity: number
  totalEntries: number
  byReason: Array<{
    reason: string | null
    _sum: { cost: number | null; quantity: number | null }
    _count: number
  }>
  byWasteType: Array<{
    wasteType: string
    _sum: { cost: number | null; quantity: number | null }
    _count: number
  }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WASTE_TYPES: { value: WasteType; labelKey: string; descKey: string; icon: React.ElementType; color: string; badge: string }[] = [
  {
    value: 'ingredient',
    labelKey: 'bakeryWasteTypeIngredient',
    descKey: 'bakeryWasteTypeIngredientDesc',
    icon: FlaskConical,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  {
    value: 'finished_product',
    labelKey: 'bakeryWasteTypeProduct',
    descKey: 'bakeryWasteTypeProductDesc',
    icon: Box,
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
  },
  {
    value: 'production_batch',
    labelKey: 'bakeryWasteTypeBatch',
    descKey: 'bakeryWasteTypeBatchDesc',
    icon: PackageX,
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  },
  {
    value: 'other',
    labelKey: 'bakeryWasteTypeOther',
    descKey: 'bakeryWasteTypeOtherDesc',
    icon: HelpCircle,
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
  }
]

const WASTE_REASON_OPTIONS = [
  { value: 'Spoilage',       key: 'bakeryWasteReasonSpoilage' },
  { value: 'Overproduction', key: 'bakeryWasteReasonOverproduction' },
  { value: 'Damage',         key: 'bakeryWasteReasonDamage' },
  { value: 'Expiry',         key: 'bakeryWasteReasonExpiry' },
  { value: 'Quality Issue',  key: 'bakeryWasteReasonQuality' },
  { value: 'Other',          key: 'bakeryWasteReasonOther' },
]

const FIELD_CLS =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-colors'

const LABEL_CLS = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide'

const EMPTY_FORM = {
  wasteType: 'other' as WasteType,
  pantryIngredientId: '',
  recipeId: '',
  productId: '',
  itemName: '',
  quantity: '' as unknown as number,
  unit: 'kg',
  cost: '' as unknown as number,
  reason: 'Spoilage',
  wasteDate: new Date().toISOString().split('T')[0],
  notes: ''
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toFixed(2)
const fmtDate = (d: string) => new Date(d).toLocaleDateString()

function getTypeMeta(type: string) {
  return WASTE_TYPES.find(t => t.value === type) ?? WASTE_TYPES[3]
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useLanguage()
  const meta = getTypeMeta(type)
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.badge}`}>
      <Icon className="h-3 w-3" />
      {t(meta.labelKey)}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WasteTab() {
  const { t } = useLanguage()
  const [logs, setLogs] = useState<WasteLog[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [summary, setSummary] = useState<WasteSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [filterType, setFilterType] = useState<WasteType | 'all'>('all')

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = async (type?: WasteType | 'all', pg?: number) => {
    setLoading(true)
    try {
      const activeFilter = type ?? filterType
      const activePage   = pg ?? page
      const [logData, recipeData, pantryData, summaryData] = await Promise.all([
        window.api.bakery.getWasteLogs({
          wasteType: activeFilter !== 'all' ? activeFilter : undefined,
          page: activePage,
          pageSize
        }),
        window.api.bakery.getRecipes(),
        window.api.bakery.getPantry(),
        window.api.bakery.getWasteSummary()
      ])
      // Handle both paginated and legacy array responses
      if (logData && typeof logData === 'object' && 'data' in logData) {
        setLogs(logData.data ?? [])
        setTotalLogs(logData.total ?? 0)
        setTotalPages(logData.totalPages ?? 1)
        setPage(logData.page ?? 1)
      } else {
        setLogs(Array.isArray(logData) ? logData : [])
        setTotalLogs(Array.isArray(logData) ? logData.length : 0)
        setTotalPages(1)
      }
      setRecipes(Array.isArray(recipeData) ? recipeData : [])
      setPantryItems(Array.isArray(pantryData) ? pantryData : [])
      setSummary(summaryData)
    } catch {
      setError(t('bakeryWasteLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])  // eslint-disable-line

  const applyFilter = (type: WasteType | 'all') => {
    setFilterType(type)
    setPage(1)
    load(type, 1)
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  const setField = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const onTypeChange = (type: WasteType) => {
    setForm({ ...EMPTY_FORM, wasteType: type })
  }

  const onPantrySelect = (id: string) => {
    const item = pantryItems.find(p => p.id === id)
    if (!item) {
      setForm(f => ({ ...f, pantryIngredientId: '' }))
      return
    }
    setForm(f => ({
      ...f,
      pantryIngredientId: id,
      itemName: item.name,
      unit: item.unit,
      cost: item.costPerUnit ? Number((item.costPerUnit).toFixed(4)) : (f.cost || 0)
    }))
  }

  const onRecipeSelect = (id: string) => {
    const recipe = recipes.find(r => r.id === id)
    if (!recipe) {
      setForm(f => ({ ...f, recipeId: '', productId: '', itemName: '' }))
      return
    }
    setForm(f => ({
      ...f,
      recipeId: id,
      productId: recipe.outputProduct?.id ?? '',
      itemName: recipe.outputProduct?.name ?? recipe.name,
      unit: 'pcs'
    }))
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  const save = async () => {
    const name = form.itemName.trim()
    if (!name || !form.quantity || Number(form.quantity) <= 0) {
      setFormError(t('bakeryWasteFillRequired'))
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await window.api.bakery.createWasteLog({
        wasteType: form.wasteType,
        recipeId: form.recipeId || undefined,
        productId: form.productId || undefined,
        pantryIngredientId: form.pantryIngredientId || undefined,
        itemName: name,
        quantity: Number(form.quantity),
        unit: form.unit,
        cost: Number(form.cost) || 0,
        reason: form.reason || undefined,
        wasteDate: form.wasteDate,
        notes: form.notes || undefined
      })
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      setFormError('')
      load()
    } catch (e: any) {
      setFormError(e?.message ?? t('bakeryWasteSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t('bakeryDeleteWasteConfirm'))) return
    try {
      await window.api.bakery.deleteWasteLog(id)
      load()
    } catch {
      setError(t('bakeryWasteLoadFailed'))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const selectedPantry = pantryItems.find(p => p.id === form.pantryIngredientId)
  const selectedRecipe = recipes.find(r => r.id === form.recipeId)
  const typeMeta = getTypeMeta(form.wasteType)

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm flex gap-2 items-start">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('bakeryWasteTab')}
          </h2>
          <p className="text-sm text-slate-500">{t('bakeryWasteSubtitle')}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(''); setForm({ ...EMPTY_FORM }) }}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('bakeryLogWaste')}
        </button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t('bakeryTotalWasteCost')}</p>
            <p className="text-xl font-bold text-rose-600">{fmt(summary.totalCost)}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t('bakeryWasteEntries')}</p>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{summary.totalEntries}</p>
          </div>
          {WASTE_TYPES.slice(0, 2).map(wt => {
            const row = summary.byWasteType?.find(r => r.wasteType === wt.value)
            const Icon = wt.icon
            return (
              <div key={wt.value} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{t(wt.labelKey)}</p>
                </div>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {row ? fmt(row._sum.cost ?? 0) : '—'}
                </p>
                <p className="text-xs text-slate-400">{row ? `${row._count} ${t('bakeryWasteEntries')}` : t('bakeryWasteNoEntries')}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Log form — modal overlay ────────────────────────────────────── */}
      {showForm && (() => {
        const closeForm = () => { setShowForm(false); setForm({ ...EMPTY_FORM }); setFormError('') }
        const saveLabels: Record<WasteType, string> = {
          ingredient: 'Log Ingredient Waste',
          finished_product: 'Log Product Waste',
          production_batch: 'Log Scrapped Batch',
          other: 'Log Waste Entry'
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${typeMeta.color}`}>
                    {(() => { const Icon = typeMeta.icon; return <Icon className="h-4 w-4" /> })()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('bakeryLogWaste')}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Record a waste event and update stock automatically</p>
                  </div>
                </div>
                <button
                  onClick={closeForm}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
                >&times;</button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* ── Waste type selector ── */}
                <div>
                  <p className={LABEL_CLS}>{t('bakeryWasteWhatLogging')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {WASTE_TYPES.map(wt => {
                      const Icon = wt.icon
                      const active = form.wasteType === wt.value
                      return (
                        <button
                          key={wt.value}
                          type="button"
                          onClick={() => onTypeChange(wt.value)}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                            active
                              ? `border-rose-400 ${wt.color} ring-2 ring-rose-200 dark:ring-rose-800`
                              : 'border-slate-200 dark:border-slate-600 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-sm font-semibold leading-tight">{t(wt.labelKey)}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug break-words w-full">{t(wt.descKey)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* ── Ingredient fields ── */}
                {form.wasteType === 'ingredient' && (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWastePantryIngredient')} <span className="text-red-500">*</span></label>
                      <select className={FIELD_CLS} value={form.pantryIngredientId} onChange={e => onPantrySelect(e.target.value)}>
                        <option value="">{t('bakeryWasteSelectIngredient')}</option>
                        {pantryItems.map(p => (
                          <option key={p.id} value={p.id}>{p.name} — {p.currentStock.toFixed(2)} {p.unit}</option>
                        ))}
                      </select>
                      {selectedPantry && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Current stock: <strong>{selectedPantry.currentStock.toFixed(2)} {selectedPantry.unit}</strong>
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className={LABEL_CLS}>{t('bakeryWasteQuantityLost')} <span className="text-red-500">*</span></label>
                        <input type="number" step="0.001" min="0" className={FIELD_CLS} placeholder="0"
                          value={form.quantity} onChange={e => setField('quantity', Number(e.target.value) as any)} />
                        {selectedPantry && Number(form.quantity) > selectedPantry.currentStock && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{t('bakeryWasteExceedsStock')}</p>
                        )}
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryIngredientUnit')}</label>
                        <input className={`${FIELD_CLS} bg-slate-50 dark:bg-slate-700/50`} value={form.unit} readOnly={!!selectedPantry} onChange={e => setField('unit', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteCost')}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input type="number" step="0.01" min="0" className={`${FIELD_CLS} pl-7`} value={form.cost} onChange={e => setField('cost', Number(e.target.value) as any)} />
                        </div>
                        {form.quantity && form.cost && Number(form.quantity) > 0 && Number(form.cost) > 0 && (
                          <p className="text-xs text-slate-400 mt-1">Total: <span className="font-semibold text-slate-600 dark:text-slate-300">${(Number(form.quantity) * Number(form.cost)).toFixed(2)}</span></p>
                        )}
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteReason')}</label>
                        <select className={FIELD_CLS} value={form.reason} onChange={e => setField('reason', e.target.value)}>
                          {WASTE_REASON_OPTIONS.map(r => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteDate')}</label>
                      <input type="date" className={FIELD_CLS} value={form.wasteDate} onChange={e => setField('wasteDate', e.target.value)} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteNotesLabel')} <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                      <textarea rows={2} className={`${FIELD_CLS} resize-none`} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder={t('bakeryWasteOptionalNotes')} />
                    </div>
                  </div>
                )}

                {/* ── Finished product fields ── */}
                {form.wasteType === 'finished_product' && (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteRecipeProduct')} <span className="text-red-500">*</span></label>
                      <select className={FIELD_CLS} value={form.recipeId} onChange={e => onRecipeSelect(e.target.value)}>
                        <option value="">{t('bakeryWasteSelectRecipe')}</option>
                        {recipes.filter(r => r.outputProduct).map(r => (
                          <option key={r.id} value={r.id}>{r.name} → {r.outputProduct!.name}</option>
                        ))}
                      </select>
                      {selectedRecipe && !selectedRecipe.outputProduct && (
                        <p className="text-xs text-orange-500 mt-1">{t('bakeryWasteNoLinkedProduct')}</p>
                      )}
                      {selectedRecipe?.outputProduct && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                          Product: <strong>{selectedRecipe.outputProduct.name}</strong>
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className={LABEL_CLS}>{t('bakeryWasteUnitsLost')} <span className="text-red-500">*</span></label>
                        <input type="number" step="1" min="0" className={FIELD_CLS} placeholder="0"
                          value={form.quantity} onChange={e => setField('quantity', Number(e.target.value) as any)} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryIngredientUnit')}</label>
                        <input className={FIELD_CLS} value={form.unit} onChange={e => setField('unit', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteCostEstimated')}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input type="number" step="0.01" min="0" className={`${FIELD_CLS} pl-7`} value={form.cost} onChange={e => setField('cost', Number(e.target.value) as any)} />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteReason')}</label>
                        <select className={FIELD_CLS} value={form.reason} onChange={e => setField('reason', e.target.value)}>
                          {WASTE_REASON_OPTIONS.map(r => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteDate')}</label>
                      <input type="date" className={FIELD_CLS} value={form.wasteDate} onChange={e => setField('wasteDate', e.target.value)} />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteNotesLabel')} <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                      <textarea rows={2} className={`${FIELD_CLS} resize-none`} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder={t('bakeryWasteOptionalNotes')} />
                    </div>
                  </div>
                )}

                {/* ── Production batch fields ── */}
                {form.wasteType === 'production_batch' && (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteRecipeLabel')} <span className="text-red-500">*</span></label>
                      <select className={FIELD_CLS} value={form.recipeId}
                        onChange={e => {
                          const r = recipes.find(x => x.id === e.target.value)
                          setForm(f => ({ ...f, recipeId: e.target.value, itemName: r ? `Scrapped Batch: ${r.name}` : f.itemName }))
                        }}>
                        <option value="">{t('bakeryWasteSelectRecipe')}</option>
                        {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteBatchesLost')} <span className="text-red-500">*</span></label>
                        <input type="number" step="1" min="0" className={FIELD_CLS} placeholder="0"
                          value={form.quantity} onChange={e => setField('quantity', Number(e.target.value) as any)} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteCostEstimated')}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input type="number" step="0.01" min="0" className={`${FIELD_CLS} pl-7`} value={form.cost} onChange={e => setField('cost', Number(e.target.value) as any)} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteReason')}</label>
                        <select className={FIELD_CLS} value={form.reason} onChange={e => setField('reason', e.target.value)}>
                          {WASTE_REASON_OPTIONS.map(r => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteDate')}</label>
                        <input type="date" className={FIELD_CLS} value={form.wasteDate} onChange={e => setField('wasteDate', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteNotesLabel')} <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                      <textarea rows={2} className={`${FIELD_CLS} resize-none`} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder={t('bakeryWasteDescribeHappened')} />
                    </div>
                  </div>
                )}

                {/* ── Other / free-text fields ── */}
                {form.wasteType === 'other' && (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteItemName')} <span className="text-red-500">*</span></label>
                      <input className={FIELD_CLS} value={form.itemName} onChange={e => setField('itemName', e.target.value)} placeholder={t('bakeryWasteItemNamePlaceholder')} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className={LABEL_CLS}>{t('bakeryWasteQuantity')} <span className="text-red-500">*</span></label>
                        <input type="number" step="0.01" min="0" className={FIELD_CLS} placeholder="0"
                          value={form.quantity} onChange={e => setField('quantity', Number(e.target.value) as any)} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryIngredientUnit')}</label>
                        <input className={FIELD_CLS} value={form.unit} onChange={e => setField('unit', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteCost')}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input type="number" step="0.01" min="0" className={`${FIELD_CLS} pl-7`} value={form.cost} onChange={e => setField('cost', Number(e.target.value) as any)} />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteReason')}</label>
                        <select className={FIELD_CLS} value={form.reason} onChange={e => setField('reason', e.target.value)}>
                          {WASTE_REASON_OPTIONS.map(r => <option key={r.value} value={r.value}>{t(r.key)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>{t('bakeryWasteDate')}</label>
                        <input type="date" className={FIELD_CLS} value={form.wasteDate} onChange={e => setField('wasteDate', e.target.value)} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Linked Recipe <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                        <select className={FIELD_CLS} value={form.recipeId} onChange={e => setField('recipeId', e.target.value)}>
                          <option value="">— None —</option>
                          {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{t('bakeryWasteNotesLabel')} <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                      <textarea rows={2} className={`${FIELD_CLS} resize-none`} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder={t('bakeryWasteOptionalNotes')} />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                {formError && (
                  <div className="flex items-center gap-2 mx-6 mt-4 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {formError}
                  </div>
                )}
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="text-xs text-slate-400">
                    {form.quantity && Number(form.quantity) > 0 && form.cost && Number(form.cost) > 0 && (
                      <span>Estimated loss: <span className="font-semibold text-rose-600">${(Number(form.quantity) * Number(form.cost)).toFixed(2)}</span></span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={closeForm}
                      className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      {t('bakeryCancelBtn')}
                    </button>
                    <button
                      onClick={save}
                      disabled={saving}
                      className={`flex items-center gap-2 px-5 py-2 text-sm rounded-xl text-white font-semibold disabled:opacity-50 transition-colors shadow-sm ${
                        typeMeta.value === 'ingredient' ? 'bg-amber-600 hover:bg-amber-700'
                        : typeMeta.value === 'finished_product' ? 'bg-rose-600 hover:bg-rose-700'
                        : typeMeta.value === 'production_batch' ? 'bg-slate-700 hover:bg-slate-800'
                        : 'bg-violet-600 hover:bg-violet-700'
                      }`}
                    >
                      {saving
                        ? <><span className="animate-spin inline-block">⟳</span> {t('bakeryWasteSaving')}</>
                        : saveLabels[form.wasteType]
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}


      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        {([['all', 'bakeryWasteAll'] as const, ...WASTE_TYPES.map(w => [w.value, w.labelKey] as const)]).map(([val, key]) => (
          <button
            key={val}
            onClick={() => applyFilter(val as WasteType | 'all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === val
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/20'
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">{t('bakeryLoadingRecipes')}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <Trash2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">{t('bakeryNoWasteLogs')}</p>
          <p className="text-slate-400 text-sm">{t('bakeryNoWasteDesc')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('bakeryWasteDate')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('bakeryWasteColType')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('bakeryWasteItemName')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('bakeryWasteQuantity')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('bakeryWasteCost')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('bakeryWasteReason')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('bakeryWasteColLinked')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {logs.map(log => (
                <tr key={log.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(log.wasteDate)}</td>
                  <td className="px-4 py-3">
                    <TypeBadge type={log.wasteType} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-[180px] truncate" title={log.itemName}>
                    {log.itemName}
                    {log.notes && <span className="block text-xs text-slate-400 font-normal truncate">{log.notes}</span>}
                  </td>
                  <td className="px-4 py-3 text-end text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {log.quantity} {log.unit}
                  </td>
                  <td className="px-4 py-3 text-end text-rose-600 font-semibold whitespace-nowrap">{fmt(log.cost)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {log.pantryIngredient ? (
                      <span className="text-amber-700 dark:text-amber-400">{log.pantryIngredient.name}</span>
                    ) : log.recipe ? (
                      <span>{log.recipe.name}</span>
                    ) : log.product ? (
                      <span className="text-rose-700 dark:text-rose-400">{log.product.name}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(log.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalLogs}
            onPage={p => { setPage(p); load(undefined, p) }}
            pageSize={pageSize}
          />
        </div>
      )}
    </div>
  )
}
