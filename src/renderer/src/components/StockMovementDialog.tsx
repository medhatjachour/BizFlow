/**
 * StockMovementDialog Component
 * Modal for recording stock movements (restock, adjustment, removal)
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import logger from '../../../shared/utils/logger'

type MovementMode = 'add' | 'set' | 'remove'

interface StockMovementDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    mode: MovementMode
    value: number
    reason: string
    notes: string
  }) => void | Promise<void>
  productName: string
  variantLabel?: string
  currentStock: number
}

const getReasonOptions = (t: any) => [
  { value: 'supplier_delivery', label: t('supplierDelivery') },
  { value: 'customer_return', label: t('customerReturn') },
  { value: 'inventory_correction', label: t('inventoryCorrectionReason') },
  { value: 'found_stock', label: t('foundStock') },
  { value: 'damaged', label: t('damagedSpoiled') },
  { value: 'theft', label: t('theftShrinkage') },
  { value: 'transfer_in', label: t('transferIn') },
  { value: 'transfer_out', label: t('transferOut') },
  { value: 'other', label: t('other') }
]

export default function StockMovementDialog({
  isOpen,
  onClose,
  onConfirm,
  productName,
  variantLabel,
  currentStock
}: StockMovementDialogProps) {
  const { t } = useLanguage()
  const [mode, setMode] = useState<MovementMode>('add')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('supplier_delivery')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  
  const REASON_OPTIONS = getReasonOptions(t)

  // Calculate new stock based on mode and value
  const calculateNewStock = (): number => {
    const numValue = parseInt(value) || 0
    
    switch (mode) {
      case 'add':
        return currentStock + numValue
      case 'set':
        return numValue
      case 'remove':
        return currentStock - numValue
      default:
        return currentStock
    }
  }

  const calculateChange = (): number => {
    return calculateNewStock() - currentStock
  }

  const newStock = calculateNewStock()
  const change = calculateChange()

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMode('add')
      setValue('')
      setReason('supplier_delivery')
      setNotes('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const numValue = parseInt(value)
    if (isNaN(numValue) || numValue <= 0) {
      return
    }

    if (newStock < 0) {
      return
    }

    setLoading(true)
    try {
      await onConfirm({
        mode,
        value: numValue,
        reason,
        notes
      })
      onClose()
    } catch (error) {
      logger.error('Failed to record stock movement:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t('adjustStock')}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {productName}
              {variantLabel && (
                <span className="text-blue-600 dark:text-blue-400"> • {variantLabel}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Current Stock Display */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2.5">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {t('currentStock')}
              </div>
              <div className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-0.5">
                {currentStock} {t('units')}
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="add"
                  checked={mode === 'add'}
                  onChange={(e) => setMode(e.target.value as MovementMode)}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                    {t('addToStock')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-1.5">
                    {t('restockReturns')}
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="set"
                  checked={mode === 'set'}
                  onChange={(e) => setMode(e.target.value as MovementMode)}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                    {t('setExactAmount')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-1.5">
                    {t('inventoryCorrection')}
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="remove"
                  checked={mode === 'remove'}
                  onChange={(e) => setMode(e.target.value as MovementMode)}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                    {t('removeFromStock')}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-1.5">
                    {t('damageShrinkage')}
                  </span>
                </div>
              </label>
            </div>

            {/* Value Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {mode === 'add' && t('quantityToAdd')}
                {mode === 'set' && t('newStockAmount')}
                {mode === 'remove' && t('quantityToRemove')}
              </label>
              <input
                type="number"
                min="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t('enterAmount')}
                required
                className="w-full px-3 py-1.5 text-base border border-gray-300 dark:border-gray-600 rounded 
                         focus:ring-1 focus:ring-blue-500 focus:border-transparent
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Preview */}
            {value && (
              <div className={`rounded p-2.5 border ${
                newStock < 0 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800' 
                  : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      New Stock
                    </div>
                    <div className={`text-lg font-bold mt-0.5 ${
                      newStock < 0 
                        ? 'text-red-700 dark:text-red-400' 
                        : 'text-green-700 dark:text-green-400'
                    }`}>
                      {newStock} units
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Change
                    </div>
                    <div className={`text-lg font-bold mt-0.5 ${
                      change > 0 
                        ? 'text-green-700 dark:text-green-400' 
                        : change < 0 
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-400'
                    }`}>
                      {change > 0 ? '+' : ''}{change}
                    </div>
                  </div>
                </div>
                {newStock < 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
                    {t('stockCannotBeNegative')}
                  </p>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('reason')}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded 
                         focus:ring-1 focus:ring-blue-500 focus:border-transparent
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {REASON_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('notesOptional')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('invoiceReference')}
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded 
                         focus:ring-1 focus:ring-blue-500 focus:border-transparent
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 
                       hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !value || newStock < 0}
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('recording')}
                </>
              ) : (
                t('recordMovement')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
