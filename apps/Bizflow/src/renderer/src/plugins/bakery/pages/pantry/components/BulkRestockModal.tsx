import React, { useState, useEffect } from 'react'
import { ShoppingCart, X, CheckCircle2, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PantryIngredient, BulkRestockItem } from '../types'
import { formatCurrency, isLowStock, needsReorder } from '../utils'

interface Props {
  isOpen: boolean
  allItems: PantryIngredient[]
  onClose: () => void
  onConfirm: (items: BulkRestockItem[]) => Promise<void>
}

export const BulkRestockModal: React.FC<Props> = ({
  isOpen,
  allItems,
  onClose,
  onConfirm,
}) => {
  const { t } = useLanguage()

  const [bulkItems, setBulkItems] = useState<BulkRestockItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const needing = allItems.filter(i => isLowStock(i) || needsReorder(i))
      setBulkItems(
        needing.map(i => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
          currentStock: i.currentStock,
          qty: i.reorderQuantity ? i.reorderQuantity.toString() : '',
          price: i.costPerUnit > 0 ? i.costPerUnit.toString() : '',
        }))
      )
    }
  }, [isOpen, allItems])

  if (!isOpen) return null

  const totalCost = bulkItems
    .filter(i => i.qty !== '' && i.price !== '' && Number(i.qty) > 0 && Number(i.price) > 0)
    .reduce((sum, i) => sum + Number(i.qty) * Number(i.price), 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onConfirm(bulkItems)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('bakeryRestockAll') || 'Bulk Restock Flagged Items'}
              </h3>
              <p className="text-xs text-slate-400">{bulkItems.length} items flagged for replenishment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right w-32">Qty to Receive</th>
                <th className="px-4 py-3 text-right w-32">Price/Unit</th>
                <th className="px-4 py-3 text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {bulkItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.qty}
                      onChange={e =>
                        setBulkItems(prev =>
                          prev.map((bi, i) => (i === idx ? { ...bi, qty: e.target.value } : bi))
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs text-right font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={item.price}
                      onChange={e =>
                        setBulkItems(prev =>
                          prev.map((bi, i) => (i === idx ? { ...bi, price: e.target.value } : bi))
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs text-right font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {item.qty && item.price && Number(item.qty) > 0 && Number(item.price) > 0
                      ? `$${formatCurrency(Number(item.qty) * Number(item.price))}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-slate-500">Total Purchase: </span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
              ${formatCurrency(totalCost)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || bulkItems.every(i => !i.qty || Number(i.qty) <= 0)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}