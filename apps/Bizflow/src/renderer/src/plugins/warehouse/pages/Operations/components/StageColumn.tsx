import React from 'react'
import { WarehouseOrder } from '../types'
import { OrderCard } from './OrderCard'
import { Inbox } from 'lucide-react'

interface Props {
  title: string
  count: number
  orders: WarehouseOrder[]
  onAdvance: (order: WarehouseOrder) => Promise<void>
  actingOrderId: string | null
  compact?: boolean
}

export const StageColumn: React.FC<Props> = ({
  title,
  count,
  orders,
  onAdvance,
  actingOrderId,
  compact = false
}) => {
  return (
    <div className="flex flex-col h-full rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 p-3">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200/60 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          {title}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
          {count}
        </span>
      </div>

      {/* Orders List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[32rem] pr-1">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
            <Inbox className="w-6 h-6 stroke-[1.5] mb-1 opacity-60" />
            <p className="text-[11px] font-medium">No items in queue</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={onAdvance}
              isActing={actingOrderId === order.id}
              compact={compact}
            />
          ))
        )}
      </div>
    </div>
  )
}