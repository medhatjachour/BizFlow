import React from 'react'
import {
  X,
  Clock,
  Users,
  Receipt,
  UserCheck,
  ArrowRightLeft,
  GitMerge,
  Calendar
} from 'lucide-react'
import { RestaurantTableData } from '../types'
import { TABLE_STATUS_CONFIG } from '../constants'
import { formatOccupancyDuration } from '../utils'

interface Props {
  table: RestaurantTableData | null
  onClose: () => void
  onOpenPos: (table: RestaurantTableData) => void
  onQuickSeat: (table: RestaurantTableData) => void
  onTransfer: (table: RestaurantTableData) => void
  onMerge: (table: RestaurantTableData) => void
  onStatusChange: (id: string, status: any) => void
}

export const TableDetailDrawer: React.FC<Props> = ({
  table,
  onClose,
  onOpenPos,
  onQuickSeat,
  onTransfer,
  onMerge,
}) => {
  if (!table) return null

  const cfg = TABLE_STATUS_CONFIG[table.status]
  const openOrder = table.orders?.[0]

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Table #{table.number}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${cfg.text} ${cfg.bg} border ${cfg.border}`}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {table.section} • Capacity {table.capacity} guests
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {openOrder ? (
          <>
            {/* Active Order Summary Card */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Active Bill #{openOrder.orderNumber || '1'}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Seated {formatOccupancyDuration(openOrder.openedAt)} ago
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">Server</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {openOrder.serverName || 'Staff'}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl">
                  <span className="text-[11px] text-slate-500 block">Party Size</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {openOrder.guestCount} Guests
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items List */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Ordered Items ({openOrder.items.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2 border border-slate-200/60 dark:border-slate-700/60 max-h-60 overflow-y-auto">
                {openOrder.items.map((it) => (
                  <div key={it.id} className="py-2 px-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {it.quantity}x {it.itemName}
                      </span>
                      <span className="block text-[10px] text-slate-400 capitalize">{it.status}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${(it.unitPrice * it.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between px-2 text-sm font-black text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                  ${openOrder.total.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Table is Empty</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Ready for guest seating or reservation check-in.
            </p>
          </div>
        )}

        {/* Reservations Briefing */}
        {table.reservations && table.reservations.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Upcoming Reservations
            </h4>
            <div className="space-y-2">
              {table.reservations.map((res) => (
                <div
                  key={res.id}
                  className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-300 block">{res.customerName}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(res.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {res.partySize} guests
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Actions Footer */}
      <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-900/80">
        {openOrder ? (
          <>
            <button
              onClick={() => onOpenPos(table)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Receipt className="w-4 h-4" /> Open POS & Add Items
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => onTransfer(table)}
                className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
              </button>
              <button
                onClick={() => onMerge(table)}
                className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <GitMerge className="w-3.5 h-3.5" /> Merge
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => onQuickSeat(table)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <UserCheck className="w-4 h-4" /> Quick Seat Walk-In
          </button>
        )}
      </div>
    </div>
  )
}