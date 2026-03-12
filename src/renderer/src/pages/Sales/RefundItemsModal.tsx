/**
 * Partial Refund Modal Component
 * Allows refunding specific items and quantities from a transaction
 */

import { useState, useMemo } from 'react'
import { X, Package, AlertCircle } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

type SaleItem = {
  id: string
  productId: string
  variantId?: string | null
  quantity: number
  refundedQuantity?: number
  price: number
  total: number
  refundedAt?: string | null
  product?: {
    name: string
    baseSKU: string
  }
  variant?: {
    attributeValues?: { value: string; attribute?: { name: string } }[]
  }
}

type Transaction = {
  id: string
  items: SaleItem[]
  status: string
  total: number
}

type RefundItemsModalProps = {
  show: boolean
  transaction: Transaction | null
  onClose: () => void
  onRefund: (items: Array<{ saleItemId: string; quantityToRefund: number }>) => Promise<void>
}

export default function RefundItemsModal({ show, transaction, onClose, onRefund }: RefundItemsModalProps) {
  const { t } = useLanguage()
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate available items for refund (must be before early return)
  const availableItems = useMemo(() => {
    if (!transaction) return []
    return transaction.items.filter(item => {
      const refundedQty = item.refundedQuantity || 0
      return item.quantity > refundedQty
    })
  }, [transaction])

  // Calculate refund total
  const refundTotal = useMemo(() => {
    return availableItems.reduce((sum, item) => {
      const qty = refundQuantities[item.id] || 0
      return sum + (qty * item.price)
    }, 0)
  }, [refundQuantities, availableItems])

  if (!show || !transaction) return null

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setRefundQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, quantity)
    }))
    setError(null)
  }

  const handleSubmit = async () => {
    // Validate at least one item selected
    const itemsToRefund = Object.entries(refundQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([saleItemId, quantityToRefund]) => ({ saleItemId, quantityToRefund }))

    if (itemsToRefund.length === 0) {
      setError(t('selectAtLeastOneItem'))
      return
    }

    // Validate quantities don't exceed available
    for (const item of availableItems) {
      const requestedQty = refundQuantities[item.id] || 0
      const availableQty = item.quantity - (item.refundedQuantity || 0)
      
      if (requestedQty > availableQty) {
        setError(t('cannotRefundExceeds')
          .replace('{requested}', requestedQty.toString())
          .replace('{product}', item.product?.name || '')
          .replace('{available}', availableQty.toString()))
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      await onRefund(itemsToRefund)
      setRefundQuantities({})
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to process refund')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setRefundQuantities({})
    setError(null)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('refundItemsTitle')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('transactionLabel')}: {transaction.id}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {availableItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                {t('noItemsAvailableForRefund')}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                {t('allItemsRefundedMessage')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {availableItems.map(item => {
                  const availableQty = item.quantity - (item.refundedQuantity || 0)
                  const refundQty = refundQuantities[item.id] || 0
                  const itemRefundTotal = refundQty * item.price

                  return (
                    <div 
                      key={item.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {item.product?.name || t('unknownProduct')}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <span>SKU: {item.product?.baseSKU}</span>
                            {item.variant?.attributeValues?.map((av, i) => (
                              <span key={i}>{av.attribute?.name || ''}: {av.value}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            ${item.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t('perUnit')}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              {t('availableToRefund')}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {availableQty} {t('ofLabel')} {item.quantity} {t('unitsLabel')}
                            </p>
                          </div>

                          <div className="flex-1 max-w-xs">
                            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                              {t('quantityToRefund')}
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQuantityChange(item.id, refundQty - 1)}
                                disabled={refundQty <= 0}
                                className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={availableQty}
                                value={refundQty}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              <button
                                onClick={() => handleQuantityChange(item.id, refundQty + 1)}
                                disabled={refundQty >= availableQty}
                                className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                +
                              </button>
                              <button
                                onClick={() => handleQuantityChange(item.id, availableQty)}
                                className="px-3 py-1 text-xs font-medium rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
                              >
                                {t('allButton')}
                              </button>
                            </div>
                          </div>
                        </div>

                        {refundQty > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              {t('refundAmount')}
                            </p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              ${itemRefundTotal.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {availableItems.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('totalRefundAmount')}</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${refundTotal.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-6 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('cancelButton')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || refundTotal === 0}
                  className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('processingButton')}
                    </>
                  ) : (
                    <>{t('processRefund')}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
