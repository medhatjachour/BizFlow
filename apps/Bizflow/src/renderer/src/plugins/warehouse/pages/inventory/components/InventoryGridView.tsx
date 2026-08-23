import React from 'react'
import { Plus, Minus, Edit2, Trash2, MapPin } from 'lucide-react'
import { StockEntry, LocationRef } from '../types'
import { computeStockHealth } from '../utils'

interface Props {
  entries: StockEntry[]
  locations: LocationRef[]
  onAdjustStep: (entry: StockEntry, delta: number) => void
  onEdit: (entry: StockEntry) => void
  onDelete: (id: string) => void
}

export const InventoryGridView: React.FC<Props> = ({
  entries,
  locations,
  onAdjustStep,
  onEdit,
  onDelete
}) => {
  const locationMap = new Map(locations.map(l => [l.id, l]))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {entries.map(entry => {
        const health = computeStockHealth(entry)
        const loc = locationMap.get(entry.locationId)
        const isLow = health.status === 'low' || health.status === 'critical' || health.status === 'out'

        return (
          <div
            key={entry.id}
            className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-all ${
              isLow ? 'border-amber-200 dark:border-amber-900/60' : ''
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {entry.productName}
                  </h4>
                  <div className="text-[11px] font-mono text-slate-400">{entry.sku || 'No SKU'}</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${health.bgClass}/15 ${health.colorClass}`}>
                  {health.label}
                </span>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {loc?.name || 'General'}
                </span>
                {entry.binCode && <span className="font-mono">Bin: {entry.binCode}</span>}
              </div>
            </div>

            {/* Health bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Threshold: {entry.minQuantity} {entry.unit}</span>
                <span>{health.pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${health.bgClass}`} style={{ width: `${health.pct}%` }} />
              </div>
            </div>

            {/* Quantity Controls & Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAdjustStep(entry, -1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:text-rose-600"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className={`w-10 text-center font-bold text-sm ${health.colorClass}`}>
                  {entry.quantity}
                </span>
                <button
                  onClick={() => onAdjustStep(entry, 1)}
                  className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:text-emerald-600"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(entry)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}