import React from 'react'
import { ClipboardList, X, Plus, Trash2 } from 'lucide-react'
import { PurchaseOrderItem } from '../types'
import { money, inputCls } from '../../components/_shared'
import { Button } from '../../components/ui'
import { usePurchaseOrderForm } from '../hooks/usePurchaseOrderForm'

interface PurchaseOrderModalProps {
  order: PurchaseOrderItem | null
  onClose: () => void
  onSaved: () => void
  toast: any
  t: (k: string) => string
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  order,
  onClose,
  onSaved,
  toast,
  t,
}) => {
  const {
    suppliers,
    products,
    supplierId,
    notes,
    status,
    lines,
    totalCalculated,
    busy,
    setSupplierId,
    setNotes,
    setStatus,
    setLine,
    pickProduct,
    addLine,
    removeLine,
    submit,
  } = usePurchaseOrderForm(order, toast, t, onSaved)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <ClipboardList size={17} className="text-emerald-500" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              {order?.id ? `Edit Purchase Order #${order.orderNumber || ''}` : 'New Purchase Order'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Supplier & Status Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Vendor / Supplier
              </label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className={inputCls}
              >
                <option value="">No Specific Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Order Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className={inputCls}
              >
                <option value="draft">Draft (Planning)</option>
                <option value="ordered">Ordered (Sent to Supplier)</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Inbound Items ({lines.length})
              </span>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
              >
                <Plus size={13} /> Add Line Item
              </button>
            </div>

            <div className="space-y-1.5">
              {lines.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-1.5 items-center bg-slate-50/60 dark:bg-slate-800/40 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <select
                    value={l.productId}
                    onChange={e => pickProduct(i, e.target.value)}
                    className={`${inputCls} col-span-5 py-1 text-xs`}
                  >
                    <option value="">Select Medicine from Catalog...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    value={l.quantity}
                    onChange={e => setLine(i, { quantity: e.target.value })}
                    type="number"
                    min="1"
                    placeholder="Qty"
                    className={`${inputCls} col-span-2 py-1 text-xs text-center font-semibold`}
                  />

                  <input
                    value={l.costPerUnit}
                    onChange={e => setLine(i, { costPerUnit: e.target.value })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cost ($)"
                    className={`${inputCls} col-span-2 py-1 text-xs text-right font-semibold`}
                  />

                  <input
                    value={l.expiryDate}
                    onChange={e => setLine(i, { expiryDate: e.target.value })}
                    type="date"
                    title="Expected Expiry Date"
                    className={`${inputCls} col-span-2 py-1 text-xs`}
                  />

                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="col-span-1 text-slate-300 hover:text-red-500 flex justify-center p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Internal Procurement Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivery instructions, invoice #, terms..."
              className={inputCls}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-500">Estimated Total: </span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              ${money(totalCalculated)}
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={busy} onClick={submit}>
              Save Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}