import React, { useState } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { RecipeGroup } from '../types'
import { daysUntil, formatCurrency, getExpiryUrgency } from '../utils'

interface Props {
  group: RecipeGroup
  onSelect: (group: RecipeGroup) => void
  onSavePrice: (recipeId: string, price: number) => Promise<void>
}

export const ProductCard: React.FC<Props> = ({ group, onSelect, onSavePrice }) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState(
    group.recipe.sellingPrice ? group.recipe.sellingPrice.toString() : ''
  )
  const [savingPrice, setSavingPrice] = useState(false)

  const expDays = group.earliestExpiry ? daysUntil(group.earliestExpiry) : null
  const urgency = getExpiryUrgency(group.earliestExpiry)
  const hasPrice = group.recipe.sellingPrice != null && group.recipe.sellingPrice > 0

  const handlePriceSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const val = parseFloat(priceInput)
    if (isNaN(val) || val < 0) return
    setSavingPrice(true)
    try {
      await onSavePrice(group.recipe.id, val)
      setIsEditingPrice(false)
    } finally {
      setSavingPrice(false)
    }
  }

  if (isEditingPrice) {
    return (
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3.5 flex flex-col justify-between min-h-[140px] shadow-sm animate-in fade-in"
      >
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {group.recipe.name}
          </p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
            Set price per {group.recipe.yieldUnit}
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
              $
            </span>
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={e => setPriceInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handlePriceSave()
                if (e.key === 'Escape') setIsEditingPrice(false)
              }}
              className="w-full pl-6 pr-2 py-1 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={handlePriceSave}
            disabled={savingPrice || !priceInput}
            className="p-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            {savingPrice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setIsEditingPrice(false)}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onSelect(group)}
      className={`group relative rounded-2xl border transition-all overflow-hidden cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] ${
        urgency === 'expired'
          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-400'
          : urgency === 'critical'
          ? 'border-orange-300 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20 hover:border-orange-400'
          : urgency === 'warn'
          ? 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800/90 hover:border-amber-400'
          : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:border-emerald-400 dark:hover:border-emerald-600'
      }`}
    >
      {/* Urgency indicator strip */}
      {urgency !== 'none' && urgency !== 'ok' && (
        <div
          className={`h-1.5 ${
            urgency === 'expired'
              ? 'bg-rose-500'
              : urgency === 'critical'
              ? 'bg-orange-500'
              : 'bg-amber-400'
          }`}
        />
      )}

      <div className="p-3.5 flex flex-col justify-between min-h-[135px]">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight">
              {group.recipe.name}
            </h4>
            <button
              onClick={e => {
                e.stopPropagation()
                setIsEditingPrice(true)
              }}
              title="Edit unit price"
              className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {group.totalAvailable}
            </span>{' '}
            {group.recipe.yieldUnit}
            {group.batches.length > 1 && (
              <span className="text-slate-400 dark:text-slate-500 ml-1">
                ({group.batches.length} batches)
              </span>
            )}
          </p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            {hasPrice ? (
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                ${formatCurrency(group.recipe.sellingPrice!)}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">
                  /{group.recipe.yieldUnit}
                </span>
              </p>
            ) : (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium italic">
                Set Price
              </span>
            )}
          </div>

          {expDays !== null && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                urgency === 'expired'
                  ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800'
                  : urgency === 'critical'
                  ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800'
                  : urgency === 'warn'
                  ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {expDays <= 0 ? 'Expired' : expDays === 1 ? 'Exp tomorrow' : `${expDays}d left`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}