import React, { useMemo } from 'react'
import { Flame, Percent, CreditCard, Ban, Printer, FileText } from 'lucide-react'
import { PosOrder, CourseType } from '../types'
import { CartItemRow } from './CartItemRow'
import { formatCurrency } from '../utils'

interface Props {
  order: PosOrder | null
  onUpdateQty: (id: string, qty: number) => void
  onUpdateStatus: (id: string, status: string) => void
  onFireCourse: (course: CourseType) => void
  onOpenDiscount: () => void
  onOpenPayment: () => void
  onVoidOrder: () => void
  onOpenReceiptPreview: () => void
}

export const ActiveCartSidebar: React.FC<Props> = ({
  order,
  onUpdateQty,
  onUpdateStatus,
  onFireCourse,
  onOpenDiscount,
  onOpenPayment,
  onVoidOrder,
  onOpenReceiptPreview
}) => {
  if (!order) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Active Ticket</h3>
        <p className="text-xs text-slate-400">Select a table or open an order to begin adding items.</p>
      </div>
    )
  }

  // Group items by course
  const groupedItems = useMemo(() => {
    const map: Record<CourseType, typeof order.items> = {
      beverage: [],
      starter: [],
      main: [],
      dessert: []
    }
    order.items.forEach((it) => {
      const c = (it.course || 'main') as CourseType
      if (map[c]) map[c].push(it)
      else map.main.push(it)
    })
    return map
  }, [order.items])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Ticket Header & Course Fire Buttons */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Ticket Pad ({order.items.length} items)
          </span>
          <button
            onClick={onOpenReceiptPreview}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
            title="Preview Thermal Receipt"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Fire Course Ribbon */}
        <div className="flex gap-1.5">
          {(['starter', 'main', 'dessert'] as CourseType[]).map((crs) => (
            <button
              key={crs}
              onClick={() => onFireCourse(crs)}
              className="flex-1 py-1 px-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
            >
              <Flame className="w-2.5 h-2.5" /> Fire {crs}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {(['beverage', 'starter', 'main', 'dessert'] as CourseType[]).map((crs) => {
          const items = groupedItems[crs]
          if (items.length === 0) return null
          return (
            <div key={crs} className="space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                {crs}s
              </div>
              <div className="space-y-1.5">
                {items.map((it) => (
                  <CartItemRow
                    key={it.id}
                    item={it}
                    onUpdateQty={onUpdateQty}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {order.items.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-xs font-semibold">
            Order ticket is currently empty
          </div>
        )}
      </div>

      {/* Financial Summary & Calculation Footer */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/60 space-y-2">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
              <span>Discount ({order.discountType === 'percentage' ? `${order.discountAmount}%` : 'Fixed'})</span>
              <span>-{formatCurrency(order.discountType === 'percentage' ? (order.subtotal * order.discountAmount) / 100 : order.discountAmount)}</span>
            </div>
          )}

          {order.tax > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Tax ({((order.taxRate || 0) * 100).toFixed(0)}%)</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
          )}

          {order.tipAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Tip</span>
              <span>{formatCurrency(order.tipAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
            <span>Grand Total</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={onOpenDiscount}
            className="py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Percent className="w-3.5 h-3.5 text-amber-500" /> Discount
          </button>
          <button
            onClick={onVoidOrder}
            className="py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 text-xs font-bold flex items-center justify-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Ban className="w-3.5 h-3.5" /> Void
          </button>
          <button
            onClick={onOpenPayment}
            className="py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1"
          >
            <CreditCard className="w-3.5 h-3.5" /> Settle
          </button>
        </div>
      </div>
    </div>
  )
}