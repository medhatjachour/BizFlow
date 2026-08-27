import React, { useState, useEffect } from 'react'
import {
  X,
  Pill,
  AlertCircle,
  Check,
  Plus,
  Minus,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { INPUT_BASE_CLS } from '../constants'
import { daysUntil, roundDecimal, remainingDisplay } from '../utils'
import type { MedicineLite, BatchLite, CartItem } from '../types'
import { BatchPickerModal } from './BatchPickerModal'

interface Props {
  medicine: MedicineLite
  editingItem?: CartItem | null
  committedBatchQty: number
  onSave: (item: CartItem) => void
  onClose: () => void
}

export const ItemConfigModal: React.FC<Props> = ({
  medicine,
  editingItem,
  committedBatchQty,
  onSave,
  onClose
}) => {
  const [showBatchModal, setShowBatchModal] = useState(false)

  // Auto-pick FEFO batch
  const [selectedBatch, setSelectedBatch] = useState<BatchLite | null>(() => {
    if (editingItem) return editingItem.batch
    const sorted = [...medicine.batches].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    )
    return (
      sorted.find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0) ??
      medicine.batches[0] ??
      null
    )
  })

  const hasSubUnit = Boolean(medicine.subUnit && medicine.subUnitsPerContainer)
  const isBatchPartial = Boolean(selectedBatch && selectedBatch.quantity < 1)

  const [saleUnit, setSaleUnit] = useState<'container' | 'sub'>(() => {
    if (editingItem) return editingItem.saleUnit
    return isBatchPartial && hasSubUnit ? 'sub' : 'container'
  })

  const [quantity, setQuantity] = useState<string>(editingItem?.quantity ?? '1')
  const [unitPrice, setUnitPrice] = useState<string>('')
  const [discount, setDiscount] = useState<string>(editingItem?.discount ?? '0')

  // Auto-update price when switching batch or unit
  useEffect(() => {
    if (editingItem) {
      setUnitPrice(editingItem.unitPrice)
      return
    }
    if (!selectedBatch) return
    const base = (selectedBatch.sellingPrice ?? selectedBatch.costPerUnit) || 0
    if (saleUnit === 'sub' && medicine.subUnitsPerContainer) {
      setUnitPrice(base > 0 ? (base / medicine.subUnitsPerContainer).toFixed(4) : '')
    } else {
      setUnitPrice(base > 0 ? base.toFixed(2) : '')
    }
  }, [selectedBatch, saleUnit, medicine.subUnitsPerContainer, editingItem])

  const activeUnitLabel = saleUnit === 'sub' ? (medicine.subUnit ?? 'sub') : medicine.unit
  const ratio = medicine.subUnitsPerContainer ?? 1
  const enteredQty = parseFloat(quantity) || 0
  const enteredPrice = parseFloat(unitPrice) || 0
  const enteredDisc = parseFloat(discount) || 0

  const batchMax = selectedBatch
    ? saleUnit === 'sub'
      ? selectedBatch.quantity * ratio
      : selectedBatch.quantity
    : 0

  const availableNet = Math.max(0, roundDecimal(batchMax - committedBatchQty, 4))
  const isOverMax = enteredQty > availableNet
  const lineTotal = Math.max(0, enteredQty * enteredPrice - enteredDisc)
  const remainingAfter = Math.max(0, roundDecimal(availableNet - enteredQty, 4))

  const handleUnitToggle = (unit: 'container' | 'sub') => {
    if (unit === saleUnit) return
    setSaleUnit(unit)
    setQuantity('1')
    const base = (selectedBatch?.sellingPrice ?? selectedBatch?.costPerUnit) || 0
    if (unit === 'sub' && medicine.subUnitsPerContainer) {
      setUnitPrice(base > 0 ? (base / medicine.subUnitsPerContainer).toFixed(4) : '')
    } else {
      setUnitPrice(base > 0 ? base.toFixed(2) : '')
    }
  }

  const handleConfirm = () => {
    if (!selectedBatch || enteredQty <= 0 || isOverMax) return
    onSave({
      id: editingItem?.id ?? `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      medicine,
      batch: selectedBatch,
      quantity: String(enteredQty),
      unitPrice: String(enteredPrice),
      discount: String(enteredDisc),
      saleUnit
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div
          className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {medicine.name}
                </h3>
                <span className="text-xs text-slate-400 capitalize">{medicine.category}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Batch Selector Card */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Batch / Lot Selected
                </span>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="text-violet-600 dark:text-violet-400 font-bold hover:underline"
                >
                  Change Batch
                </button>
              </div>

              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedBatch?.batchNumber || 'Lot: Default'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Net Available:{' '}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {availableNet} {activeUnitLabel}
                    </strong>
                  </p>
                </div>
                {selectedBatch && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Exp: {new Date(selectedBatch.expiryDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Dispense Unit (Whole Container vs Sub-Unit Fraction) */}
            {hasSubUnit && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Dispense Unit
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    disabled={isBatchPartial}
                    onClick={() => handleUnitToggle('container')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      saleUnit === 'container'
                        ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-2xs'
                        : 'text-slate-500'
                    } ${isBatchPartial ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    Whole ({medicine.unit})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('sub')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      saleUnit === 'sub'
                        ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Fraction ({medicine.subUnit})
                  </button>
                </div>
              </div>
            )}

            {/* Inputs & Quick Qty Presets */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Qty ({activeUnitLabel}) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    autoFocus
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className={`${INPUT_BASE_CLS} font-bold text-sm ${
                      isOverMax ? 'border-red-400 ring-2 ring-red-400/20' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={unitPrice}
                    onChange={e => setUnitPrice(e.target.value)}
                    className={`${INPUT_BASE_CLS} text-xs`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Discount ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    className={`${INPUT_BASE_CLS} text-xs`}
                  />
                </div>
              </div>

              {/* Quick Qty Buttons */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 5, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantity(String(n))}
                    className="flex-1 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  >
                    +{n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(String(availableNet))}
                  className="px-3 py-1 text-[11px] font-bold rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                >
                  Max ({availableNet})
                </button>
              </div>
            </div>

            {isOverMax && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Quantity exceeds available batch stock ({availableNet} max)</span>
              </div>
            )}

            {/* Calculated Order Preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Remaining stock after sale:</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  {remainingAfter} {activeUnitLabel}
                </p>
              </div>

              <div className="text-right">
                <span className="text-slate-400">Line Total:</span>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  ${lineTotal.toFixed(2)}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isOverMax || enteredQty <= 0}
              onClick={handleConfirm}
              className="w-full py-3.5 px-4 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40 text-white font-bold text-xs rounded-2xl shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              {editingItem ? 'Update Cart Line' : 'Add Item to Cart'}
            </button>
          </div>
        </div>
      </div>

      {showBatchModal && (
        <BatchPickerModal
          medicine={medicine}
          selectedBatchId={selectedBatch?.id ?? ''}
          onSelect={b => setSelectedBatch(b)}
          onClose={() => setShowBatchModal(false)}
        />
      )}
    </>
  )
}