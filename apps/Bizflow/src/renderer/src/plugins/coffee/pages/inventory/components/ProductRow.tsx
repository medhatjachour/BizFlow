import { Plus, History } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Product } from '../types'
import { isLow, isOut, stockPercent, stockBarColor, formatMoney } from '../utils'
import { hexToRgba } from '../utils'

interface Props {
  product: Product
  onAdjust: (p: Product) => void
  onHistory: (p: Product) => void
}

export function ProductRow({ product: p, onAdjust, onHistory }: Props) {
  const low = isLow(p)
  const out = isOut(p)
  const pct = stockPercent(p)
  const barColor = stockBarColor(p)
  const value = p.stock * p.cost
  const revenue = p.stock * p.price

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Name + stock bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</span>
          {!p.isAvailable && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">OFF</span>
          )}
        </div>

        {/* Stock bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[200px]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{p.stock}</span>
          <span className="text-[10px] text-slate-400">/ {p.reorderPoint} min</span>
          {low && !out && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">LOW</span>
          )}
          {out && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">OUT</span>
          )}
        </div>
      </div>

      {/* Value + revenue */}
      <div className="hidden sm:flex items-center gap-6 text-right">
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Cost value</div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">{formatMoney(value)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Exp. rev.</div>
          <div className="text-sm font-medium text-green-600 dark:text-green-400 tabular-nums">{formatMoney(revenue)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Price</div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">{formatMoney(p.price)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onAdjust(p)}
          className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors"
          title="Adjust stock"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => onHistory(p)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          title="History"
        >
          <History className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
