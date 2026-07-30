import { payMeta, orderTypeMeta } from '../constants'
import { formatMoney, formatDateTime } from '../utils'
import type { Transaction } from '../types'

interface Props {
  tx: Transaction
}

export function TransactionRow({ tx }: Props) {
  const pay = payMeta(tx.paymentMethod ?? '')
  const PayIcon = pay.icon
  const typeMeta = orderTypeMeta(tx.type)
  const TypeIcon = typeMeta.icon

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
      {/* Order + type + date — cols 1-3 */}
      <div className="col-span-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">
          {tx.orderNumber}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: `${typeMeta.color}20`,
              color: typeMeta.color,
            }}
          >
            <TypeIcon className="w-2.5 h-2.5" />
            {typeMeta.label}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
          {tx.closedAt ? formatDateTime(tx.closedAt) : '—'}
        </div>
      </div>

      {/* Customer / table — cols 4-5 */}
      <div className="col-span-2">
        <div className="text-sm text-slate-900 dark:text-white truncate">
          {tx.customerName || 'Walk-in'}
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
          {tx.table
            ? `Table ${tx.table.number}${tx.table.name ? ` (${tx.table.name})` : ''}`
            : tx.customerPhone || '—'}
        </div>
      </div>

      {/* Payment — col 6 */}
      <div className="col-span-2 flex items-center">
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
          style={{
            backgroundColor: `${pay.color}20`,
            color: pay.color,
          }}
        >
          <PayIcon className="w-3 h-3" />
          {pay.label}
        </span>
      </div>

      {/* Cashier — col 7 */}
      <div className="col-span-1 flex items-center text-xs text-slate-600 dark:text-slate-400 truncate">
        {tx.cashier?.fullName || tx.cashier?.username || '—'}
      </div>

      {/* Subtotal — col 8 */}
      <div className="col-span-1 flex items-center justify-end text-xs text-slate-600 dark:text-slate-400 tabular-nums">
        {formatMoney(tx.subtotal)}
      </div>

      {/* Discount — col 9 */}
      <div className="col-span-1 flex items-center justify-end">
        {tx.discount > 0 ? (
          <span className="text-xs font-medium text-red-500 tabular-nums">
            −{formatMoney(tx.discount)}
          </span>
        ) : (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        )}
      </div>

      {/* Total — col 10-12 */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
          {formatMoney(tx.total)}
        </span>
      </div>
    </div>
  )
}
