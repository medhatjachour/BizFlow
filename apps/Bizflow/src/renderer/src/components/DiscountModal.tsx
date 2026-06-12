/**
 * Discount Modal Component
 * Allows authorized users to apply discounts to cart items
 */

import { useState, useEffect } from 'react'
import { X, Percent, DollarSign, AlertCircle } from 'lucide-react'

interface DiscountModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (discountData: DiscountData) => void
  productName: string
  originalPrice: number
  maxDiscountPercentage: number
  maxDiscountAmount: number
  requireReason: boolean
}

export interface DiscountData {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  reason: string
}

export default function DiscountModal({
  isOpen,
  onClose,
  onApply,
  productName,
  originalPrice,
  maxDiscountPercentage,
  maxDiscountAmount,
  requireReason
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState(0)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDiscountType('PERCENTAGE')
      setDiscountValue(0)
      setReason('')
      setError('')
    }
  }, [isOpen])

  const calculateFinalPrice = () => {
    if (discountType === 'PERCENTAGE') {
      return originalPrice - (originalPrice * discountValue / 100)
    } else {
      return Math.max(0, originalPrice - discountValue)
    }
  }

  const calculateSavings = () => {
    return originalPrice - calculateFinalPrice()
  }

  const validateDiscount = () => {
    if (discountValue <= 0) {
      setError('Discount must be greater than 0')
      return false
    }

    if (discountType === 'PERCENTAGE') {
      if (discountValue > maxDiscountPercentage) {
        setError(`Discount cannot exceed ${maxDiscountPercentage}%`)
        return false
      }
    } else {
      if (discountValue > maxDiscountAmount) {
        setError(`Discount cannot exceed $${maxDiscountAmount.toFixed(2)}`)
        return false
      }
      if (discountValue >= originalPrice) {
        setError('Discount cannot be greater than or equal to the price')
        return false
      }
    }

    if (requireReason && !reason.trim()) {
      setError('Please provide a reason for the discount')
      return false
    }

    return true
  }

  const handleApply = () => {
    setError('')
    
    if (!validateDiscount()) {
      return
    }

    onApply({
      type: discountType,
      value: discountValue,
      reason: reason.trim()
    })
    
    onClose()
  }

  if (!isOpen) return null

  const finalPrice = calculateFinalPrice()
  const savings = calculateSavings()

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Apply Discount
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Original Price */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Original Price
            </span>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              ${originalPrice.toFixed(2)}
            </span>
          </div>

          {/* Discount Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Discount Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDiscountType('PERCENTAGE')
                  setDiscountValue(0)
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  discountType === 'PERCENTAGE'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                }`}
              >
                <Percent size={18} />
                <span className="font-medium">Percentage</span>
              </button>
              <button
                onClick={() => {
                  setDiscountType('FIXED_AMOUNT')
                  setDiscountValue(0)
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                  discountType === 'FIXED_AMOUNT'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                }`}
              >
                <DollarSign size={18} />
                <span className="font-medium">Fixed Amount</span>
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Discount Value
            </label>
            <div className="relative">
              {discountType === 'FIXED_AMOUNT' && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  $
                </span>
              )}
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className={`w-full ${discountType === 'FIXED_AMOUNT' ? 'pl-8' : 'pl-4'} pr-12 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary`}
                placeholder="0"
                min="0"
                max={discountType === 'PERCENTAGE' ? maxDiscountPercentage : maxDiscountAmount}
                step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
                autoFocus
              />
              {discountType === 'PERCENTAGE' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  %
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {discountType === 'PERCENTAGE' 
                ? `Max: ${maxDiscountPercentage}%` 
                : `Max: $${maxDiscountAmount.toFixed(2)}`}
            </p>
          </div>

          {/* Price Preview */}
          {discountValue > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 dark:text-green-400">Final Price</span>
                <span className="text-xl font-bold text-green-700 dark:text-green-400">
                  ${finalPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600 dark:text-green-500">You Save</span>
                <span className="font-semibold text-green-600 dark:text-green-500">
                  ${savings.toFixed(2)} ({((savings / originalPrice) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Reason {requireReason && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary resize-none"
              placeholder="e.g., Customer loyalty, Price match, Clearance sale"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reason.length}/200 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={discountValue <= 0}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  )
}
