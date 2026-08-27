import React, { useState } from 'react'
import { X, Pencil, Loader2} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS, PAYMENT_METHODS } from '../constants'
import type { Sale } from '../types'

interface Props {
  sale: Sale
  onClose: () => void
  onSaved: () => void
}

export const EditSaleModal: React.FC<Props> = ({ sale, onClose, onSaved }) => {
  const toast = useToast()
  const { t } = useLanguage()

  const [quantity, setQuantity] = useState(String(sale.quantity))
  const [unitPrice, setUnitPrice] = useState(String(sale.unitPrice))
  const [discount, setDiscount] = useState(String(sale.discount))
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod || 'cash')
  const [notes, setNotes] = useState(sale.notes || '')
  const [busy, setBusy] = useState(false)

  const unitLabel = sale.saleUnit === 'sub' ? (sale.medicine.subUnit ?? 'sub') : sale.medicine.unit
  const calculatedTotal = Math.max(
    0,
    (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0) - (parseFloat(discount) || 0)
  )

  const handleSave = async () => {
    const q = parseFloat(quantity)
    if (isNaN(q) || q <= 0) {
      toast.error('Enter a valid quantity')
      return
    }
    setBusy(true)
    try {
      await (window as any).api?.vet?.medicines?.updateSale(sale.id, {
        quantity: q,
        unitPrice: parseFloat(unitPrice) || 0,
        discount: parseFloat(discount) || 0,
        paymentMethod,
        notes: notes || null
      })
      toast.success('Sale transaction updated')
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Pencil size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Edit Sale Transaction
              </h3>
              <p className="text-xs text-slate-400">{sale.medicine.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Qty ({unitLabel})
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className={INPUT_BASE_CLS}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Price ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value)}
                className={INPUT_BASE_CLS}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Discount ($)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className={INPUT_BASE_CLS}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Payment Method</label>
            <div className="grid grid-cols-4 gap-1">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-1.5 text-xs font-bold rounded-xl capitalize border transition-all ${
                    paymentMethod === m
                      ? 'border-violet-600 bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={INPUT_BASE_CLS}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-500">Recalculated Line Total</span>
            <span className="text-base font-black text-violet-600 dark:text-violet-400">
              ${calculatedTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="flex-1 py-3 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/20 flex items-center justify-center gap-1.5"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}