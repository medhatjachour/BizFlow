import {
  ShoppingBag, Plus, Loader2, AlertTriangle,
  Package, Calendar, ArrowLeft, Tag
} from 'lucide-react'
import type { RecipeGroup, SellableBatch } from './salesTab.types'
import { fmtDate, fmtCurrency, daysUntil } from './salesTab.shared'

export default function SellConfirmPanel({
  group, selectedBatch, onSelectBatch,
  saleQty, onQtyChange,
  priceInput, onPriceChange, effectivePrice, saleTotal,
  saleDate, onDateChange,
  saleNotes, onNotesChange, showNotes, onToggleNotes,
  submitting, error, onSell, onBack
}: {
  group: RecipeGroup
  selectedBatch: SellableBatch | null
  onSelectBatch: (id: string) => void
  saleQty: number
  onQtyChange: (qty: number) => void
  priceInput: string
  onPriceChange: (price: string) => void
  effectivePrice: number
  saleTotal: number
  saleDate: string
  onDateChange: (d: string) => void
  saleNotes: string
  onNotesChange: (n: string) => void
  showNotes: boolean
  onToggleNotes: () => void
  submitting: boolean
  error: string | null
  onSell: () => void
  onBack: () => void
}) {
  const maxQty      = selectedBatch?.unitsAvailable ?? 0
  const isOverstock = saleQty > maxQty
  const isValid     = saleQty > 0 && !isOverstock && effectivePrice >= 0 && selectedBatch != null
  const safeTotal   = isNaN(saleTotal) ? 0 : saleTotal

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          title="Back to product list"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200 truncate">{group.recipe.name}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {group.totalAvailable} {group.recipe.yieldUnit} in stock
            {group.batches.length > 1 && ` · ${group.batches.length} batches`}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {/* Batch selection */}
        {group.batches.length > 1 ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              <Package className="inline h-3 w-3 mr-1" /> Batch
            </label>
            <select
              value={selectedBatch?.id ?? ''}
              onChange={e => onSelectBatch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {group.batches.map(b => {
                const expDays = b.expiresAt ? daysUntil(b.expiresAt) : null
                return (
                  <option key={b.id} value={b.id}>
                    {fmtDate(b.batchDate)} · {b.unitsAvailable} left{expDays !== null ? ` · exp ${expDays}d` : ''}
                  </option>
                )
              })}
            </select>
          </div>
        ) : selectedBatch ? (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Package className="h-3.5 w-3.5 text-blue-500" /> Batch: {fmtDate(selectedBatch.batchDate)}
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {selectedBatch.unitsAvailable} {group.recipe.yieldUnit} available
            </span>
          </div>
        ) : null}

        {/* Quantity stepper */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Quantity
            <span className="ml-1 font-normal text-slate-400">(max: {maxQty} {group.recipe.yieldUnit})</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQtyChange(Math.max(1, saleQty - 1))}
              disabled={saleQty <= 1}
              className="h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-xl font-light"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max={maxQty}
              step="1"
              value={saleQty}
              onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) onQtyChange(v) }}
              className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-600 px-3 text-center text-base font-bold dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={() => onQtyChange(Math.min(maxQty, saleQty + 1))}
              disabled={saleQty >= maxQty}
              className="h-10 w-10 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors text-xl font-light"
            >
              +
            </button>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOverstock ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (saleQty / Math.max(maxQty, 1)) * 100)}%` }}
            />
          </div>
          {isOverstock && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Exceeds available stock
            </p>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            <Tag className="inline h-3 w-3 mr-1" /> Price per {group.recipe.yieldUnit}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={e => onPriceChange(e.target.value)}
              placeholder={group.recipe.sellingPrice?.toFixed(2) ?? '0.00'}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 pl-7 pr-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {group.recipe.sellingPrice && priceInput !== '' && parseFloat(priceInput) !== group.recipe.sellingPrice && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Default: ${group.recipe.sellingPrice.toFixed(2)} / {group.recipe.yieldUnit}
            </p>
          )}
        </div>

        {/* Sale date */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            <Calendar className="inline h-3 w-3 mr-1" /> Sale date
          </label>
          <input
            type="date"
            value={saleDate}
            onChange={e => onDateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Notes */}
        <button
          type="button"
          onClick={onToggleNotes}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          <Plus className="h-3 w-3" /> {showNotes ? 'Hide note' : 'Add note'}
        </button>
        {showNotes && (
          <textarea
            value={saleNotes}
            onChange={e => onNotesChange(e.target.value)}
            rows={2}
            placeholder="e.g. Corporate order, discount applied…"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-700 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        )}

        {/* Total + confirm */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {saleQty} × ${isNaN(effectivePrice) ? '0.00' : effectivePrice.toFixed(2)}
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">${fmtCurrency(safeTotal)}</span>
          </div>
          <button
            onClick={onSell}
            disabled={submitting || !isValid}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm"
          >
            {submitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><ShoppingBag className="h-4 w-4" /> Record Sale</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
