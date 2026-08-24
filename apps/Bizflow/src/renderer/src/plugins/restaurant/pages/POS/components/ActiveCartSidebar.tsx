// src/pages/POS/components/ActiveCartSidebar.tsx
import React, { useMemo } from 'react'
import { Flame, Percent, CreditCard, GitFork, Printer, FileText, Users } from 'lucide-react'
import { PosOrder, CourseType } from '../types'
import { CartItemRow } from './CartItemRow'
import { sounds } from '../../utils/sound'

interface Props {
  order: PosOrder | null
  activeSeat: number
  onSelectSeat: (seat: number) => void
  onUpdateQty: (id: string, qty: number) => Promise<void>
  onFireCourse: (course: CourseType) => Promise<void>
  onOpenDiscount: () => void
  onOpenPayment: () => void
  onOpenSplitCheck: () => void
  onOpenReceiptPreview: () => void
}

export const ActiveCartSidebar: React.FC<Props> = ({
  order,
  activeSeat,
  onSelectSeat,
  onUpdateQty,
  onFireCourse,
  onOpenDiscount,
  onOpenPayment,
  onOpenSplitCheck,
  onOpenReceiptPreview
}) => {
  if (!order) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3 select-none">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">No Active Check Selected</h3>
          <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-1">
            Tap a dining table or open a quick check to begin adding items.
          </p>
        </div>
      </div>
    )
  }

  // Group active non-voided items by seat number
  const groupedBySeat = useMemo(() => {
    const map: Record<number, typeof order.items> = {}
    order.items
      .filter((it) => it.status !== 'voided')
      .forEach((it) => {
        const seat = it.seatNumber || 1
        if (!map[seat]) map[seat] = []
        map[seat].push(it)
      })
    return map
  }, [order.items])

  const distinctSeats = Object.keys(groupedBySeat).map(Number).sort((a, b) => a - b)
  const activeItemsCount = order.items.filter((i) => i.status !== 'voided').length

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden select-none">
      {/* ─── Sidebar Header ─────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-slate-50/60 dark:bg-slate-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Guest Pad
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black">
              {activeItemsCount} {activeItemsCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {distinctSeats.length > 1 && (
              <button
                type="button"
                onClick={onOpenSplitCheck}
                className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors"
                title="Split check by seat"
              >
                <GitFork className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenReceiptPreview}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
              title="Receipt thermal preview"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Fast Course Kitchen Fire Ribbon ───────────────────────── */}
        <div className="grid grid-cols-3 gap-1.5">
          {(['starter', 'main', 'dessert'] as CourseType[]).map((crs) => (
            <button
              key={crs}
              type="button"
              onClick={() => onFireCourse(crs)}
              className="py-1.5 px-2 rounded-xl bg-orange-500/10 hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 text-[10px] font-black flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <Flame className="w-3 h-3" />
              <span className="capitalize">Fire {crs}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Scrollable Items Stream Grouped by Seat ───────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {distinctSeats.map((seat) => {
          const seatItems = groupedBySeat[seat]
          const isCurrentActive = activeSeat === seat

          return (
            <div key={seat} className="space-y-1.5">
              {/* Seat Indicator Header */}
              <div
                onClick={() => {
                  sounds.playBump()
                  onSelectSeat(seat)
                }}
                className={`flex items-center justify-between px-2 py-1 rounded-xl cursor-pointer transition-all ${
                  isCurrentActive
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-black'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="w-3 h-3" />
                  <span>Seat #{seat}</span>
                  {isCurrentActive && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500 text-white uppercase font-black tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-[10px] opacity-70">
                  {seatItems.length} {seatItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items for this seat */}
              <div className="space-y-1.5">
                {seatItems.map((item) => (
                  <CartItemRow key={item.id} item={item} onUpdateQty={onUpdateQty} />
                ))}
              </div>
            </div>
          )
        })}

        {activeItemsCount === 0 && (
          <div className="py-16 text-center text-slate-400 text-xs font-semibold">
            Order ticket is currently empty
          </div>
        )}
      </div>

      {/* ─── Financial Totals & Cashier Actions ─────────────────────── */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/60 space-y-2.5">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">${order.subtotal.toFixed(2)}</span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex justify-between text-rose-500 font-bold">
              <span>Discount ({order.discountType === 'percentage' ? `${order.discountAmount}%` : 'Fixed'})</span>
              <span>
                -$
                {(order.discountType === 'percentage'
                  ? (order.subtotal * order.discountAmount) / 100
                  : order.discountAmount
                ).toFixed(2)}
              </span>
            </div>
          )}

          {order.tax > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Tax ({((order.taxRate || 0) * 100).toFixed(0)}%)</span>
              <span className="font-semibold">${order.tax.toFixed(2)}</span>
            </div>
          )}

          {order.tipAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Server Gratuity</span>
              <span>${order.tipAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
            <span>Balance Due</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-lg">
              ${order.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onOpenDiscount}
            className="py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 active:scale-98 transition-all"
          >
            <Percent className="w-3.5 h-3.5 text-amber-500" />
            <span>Discount</span>
          </button>

          <button
            type="button"
            onClick={onOpenPayment}
            className="py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-98 transition-all"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay / Settle</span>
          </button>
        </div>
      </div>
    </div>
  )
}