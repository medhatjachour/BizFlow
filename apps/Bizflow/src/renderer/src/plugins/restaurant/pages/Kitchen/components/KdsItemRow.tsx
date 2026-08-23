import React from 'react'
import { KdsItem } from '../types'
import { parseModifiers } from '../utils'

interface Props {
  item: KdsItem
  onBump: (id: string) => void
}

export const KdsItemRow: React.FC<Props> = ({ item, onBump }) => {
  const modifiers = parseModifiers(item.modifiers)
  const isReady = item.status === 'ready'
  const isPrep = item.status === 'preparing'

  return (
    <div
      onClick={() => onBump(item.id)}
      className={`p-2 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
        isReady
          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
          : isPrep
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-400'
      }`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span
          className={`w-5 h-5 rounded-md font-black text-xs flex items-center justify-center shrink-0 ${
            isReady
              ? 'bg-emerald-500 text-white'
              : isPrep
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {item.quantity}
        </span>
        <div className="min-w-0">
          <span className={`text-xs font-bold block truncate ${isReady ? 'line-through opacity-70' : ''}`}>
            {item.itemName}
          </span>
          {modifiers.length > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block truncate font-medium">
              ↳ {modifiers.join(', ')}
            </span>
          )}
          {item.notes && (
            <span className="text-[10px] text-rose-500 font-bold block truncate">
              ⚠️ "{item.notes}"
            </span>
          )}
        </div>
      </div>

      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {item.status}
      </span>
    </div>
  )
}