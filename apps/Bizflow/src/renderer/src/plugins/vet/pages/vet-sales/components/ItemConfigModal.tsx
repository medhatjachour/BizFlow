import React, { useState, useEffect} from 'react'
import { X, Pill, AlertCircle,  Check } from 'lucide-react'
// import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS } from '../constants'
import { daysUntil,  roundDecimal } from '../utils'
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
//   const { t } = useLanguage()
  const [showBatchModal, setShowBatchModal] = useState(false)

  // Initialize selected batch (FEFO priority or edited item)
  const [selectedBatch, setSelectedBatch] = useState<BatchLite | null>(() => {
    if (editingItem) return editingItem.batch
    const sorted = [...medicine.batches].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    )
    return sorted.find(b => b.quantity > 0 && daysUntil(b.expiryDate) >= 0) ?? medicine.batches[0] ?? null
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

  // Auto-calculate unit price when batch or saleUnit shifts
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

  // Calculations & Validations
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

  const handleUnitToggle = (unit: 'container' | 'sub') => {
    if (unit === saleUnit) return
    setSaleUnit(unit)
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
              <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
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

          <div className="p-6 space-y-5">
            {/* Batch Selector Block */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Target Batch
                </span>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="text-violet-600 dark:text-violet-400 font-bold hover:underline"
                >
                  Change Batch
                </button>
              </div>
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedBatch?.batchNumber || 'Lot: Default'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Available in lot:{' '}
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

            {/* Sale Unit Switcher */}
            {hasSubUnit && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Dispense Unit
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl">
                  <button
                    type="button"
                    disabled={isBatchPartial}
                    onClick={() => handleUnitToggle('container')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      saleUnit === 'container'
                        ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    } ${isBatchPartial ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    Whole ({medicine.unit})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitToggle('sub')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      saleUnit === 'sub'
                        ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-300 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Fraction ({medicine.subUnit})
                  </button>
                </div>
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Qty ({activeUnitLabel})
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  autoFocus
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className={`${INPUT_BASE_CLS} ${
                    isOverMax ? 'border-red-400 ring-2 ring-red-400/20' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Price ($)
                </label>
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
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Discount ($)
                </label>
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

            {isOverMax && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Quantity exceeds remaining net stock ({availableNet} max)</span>
              </div>
            )}

            {/* Line Total Summary */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Calculated Line Total
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">
                ${lineTotal.toFixed(2)}
              </span>
            </div>

            {/* Action */}
            <button
              type="button"
              disabled={isOverMax || enteredQty <= 0}
              onClick={handleConfirm}
              className="w-full py-3.5 px-4 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              {editingItem ? 'Update Line Item' : 'Add to Order'}
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