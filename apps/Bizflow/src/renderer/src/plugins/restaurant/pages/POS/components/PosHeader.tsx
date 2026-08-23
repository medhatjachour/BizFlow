import React from 'react'
import { Users, Clock, ArrowLeft, ShieldCheck } from 'lucide-react'
import { PosOrder } from '../types'
import { formatElapsed } from '../utils'

interface Props {
  order: PosOrder | null
  allOrders: PosOrder[]
  onSelectOrder: (order: PosOrder) => void
  onBackToFloor?: () => void
}

export const PosHeader: React.FC<Props> = ({ order, allOrders, onSelectOrder, onBackToFloor }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
      {/* Left: Navigation & Active Table Selector */}
      <div className="flex items-center gap-3">
        {onBackToFloor && (
          <button
            onClick={onBackToFloor}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Return to Visual Floor"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Active Table Badge / Selector */}
        {order ? (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-base shadow-sm shadow-amber-500/30">
              #{order.table?.number || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  Table {order.table?.number}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 capitalize">
                  {order.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {order.table?.section || 'Main Area'} • Bill #{order.orderNumber || '1'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-500">No active check selected</div>
        )}
      </div>

      {/* Center: Order Info Badges */}
      {order && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{order.guestCount} Guests</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Server: {order.serverName || 'Staff'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatElapsed(order.openedAt)}</span>
          </div>
        </div>
      )}

      {/* Right: Quick Switch Active Checks */}
      <div className="flex items-center gap-2">
        <select
          value={order?.id || ''}
          onChange={(e) => {
            const found = allOrders.find((o) => o.id === e.target.value)
            if (found) onSelectOrder(found)
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Switch Active Ticket ({allOrders.length})...</option>
          {allOrders.map((o) => (
            <option key={o.id} value={o.id}>
              Table #{o.table?.number || '?'} — ${o.total.toFixed(2)} ({o.serverName || 'Staff'})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}