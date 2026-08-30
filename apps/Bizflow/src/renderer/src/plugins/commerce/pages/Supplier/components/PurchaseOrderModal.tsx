import React, { useState } from 'react'
import { X, Plus, Trash2, ShoppingCart, AlertCircle } from 'lucide-react'
import { calculatePOTotal, formatCurrency } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { 
  PurchaseOrderFormData, 
  SupplierResponseDTO, 
  ProductResponseDTO, 
  SupplierProductResponseDTO 
} from '../types'

interface PurchaseOrderModalProps {
  isOpen: boolean
  formData: PurchaseOrderFormData
  setFormData: React.Dispatch<React.SetStateAction<PurchaseOrderFormData>>
  suppliers: SupplierResponseDTO[]
  products: ProductResponseDTO[]
  supplierProducts: SupplierProductResponseDTO[]
  onClose: () => void
  onSubmit: () => Promise<boolean>
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  formData,
  setFormData,
  suppliers,
  products,
  supplierProducts,
  onClose,
  onSubmit
}) => {
  const { t } = useLanguage()
  const [selectedProdId, setSelectedProdId] = useState('')
  const [qty, setQty] = useState('1')
  const [cost, setCost] = useState('')

  if (!isOpen) return null

  const handleAddLineItem = () => {
    if (!selectedProdId || !qty || !cost) return
    const numQty = parseInt(qty, 10)
    const numCost = parseFloat(cost)
    if (numQty <= 0 || numCost < 0) return

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: selectedProdId,
          quantity: numQty,
          unitCost: numCost
        }
      ]
    }))

    setSelectedProdId('')
    setQty('1')
    setCost('')
  }

  const handleRemoveLineItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const { subtotal, total } = calculatePOTotal(formData.items, formData.taxAmount, formData.shippingCost)

  const handleProductSelectChange = (pId: string) => {
    setSelectedProdId(pId)
    const linked = supplierProducts.find((sp) => sp.productId === pId)
    if (linked) {
      setCost(String(linked.cost))
      if (linked.minOrderQty) setQty(String(linked.minOrderQty))
    } else {
      const standard = products.find((p) => p.id === pId)
      if (standard?.baseCost) setCost(String(standard.baseCost))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Draft Purchase Order (Restock)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Generate restock orders with supplier price tiers and scheduled ETA.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Supplier and Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Supplier Partner *
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value, items: [] })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="">Choose Supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date (ETA)
              </label>
              <input
                type="date"
                value={formData.expectedDate}
                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Add item row */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add Line Item</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <select
                  value={selectedProdId}
                  disabled={!formData.supplierId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Select Catalog SKU...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.baseSKU})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-center"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Cost"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-end font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={!selectedProdId || !qty || !cost}
                  onClick={handleAddLineItem}
                  className="w-full py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Line items list */}
          {formData.items.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-start">Product Item</th>
                    <th className="px-3 py-2 text-center">Quantity</th>
                    <th className="px-3 py-2 text-end">Unit Cost</th>
                    <th className="px-3 py-2 text-end">Line Total</th>
                    <th className="px-3 py-2 text-end"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {formData.items.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.productId)
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-medium">{prod?.name || 'Unknown item'}</td>
                        <td className="px-3 py-2 text-center font-mono">{it.quantity}</td>
                        <td className="px-3 py-2 text-end font-mono">{formatCurrency(it.unitCost)}</td>
                        <td className="px-3 py-2 text-end font-mono font-bold">
                          {formatCurrency(it.quantity * it.unitCost)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Tax, Shipping & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Shipping instructions, dock number, order references..."
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Tax ($):</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-end"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Freight Shipping ($):</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-end"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-bold text-sm">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/60 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!formData.supplierId || formData.items.length === 0}
            onClick={onSubmit}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Create Purchase Order
          </button>
        </div>
      </div>
    </div>
  )
}