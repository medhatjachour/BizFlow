import React from 'react'
import {
  Users,
  Clock,
  DollarSign,
  ArrowRightLeft,
  GitMerge,
  UserCheck,
  Edit2,
  Trash2
} from 'lucide-react'
import { RestaurantTableData, TableStatus } from '../types'
import { TABLE_STATUS_CONFIG } from '../constants'
import { formatOccupancyDuration, getDurationColorClass } from '../utils'

interface Props {
  table: RestaurantTableData
  onSelect: (table: RestaurantTableData) => void
  onQuickSeat: (table: RestaurantTableData) => void
  onTransfer: (table: RestaurantTableData) => void
  onMerge: (table: RestaurantTableData) => void
  onStatusChange: (id: string, status: TableStatus) => void
  onEdit: (table: RestaurantTableData) => void
  onDelete: (id: string) => void
}

export const TableCard: React.FC<Props> = ({
  table,
  onSelect,
  onQuickSeat,
  onTransfer,
  onMerge,
  onStatusChange,
  onEdit,
  onDelete
}) => {
  const cfg = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.available
  const openOrder = table.orders?.[0]
  const nextReservation = table.reservations?.[0]

  return (
    <div
      onClick={() => onSelect(table)}
      className={`group relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 ${cfg.bg} ${cfg.border} ${cfg.glow} shadow-sm hover:shadow-md flex flex-col justify-between`}
    >
      {/* Top Header: Table Name/Number & Status Badge */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              #{table.number}
            </span>
            {table.name && table.name !== `Table ${table.number}` && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[90px]">
                {table.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight uppercase ${cfg.text} bg-white/70 dark:bg-slate-900/70 border border-current/20 shadow-2xs`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Section & Capacity Details */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 mb-3">
          <span className="truncate max-w-[120px] font-medium">{table.section}</span>
          <span className="flex items-center gap-1 font-semibold">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {openOrder ? `${openOrder.guestCount}/${table.capacity}` : table.capacity}
          </span>
        </div>
      </div>

      {/* Middle Context: Active Order or Next Reservation */}
      <div className="my-2 bg-white/80 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 min-h-[54px] flex flex-col justify-center">
        {openOrder ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span className={getDurationColorClass(openOrder.openedAt)}>
                  {formatOccupancyDuration(openOrder.openedAt)}
                </span>
              </span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                {openOrder.total.toFixed(2)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate flex items-center justify-between">
              <span>{openOrder.serverName || 'Staff'}</span>
              <span className="text-slate-400">{openOrder.items.length} items</span>
            </div>
          </div>
        ) : nextReservation ? (
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
            📅 {new Date(nextReservation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
            {nextReservation.customerName} ({nextReservation.partySize}p)
          </div>
        ) : (
          <div className="text-center text-xs text-slate-400 dark:text-slate-500 italic">
            Table ready for guests
          </div>
        )}
      </div>

      {/* Quick Action Footer */}
      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-1">
        {table.status === 'available' ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onQuickSeat(table)
            }}
            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" /> Quick Seat
          </button>
        ) : table.status === 'occupied' || table.status === 'billing' ? (
          <div className="flex items-center gap-1 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTransfer(table)
              }}
              title="Transfer Order"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMerge(table)
              }}
              title="Merge Tables"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors"
            >
              <GitMerge className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange(table.id, table.status === 'occupied' ? 'billing' : 'cleaning')
              }}
              className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-xs transition-colors"
            >
              {table.status === 'occupied' ? 'Bill Out' : 'Mark Clean'}
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onStatusChange(table.id, 'available')
            }}
            className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            Set Available
          </button>
        )}

        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(table)
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(table.id)
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}