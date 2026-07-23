// src/renderer/components/coffee/RefundModal.tsx
import { useState, useMemo } from 'react'
import { X, RotateCcw, AlertTriangle, Package, PackageX } from 'lucide-react'
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
      // Explicitly type the array to match the preload definition
      const itemsArray: Array<{ id: string; quantity: number }> = []
      
      selectedItems.forEach((quantity, id) => {
        itemsArray.push({ id, quantity })
      })

      // Construct the payload with exact types
      const refundPayload = {
        orderId: String(order.id), // Ensure it's string
        items: itemsArray,
        reason: String(reason),    // Ensure it's string
        notes: notes || undefined, // Ensure it's string | undefined
        cashierId: String(user?.id || 'unknown'), // Ensure it's string
        restockItems: Boolean(restockItems) // Ensure it's boolean
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <RotateCcw className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Process Refund</h2>
              <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          
          {/* Order Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">Original Total</p>
              <p className="font-semibold text-gray-900">${order.total.toFixed(2)}</p>
            </div>
            {order.refundedAmount > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Already Refunded</p>
                <p className="font-semibold text-orange-600">−${(order.refundedAmount || 0).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">Available for Refund</p>
              <p className="font-semibold text-green-600">${maxRefundAvailable.toFixed(2)}</p>
            </div>
          </div>

          {/* Items Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Select Items to Refund</h3>
              <div className="flex gap-2 text-sm">
                <button onClick={selectAll} className="text-blue-600 hover:underline">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAll} className="text-gray-600 hover:underline">Clear</button>
              </div>
            </div>

            <div className="space-y-2 border rounded-lg p-3 max-h-[250px] overflow-y-auto">
              {order.items.map((item: any) => {
                const isSelected = selectedItems.has(item.id)
                const refundQty = selectedItems.get(item.id) || 0
                const itemRefundAmount = (item.total / item.quantity) * refundQty

                return (
                  <div key={item.id} className={`flex items-center gap-4 p-2 rounded-lg border transition-colors ${isSelected ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">
                        Ordered: {item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    {isSelected && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={refundQty}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    )}

                    {/* Refund Amount */}
                    {isSelected && (
                      <div className="w-24 text-right">
                        <p className="text-xs text-gray-500">Refund</p>
                        <p className="font-semibold text-red-600">
                          −${itemRefundAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Restock Toggle - ALWAYS VISIBLE */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {restockItems ? (
                  <Package className="w-6 h-6 text-blue-600" />
                ) : (
                  <PackageX className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">Restock Items</p>
                <p className="text-xs text-gray-500">
                  {restockItems 
                    ? 'Refunded items will be added back to inventory'
                    : 'Items will not be returned to stock (damaged/lost)'
                  }
                </p>
              </div>
            </div>
            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setRestockItems(!restockItems)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                restockItems ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  restockItems ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Reason Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a reason...</option>
              <option value="customer_request">Customer Request</option>
              <option value="wrong_item">Wrong Item</option>
              <option value="quality_issue">Quality Issue</option>
              <option value="duplicate_charge">Duplicate Charge</option>
              <option value="item_damaged">Item Damaged</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-red-500"
              rows={2}
              placeholder="Optional: Add more details about this refund..."
            />
          </div>

          {/* Warning */}
          {refundAmount > 0 && (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${
              restockItems ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-orange-50 border-orange-200 text-orange-700'
            }`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                {restockItems ? (
                  <p>Items will be restocked: Refunded quantities will be added back to inventory automatically.</p>
                ) : (
                  <p>No restock: Items will not be returned to inventory. Use this option for damaged or lost items.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-xl">
          {/* Refund Total */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total Refund Amount:</span>
            <span className="text-lg font-bold text-red-600">
              ${refundAmount.toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedItems.size === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Process Refund
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
