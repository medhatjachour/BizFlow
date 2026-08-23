import React from 'react'
import { Plus, Minus, Edit2, Trash2, AlertTriangle, ShieldAlert, MapPin } from 'lucide-react'
import { StockEntry, LocationRef } from '../types'
import { computeStockHealth } from '../utils'

interface Props {
  entries: StockEntry[]
  locations: LocationRef[]
  onAdjustStep: (entry: StockEntry, delta: number) => void
  onEdit: (entry: StockEntry) => void
  onDelete: (id: string) => void
}

export const InventoryTable: React.FC<Props> = ({
  entries,
  locations,
  onAdjustStep,
  onEdit,
  onDelete
}) => {
  const locationMap = new Map(locations.map(l => [l.id, l]))

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-400 text-xs">
        No inventory stock entries found matching the filter criteria.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Product & SKU</th>
              <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Location / Bin</th>
              <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
              <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Min Threshold</th>
              <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Health Status</th>
              <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {entries.map(entry => {
              const health = computeStockHealth(entry)
              const loc = locationMap.get(entry.locationId)
              const isLow = health.status === 'low' || health.status === 'critical' || health.status === 'out'

              return (
                <tr
                  key={entry.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    isLow ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                  }`}
                >
                  {/* Product Details */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                        {entry.isQuarantine && <ShieldAlert className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
                        <span>{entry.productName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span>{entry.sku || 'No SKU'}</span>
                        {entry.lotNumber && <span>• Lot: {entry.lotNumber}</span>}
                        {entry.expiryDate && <span>• Exp: {new Date(entry.expiryDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </td>

                  {/* Location Info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{loc?.name || entry.locationId}</span>
                    </div>
                    {entry.binCode && (
                      <div className="text-[10.5px] font-mono text-slate-400">Bin: {entry.binCode}</div>
                    )}
                  </td>

                  {/* Quick-Step Adjuster */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onAdjustStep(entry, -1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`w-12 text-center font-bold text-sm ${health.colorClass}`}>
                        {entry.quantity.toLocaleString()}
                      </span>
                      <button
                        onClick={() => onAdjustStep(entry, 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-center text-slate-400 mt-0.5">{entry.unit}</div>
                  </td>

                  {/* Min Threshold */}
                  <td className="px-4 py-3 text-center text-slate-500 font-mono">
                    {entry.minQuantity} {entry.unit}
                  </td>

                  {/* Health Progress */}
                  <td className="px-4 py-3 min-w-[140px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className={`font-semibold ${health.colorClass}`}>{health.label}</span>
                        <span className="font-mono text-slate-400">{health.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${health.bgClass}`} style={{ width: `${health.pct}%` }} />
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onEdit(entry)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Adjust / Edit Entry"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}