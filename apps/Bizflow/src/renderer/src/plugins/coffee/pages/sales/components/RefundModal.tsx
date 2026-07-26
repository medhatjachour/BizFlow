// src/renderer/components/coffee/RefundModal.tsx
import { useState, useMemo } from 'react'
import { X, RotateCcw, AlertTriangle, Package, PackageX, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'

interface RefundModalProps {
  order: any
  onClose: () => void
  onSuccess: () => void
}

export function RefundModal({ order, onClose, onSuccess }: RefundModalProps) {
  const { t } = useLanguage()
  const toast = useToast()
  const { user } = useAuth()
  
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [restockItems, setRestockItems] = useState(true)
  const [loading, setLoading] = useState(false)

  // Calculate refund amount based on selected items
  const refundAmount = useMemo(() => {
    let total = 0
    selectedItems.forEach((quantity, itemId) => {
      const item = order.items.find((i: any) => i.id === itemId)
      if (item && quantity > 0) {
        total += (item.total / item.quantity) * quantity
      }
    })
    return total
  }, [selectedItems, order.items])

  const maxRefundAvailable = order.total - (order.refundedAmount || 0)

  const toggleItem = (itemId: string) => {
    const item = order.items.find((i: any) => i.id === itemId)
    if (!item) return

    setSelectedItems(prev => {
      const next = new Map(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.set(itemId, item.quantity)
      }
      return next
    })
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const item = order.items.find((i: any) => i.id === itemId)
    if (!item) return

    if (quantity <= 0) {
      setSelectedItems(prev => {
        const next = new Map(prev)
        next.delete(itemId)
        return next
      })
    } else if (quantity <= item.quantity) {
      setSelectedItems(prev => {
        const next = new Map(prev)
        next.set(itemId, quantity)
        return next
      })
    }
  }

  const selectAll = () => {
    const all = new Map<string, number>()
    order.items.forEach((item: any) => {
      all.set(item.id, item.quantity)
    })
    setSelectedItems(all)
  }

  const clearAll = () => {
    setSelectedItems(new Map())
  }

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to refund')
      return
    }
    if (!reason) {
      toast.error('Reason is required')
      return
    }
    if (refundAmount > maxRefundAvailable) {
      toast.error('Refund amount exceeds available amount')
      return
    }

    setLoading(true)
    try {
      const itemsArray: Array<{ id: string; quantity: number }> = []
      
      selectedItems.forEach((quantity, id) => {
        itemsArray.push({ id, quantity })
      })

      const refundPayload = {
        orderId: String(order.id),
        items: itemsArray,
        reason: String(reason),
        notes: notes || undefined,
        cashierId: String(user?.id || 'unknown'),
        restockItems: Boolean(restockItems)
      }

      await window.api.coffee.orders.refund(refundPayload)
      
      toast.success(restockItems ? 'Refund processed - items restocked' : 'Refund processed - no restock')
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Refund error:', err)
      toast.error('Failed to process refund')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('cfProcessRefund') || 'Process Refund'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('cfOrder') || 'Order'} #{order.orderNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Order Summary */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 space-y-2 border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t('cfOriginalTotal') || 'Original Total'}</span>
              <span className="font-medium text-slate-900 dark:text-white">${order.total.toFixed(2)}</span>
            </div>
            {order.refundedAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('cfAlreadyRefunded') || 'Already Refunded'}</span>
                <span className="font-medium text-red-600 dark:text-red-400">−${(order.refundedAmount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-300 font-medium">{t('cfAvailableForRefund') || 'Available for Refund'}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">${maxRefundAvailable.toFixed(2)}</span>
            </div>
          </div>

          {/* Items Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('cfSelectItemsToRefund') || 'Select Items to Refund'}</h3>
              <div className="flex gap-2 text-xs">
                <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline">{t('cfSelectAll') || 'Select All'}</button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button onClick={clearAll} className="text-slate-500 dark:text-slate-400 hover:underline">{t('cfClear') || 'Clear'}</button>
              </div>
            </div>

            <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded-xl p-2 max-h-60 overflow-y-auto">
              {order.items.map((item: any) => {
                const isSelected = selectedItems.has(item.id)
                const refundQty = selectedItems.get(item.id) || 0
                const itemRefundAmount = (item.total / item.quantity) * refundQty

                return (
                  <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-red-50 dark:bg-red-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 text-red-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-red-500"
                    />

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.productName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ordered: {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    {isSelected && (
                      <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={refundQty}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded focus:ring-1 focus:ring-red-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Refund Amount */}
                    {isSelected && (
                      <div className="text-right min-w-[80px]">
                        <p className="text-xs text-slate-400">{t('cfRefunded') || 'Refund'}</p>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                          −${itemRefundAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Restock Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${restockItems ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                {restockItems ? <Package size={16} /> : <PackageX size={16} />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t('cfRestockItems') || 'Restock Items'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {restockItems ? t('cfRefundedItemsWillBeAddedBackToInventory') || 'Refunded items will be added back to inventory' : t('cfItemsWillNotBeReturnedToStock') || 'Items will not be returned to stock'}
                </p>
              </div>
            </div>
            {/* Toggle Switch */}
            <button
              onClick={() => setRestockItems(!restockItems)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors flex-shrink-0 ${
                restockItems ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${restockItems ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('cfReason') || 'Reason'} <span className="text-red-500">*</span></label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="">{t('cfSelectReason') || 'Select a reason...'}</option>
              <option value="customer_request">{t('cfCustomerRequest') || 'Customer Request'}</option>
              <option value="wrong_item">{t('cfWrongItem') || 'Wrong Item'}</option>
              <option value="quality_issue">{t('cfQualityIssue') || 'Quality Issue'}</option>
              <option value="duplicate_charge">{t('cfDuplicateCharge') || 'Duplicate Charge'}</option>
              <option value="damaged">{t('cfItemDamaged') || 'Item Damaged'}</option>
              <option value="other">{t('cfOther') || 'Other'}</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('cfAdditionalNotes') || 'Additional Notes'}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none resize-none"
              rows={2}
              placeholder={t('cfOptionalAddMoreDetailsAboutThisRefund') || 'Optional: Add more details about this refund...'}
            />
          </div>

          {/* Warning */}
          {refundAmount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                {restockItems 
                  ? 'Items will be restocked: Refunded quantities will be added back to inventory automatically.'
                  : 'No restock: Items will not be returned to inventory. Use this option for damaged or lost items.'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
          {/* Refund Total */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('cfTotalRefundAmount') || 'Total Refund Amount:'}</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">${refundAmount.toFixed(2)}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t('cfCancel') || 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedItems.size === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('cfProcessing') || 'Processing...'}
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  {t('cfProcessRefund') || 'Process Refund'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
