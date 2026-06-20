import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Batch } from './vetMedicines.types'
import { api, inputCls } from './vetMedicines.shared'

export default function BatchModal({ medicineId, unit, initial, onSave, onClose }: {
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
