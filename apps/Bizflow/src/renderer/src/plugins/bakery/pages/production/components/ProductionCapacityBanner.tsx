import React from 'react'
import { PackageCheck, AlertTriangle } from 'lucide-react'
import { AvailableBatchCapacity } from '../types'

interface Props {
  capacity: AvailableBatchCapacity[]
  onSelectRecipeToBake: (recipeId: string) => void
}

export const ProductionCapacityBanner: React.FC<Props> = ({
  capacity,
  onSelectRecipeToBake,
}) => {
  if (!capacity || capacity.length === 0) return null

  // Show only top recipes that have pantry links
  const trackable = capacity.filter(c => c.availableBatches !== null).slice(0, 4)
  if (trackable.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Pantry Capacity (Available Batches by Stock)
        </h4>
        <span className="text-xs text-slate-400 font-medium">Real-time stock estimation</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {trackable.map(c => {
          const isAvailable = (c.availableBatches ?? 0) > 0
          return (
            <div
              key={c.recipeId}
              onClick={() => onSelectRecipeToBake(c.recipeId)}
              className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                isAvailable
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                  : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {c.recipeName}
                </p>
                {isAvailable ? (
                  <PackageCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
              </div>

              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`text-lg font-black ${
                    isAvailable
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {c.availableBatches ?? 0}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  batches ({c.expectedUnits ?? 0} {c.yieldUnit})
                </span>
              </div>

              {c.limitedBy && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Limited by: <strong className="font-semibold text-slate-700 dark:text-slate-200">{c.limitedBy}</strong>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}