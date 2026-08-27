import { useState } from 'react'
import { X, Pencil, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { inputCls, PAYMENT_METHODS } from './vetSales.shared'
import type { Sale } from './vetSales.types'

// ── Edit Sale Modal ───────────────────────────────────────────────────────────
export default function EditSaleModal({ sale, onClose, onSaved }: { sale: Sale; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [qty, setQty]     = useState(String(sale.quantity))
  const [price, setPrice] = useState(String(sale.unitPrice))
  const [disc, setDisc]   = useState(String(sale.discount))
  const [pm, setPm]       = useState(sale.paymentMethod ?? 'cash')
  const [notes, setNotes] = useState(sale.notes ?? '')
  const [busy, setBusy]   = useState(false)
  const unitLabel = sale.saleUnit === 'sub' ? (sale.medicine.subUnit ?? 'sub') : sale.medicine.unit
  const total = Math.max(0, (parseFloat(qty) || 0) * (parseFloat(price) || 0) - (parseFloat(disc) || 0))

  async function save() {
    if (!(parseFloat(qty) > 0)) { toast.error(t('vetEnterValidQty') || 'Enter a valid quantity'); return }
    setBusy(true)
    try {
      await window.api.vet?.medicines.updateSale(sale.id, {
        quantity: parseFloat(qty) || 0, unitPrice: parseFloat(price) || 0, discount: parseFloat(disc) || 0,
        paymentMethod: pm, notes: notes || null,
      })
      toast.success(t('vetSaleUpdated') || 'Sale updated'); onSaved(); onClose()
    } catch (e: any) { toast.error(e?.message ?? 'Update failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center"><Pencil className="h-4 w-4 text-violet-600 dark:text-violet-400" /></div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{t('vetEditSale') || 'Edit Sale'}</h2>
              <p className="text-xs text-slate-400">{sale.medicine.name} · {t('vetLotPrefix') || 'Lot:'} {sale.batch.batchNumber ?? '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('vetQty') || 'Qty'} ({unitLabel})</label>
              <input type="number" min="0.01" step="any" value={qty} onChange={e => setQty(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('vetUnitPrice') || 'Unit Price'}</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} className={inputCls + ' pl-6'} /></div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('vetDiscount') || 'Discount'}</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" step="any" value={disc} onChange={e => setDisc(e.target.value)} className={inputCls + ' pl-6'} /></div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('vetPaymentMethod') || 'Payment method'}</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PAYMENT_METHODS.map(m => (
                <button key={m} type="button" onClick={() => setPm(m)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors ${pm === m ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400'}`}>{m}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('vetNotesOptional') || 'Notes (optional)'}</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('vetNewTotal') || 'New total'}</span>
            <span className="font-black text-violet-700 dark:text-violet-300">${total.toFixed(2)}</span>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl">{t('vetMedCancel') || 'Cancel'}</button>
            <button onClick={save} disabled={busy} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('vetSaveChanges') || 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
