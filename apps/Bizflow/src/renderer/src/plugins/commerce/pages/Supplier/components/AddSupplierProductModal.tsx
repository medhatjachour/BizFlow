import React, { useState, useMemo } from 'react'
import { X, Search, Check } from 'lucide-react'
import type { ProductResponseDTO } from '../types'

interface AddSupplierProductModalProps {
  isOpen: boolean
  allProducts: ProductResponseDTO[]
  alreadyLinkedProductIds: string[]
  onClose: () => void
  onAdd: (payload: {
    productId: string
    cost: number
    leadTime?: number
    minOrderQty?: number
    isPreferred: boolean
  }) => Promise<void>
}

export const AddSupplierProductModal: React.FC<AddSupplierProductModalProps> = ({
  isOpen,
  allProducts,
  alreadyLinkedProductIds,
  onClose,
  onAdd
}) => {
  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [cost, setCost] = useState('')
  const [leadTime, setLeadTime] = useState('')
  const [minOrderQty, setMinOrderQty] = useState('1')
  const [isPreferred, setIsPreferred] = useState(false)

  const availableProducts = useMemo(() => {
    const term = search.toLowerCase().trim()
    return allProducts
      .filter((p) => !alreadyLinkedProductIds.includes(p.id))
      .filter(
        (p) =>
          !term ||
          p.name.toLowerCase().includes(term) ||
          (p.baseSKU && p.baseSKU.toLowerCase().includes(term))
      )
  }, [allProducts, alreadyLinkedProductIds, search])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || !cost) return
    await onAdd({
      productId: selectedProductId,
      cost: parseFloat(cost),
      leadTime: leadTime ? parseInt(leadTime, 10) : undefined,
      minOrderQty: minOrderQty ? parseInt(minOrderQty, 10) : 1,
      isPreferred
    })
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Map Catalog SKU</h4>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Product SKU *
            </label>
            <div className="relative mb-2">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search master catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full ps-8 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              {availableProducts.slice(0, 30).map((prod) => (
                <button
                  type="button"
                  key={prod.id}
                  onClick={() => {
                    setSelectedProductId(prod.id)
                    if (!cost && prod.baseCost) setCost(String(prod.baseCost))
                  }}
                  className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    selectedProductId === prod.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-medium">{prod.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">SKU: {prod.baseSKU}</div>
                  </div>
                  {selectedProductId === prod.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
              {availableProducts.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-400">No matching products</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Unit Cost *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lead (Days)
              </label>
              <input
                type="number"
                placeholder="7"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Order
              </label>
              <input
                type="number"
                placeholder="1"
                value={minOrderQty}
                onChange={(e) => setMinOrderQty(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPreferred}
              onChange={(e) => setIsPreferred(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Set as preferred primary vendor for this item</span>
          </label>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedProductId || !cost}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              Link to Vendor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}