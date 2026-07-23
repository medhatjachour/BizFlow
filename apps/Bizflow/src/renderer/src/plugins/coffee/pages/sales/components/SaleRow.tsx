import { ChevronDown, ChevronUp, User, MapPin, Clock, RotateCcw, BadgeAlert } from 'lucide-react'
import { PAYMENT_ICON, TYPE_ICON, COLOR_STYLES } from '../constants'
import type { Sale } from '../types'
import { formatCurrency, formatTime, getRelativeTime, getPaymentColor } from '../utils'

interface Props {
  sale: Sale
  expanded: boolean
  onToggle: () => void
  onRefund: (sale: Sale) => void
}

export function SaleRow({ sale, expanded, onToggle, onRefund }: Props) {
  const PayIcon = PAYMENT_ICON[sale.paymentMethod ?? ''] ?? PAYMENT_ICON.cash
  const TypeIcon = TYPE_ICON[sale.type] ?? TYPE_ICON.takeaway
  const payColor = COLOR_STYLES[getPaymentColor(sale.paymentMethod)] ?? COLOR_STYLES.amber

  const isRefunded = sale.status === 'refunded'
  const isPartialRefund = sale.status === 'partially_refunded'
  const isVoided = sale.status === 'voided'
  
  const netTotal = sale.total - (sale.refundedAmount || 0)

  return (
    <div className={`border rounded-lg mb-2 transition-all ${isRefunded ? 'opacity-60 border-red-200 bg-red-50/30' : isPartialRefund ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <div className="flex items-center gap-3 flex-1">
          {/* Type Icon */}
          <div className={`p-2 rounded-lg ${payColor.bg} ${payColor.text}`}>
            <TypeIcon className="w-5 h-5" />
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">#{sale.orderNumber}</span>
              
              {/* Refund Badges */}
              {isRefunded && (
                <span className="px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full flex items-center gap-1">
                  <BadgeAlert className="w-3 h-3" /> Refunded
                </span>
              )}
              {isPartialRefund && (
                <span className="px-2 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-full flex items-center gap-1">
                  <BadgeAlert className="w-3 h-3" /> Partial Refund
                </span>
              )}
              
              {/* Payment Method */}
              <span className={`px-2 py-0.5 text-xs font-medium ${payColor.bg} ${payColor.text} rounded-full capitalize flex items-center gap-1`}>
                <PayIcon className="w-3 h-3" />
                {sale.paymentMethod?.replace('_', ' ')}
              </span>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {sale.table ? (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Table {sale.table.number}
                </span>
              ) : sale.customerName ? (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {sale.customerName}
                </span>
              ) : null}
              
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {sale.closedAt ? getRelativeTime(sale.closedAt) : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            {/* Show Net Total if refunded, else normal total */}
            <div className={`font-semibold ${isRefunded ? 'text-red-600 line-through' : 'text-gray-900'}`}>
              {formatCurrency(sale.total)}
            </div>
            {isPartialRefund && (
              <div className="text-xs text-orange-600 font-medium">
                Net: {formatCurrency(netTotal)}
              </div>
            )}
            <div className="text-xs text-gray-400">{sale.items.length} items</div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onRefund(sale)
            }}
            disabled={isRefunded || isVoided || sale.status === 'open'}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full disabled:opacity-20 disabled:cursor-not-allowed"
            title="Process Refund"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 py-3 bg-gray-50/50">
          {/* Items */}
          <div className="space-y-2 mb-4">
            {sale.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex gap-2">
                  <span className="font-medium text-gray-600">{item.quantity}×</span>
                  <span className="text-gray-800">{item.productName}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-gray-900">{formatCurrency(item.total)}</span>
                  <span className="text-xs text-gray-400">@ {formatCurrency(item.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 pt-2 border-t text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>−{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax != null && sale.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1">
              <span>Total</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            
            {/* Show Refunded Line if applicable */}
            {sale.refundedAmount > 0 && (
              <div className="flex justify-between text-red-600 font-medium pt-1 border-t border-dashed mt-1">
                <span>Refunded</span>
                <span>−{formatCurrency(sale.refundedAmount)}</span>
              </div>
            )}
            {isPartialRefund && (
               <div className="flex justify-between text-orange-700 font-bold pt-1">
                <span>Net Total</span>
                <span>{formatCurrency(netTotal)}</span>
              </div>
            )}
          </div>

          {/* Cashier info */}
          {sale.cashier && (
            <div className="mt-4 pt-3 border-t text-xs text-gray-500 flex items-center gap-2">
              <User className="w-3 h-3" /> Served by {sale.cashier.fullName ?? sale.cashier.username}
              {sale.closedAt && <span>at {formatTime(sale.closedAt)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
