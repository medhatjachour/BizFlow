import { ChevronDown, ChevronUp, User, MapPin, Clock, RotateCcw, BadgeAlert } from 'lucide-react'
import { PAYMENT_ICON, TYPE_ICON, COLOR_STYLES } from '../constants'
import type { Sale } from '../types'
import { formatCurrency, formatTime, getRelativeTime, getPaymentColor } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

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

  const {t} = useLanguage()

  return (
    <div className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      {/* Header */}
      <div 
        onClick={onToggle} 
        className="w-full flex items-center justify-between p-4 cursor-pointer"
      >
        {/* Left Side */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Type Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${payColor.bg} ${payColor.text}`}>
            <TypeIcon className="w-5 h-5" />
          </div>
          
          {/* Info */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-white">
                #{sale.orderNumber}
              </span>
              
              {/* Refund Badges */}
              {isRefunded && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 flex items-center gap-1">
                  <BadgeAlert className="w-3 h-3" /> {t('cfRefunded') || 'Refunded'}
                </span>
              )}
              {isPartialRefund && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 flex items-center gap-1">
                  <BadgeAlert className="w-3 h-3" /> {t('cfPartialRefund') || 'Partial Refund'}
                </span>
              )}
              
              {/* Payment Method */}
              <span className={`text-xs flex items-center gap-1 font-medium ${payColor.text}`}>
                <PayIcon className="w-3 h-3" />
                {sale.paymentMethod?.replace('_', ' ')}
              </span>
            </div>

            {/* Meta */}
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
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
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className={`font-semibold ${isRefunded ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
              {formatCurrency(sale.total)}
            </div>
            {isPartialRefund && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Net: {formatCurrency(netTotal)}
              </div>
            )}
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {sale.items.length} {t('cfItems') || 'items'}
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onRefund(sale)
            }}
            disabled={isRefunded || isVoided || sale.status === 'open'}
            className="p-5 text-slate-400 mx-2 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            title="Process Refund"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="text-slate-400 dark:text-slate-500">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-700/50">
          {/* Items */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50 mb-4">
            {sale.items.map((item, i) => (
              <div key={i} className="flex justify-between py-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex gap-2">
                  <span className="font-medium text-slate-900 dark:text-white">{item.quantity}×</span>
                  <span>{item.productName}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-900 dark:text-white">{formatCurrency(item.total)}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">@ {formatCurrency(item.unitPrice)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm border-t border-slate-200 dark:border-slate-700/50 pt-4">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>{t('cfSubtotal') || 'Subtotal'}</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>{t('cfDiscount') || 'Discount'}</span>
                <span>−{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax != null && sale.tax > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{t('cfTax') || 'Tax'}</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-semibold text-slate-900 dark:text-white pt-2 border-t border-dashed border-slate-300 dark:border-slate-600 mt-2">
              <span>{t('cfTotal') || 'Total'}</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            
            {/* Show Refunded Line if applicable */}
            {sale.refundedAmount > 0 && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>{t('cfRefunded') || 'Refunded'}</span>
                <span>−{formatCurrency(sale.refundedAmount)}</span>
              </div>
            )}
            {isPartialRefund && (
               <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-slate-300 dark:border-slate-600 mt-2">
                <span>{t('cfNetTotal') || 'Net Total'}</span>
                <span>{formatCurrency(netTotal)}</span>
              </div>
            )}
          </div>

          {/* Cashier info */}
          {sale.cashier && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
              Served by {sale.cashier.fullName ?? sale.cashier.username}
              {sale.closedAt && ` at ${formatTime(sale.closedAt)}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
