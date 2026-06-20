import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Save, X, RefreshCw, TrendingDown, AlertCircle,
  AlertTriangle, Boxes, Pencil, Trash2, Plus
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Batch, Material, BatchFormValues } from './materialsTab.types'
import { formatDate } from './materialsTab.shared'

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
      await window.api.clinic.materialBatches.logAdjustment({
        batchId: batch.id,
        materialId: material.id,
        quantityBefore: batch.quantity,
        quantityAfter: newQty,
        reason: 'recount',
      })
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
      await window.api.clinic.materialBatches.logLoss({
        batchId: batch.id,
        materialId: material.id,
        quantityLost: q,
        reason: 'other',
        description: notes.trim() || null,
      })
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
      await window.api.clinic.materialBatches.logExpiry({
        batchId: batch.id,
        materialId: material.id,
        quantityExpired: q,
        expiryDate: batch.expiryDate ?? new Date().toISOString(),
        notes: notes.trim() || null,
      })
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
export default function BatchManagementModal({ material, onClose }: { material: Material; onClose: () => void }) {
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
