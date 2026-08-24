// src/pages/Kitchen/components/KdsItemRow.tsx
import React from 'react'
import { Check, Flame, CheckCheck } from 'lucide-react'
import { KdsItem } from '../types'
import { parseModifiers } from '../utils'
import { sounds } from '../../utils/sound'

interface Props {
  item: KdsItem
  onBump: (id: string) => void
}

export const KdsItemRow: React.FC<Props> = ({ item, onBump }) => {
  const modifiers = parseModifiers(item.modifiers)
  const isReady = item.status === 'ready'
  const isPrep = item.status === 'preparing'
  const isServed = item.status === 'served'

  if (isServed) return null

  return (
    <div
      onClick={() => {
        sounds.playBump()
        onBump(item.id)
      }}
      className={`p-2.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-2.5 active:scale-[0.98] ${
        isReady
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300'
          : isPrep
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300'
            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-400'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {/* Quantity Badge */}
        <span
          className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
            isReady
              ? 'bg-emerald-500 text-white'
              : isPrep
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
          }`}
        >
          {item.quantity}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-black ${isReady ? 'line-through opacity-70' : ''}`}>
              {item.itemName}
            </span>
            {item.seatNumber && (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                S{item.seatNumber}
              </span>
            )}
          </div>

          {modifiers.length > 0 && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-0.5 leading-tight">
              ↳ {modifiers.join(', ')}
            </div>
          )}

          {item.notes && (
            <div className="text-[10px] text-rose-500 font-black mt-0.5">
              ⚠️ "{item.notes}"
            </div>
          )}
        </div>
      </div>

      {/* Status Action Indicator */}
      <div className="shrink-0 flex items-center gap-1">
        {isReady ? (
          <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
            <CheckCheck className="w-3.5 h-3.5" />
          </span>
        ) : isPrep ? (
          <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
            <Flame className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400">
            <Check className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}