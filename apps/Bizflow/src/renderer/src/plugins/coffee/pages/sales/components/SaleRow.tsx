import { ChevronDown, ChevronUp, User, MapPin, Clock } from 'lucide-react'
import { PAYMENT_ICON, TYPE_ICON, COLOR_STYLES } from '../constants'
import type { Sale } from '../types'
import { formatCurrency, formatTime, getRelativeTime, getPaymentColor } from '../utils'

interface Props {
  sale: Sale
  expanded: boolean
  onToggle: () => void
}

export function SaleRow({ sale, expanded, onToggle }: Props) {
  const PayIcon = PAYMENT_ICON[sale.paymentMethod ?? ''] ?? PAYMENT_ICON.cash
  const TypeIcon = TYPE_ICON[sale.type] ?? TYPE_ICON.takeaway
  const payColor = COLOR_STYLES[getPaymentColor(sale.paymentMethod)] ?? COLOR_STYLES.amber

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                #{sale.orderNumber}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${payColor.bg} ${payColor.text} font-medium`}>
                <PayIcon className="w-3 h-3 inline mr-1" />
                {sale.paymentMethod?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {sale.table ? (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Table {sale.table.number}
                </span>
              ) : sale.customerName ? (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {sale.customerName}
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {sale.closedAt ? getRelativeTime(sale.closedAt) : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(sale.total)}
            </div>
            <div className="text-xs text-slate-400">{sale.items.length} items</div>
          </div>
          <div className="text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="space-y-2">
            {sale.items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                    {item.quantity}×
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-200">{item.productName}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(item.total)}
                  </div>
                  <div className="text-xs text-slate-400">@ {formatCurrency(item.unitPrice)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400">
                <span>Discount</span>
                <span className="tabular-nums">−{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax != null && sale.tax > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Tax</span>
                <span className="tabular-nums">{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Cashier info */}
          {sale.cashier && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Served by {sale.cashier.fullName ?? sale.cashier.username}</span>
              {sale.closedAt && <span>{formatTime(sale.closedAt)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
