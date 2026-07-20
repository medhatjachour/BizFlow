import { useState, useEffect, useRef } from 'react'
import {
  X, Loader2, Plus, Minus, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Package, RefreshCw,
} from 'lucide-react'
import type { Product, AdjustForm, AdjustType } from '../types'
import { ADJUST_TYPES, adjustMeta } from '../constants'
import { hexToRgba, formatMoney, stockPercent, stockBarColor } from '../utils'

interface Props {
  product: Product | null
  form: AdjustForm
  patchForm: (p: Partial<AdjustForm>) => void
  onSubmit: (payload: { quantity: number; type: AdjustType; reason?: string }) => void
  onClose: () => void
  saving: boolean
}

// ── Reason presets per type ─────────────────────────────────────────────────
const REASON_PRESETS: Record<AdjustType, string[]> = {
  restock:    ['Supplier delivery', 'Weekly restock', 'New shipment', 'Emergency restock'],
  adjustment: ['Monthly count', 'Cycle count', 'System correction', 'Found stock'],
  waste:      ['Spillage', 'Expired', 'Damaged', 'Quality issue'],
  write_off:  ['Lost', 'Stolen', 'Beyond repair', 'Discontinued'],
}

const QUICK_DELTAS = [1, 5, 10, 25]

export function AdjustStockModal({ product, form, patchForm, onSubmit, onClose, saving }: Props) {
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const [localReason, setLocalReason] = useState(form.reason)

  useEffect(() => {
    setLocalReason(form.reason)
  }, [form.reason])

  if (!product) return null

  const meta = adjustMeta(form.type)
  const Icon = meta.icon
  const isCorrection = form.type === 'adjustment'
  const isSubtract = meta.sign === '-'

  // ── Compute final values ──────────────────────────────────────────────────
  const inputQty = parseInt(form.quantity, 10) || 0

  let finalDelta: number
  let newStock: number

  if (isCorrection) {
    // ABSOLUTE mode: quantity = the new stock value
    newStock = Math.max(0, inputQty)
    finalDelta = newStock - product.stock
  } else {
    // DELTA mode: add or remove
    finalDelta = isSubtract ? -Math.abs(inputQty) : Math.abs(inputQty)
    newStock = product.stock + finalDelta
  }

  const isValid = isCorrection
    ? inputQty >= 0 && inputQty !== product.stock
    : inputQty > 0 && newStock >= 0

  const isNegative = newStock < 0
  const isLowAfter = newStock > 0 && newStock <= product.reorderPoint
  const isOutAfter = newStock === 0

  // ── Value impact ──────────────────────────────────────────────────────────
  const valueImpact = finalDelta * product.cost
  const revenueImpact = finalDelta * product.price

  // ── Stock bar widths ──────────────────────────────────────────────────────
  const currentPct = Math.min(100, stockPercent(product))
  const newPct = Math.min(100, newStock > 0 ? (newStock / (product.reorderPoint * 2)) * 100 : 0)

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!isValid || isNegative) return
    onSubmit({
      quantity: finalDelta,
      type: form.type,
      reason: localReason.trim() || undefined,
    })
  }

  // ── Quick adjust ──────────────────────────────────────────────────────────
  const quickAdjust = (delta: number) => {
    if (isCorrection) {
      // In correction mode, quick buttons set absolute value relative to current
      const next = Math.max(0, product.stock + delta)
      patchForm({ quantity: String(next) })
    } else {
      const current = parseInt(form.quantity, 10) || 0
      patchForm({ quantity: String(current + delta) })
    }
  }

  const setExact = (val: number) => {
    patchForm({ quantity: String(val) })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header with product info ──────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: hexToRgba(meta.color, 0.15), color: meta.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Adjust Stock
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── Current stock card ─────────────────────────────────────── */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Current Stock
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {product.stock}
                </span>
                <span className="text-xs text-slate-400">units</span>
              </div>
            </div>

            {/* Current stock bar */}
            <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${currentPct}%`,
                  backgroundColor: stockBarColor(product),
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
              <span>0</span>
              <span>Min: {product.reorderPoint}</span>
              <span>{product.reorderPoint * 2}+</span>
            </div>
          </div>

          {/* ── Adjustment type — visual grid ──────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ADJUST_TYPES.map((a) => {
                const TypeIcon = a.icon
                const selected = form.type === a.value
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => {
                      patchForm({
                        type: a.value as AdjustType,
                        quantity: a.value === 'adjustment'
                          ? String(product.stock)  // pre-fill current stock for correction
                          : '1',
                      })
                      setTimeout(() => qtyInputRef.current?.focus(), 0)
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-transparent shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    style={selected ? {
                      backgroundColor: hexToRgba(a.color, 0.12),
                      color: a.color,
                    } : undefined}
                  >
                    <TypeIcon className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight">
                        {a.label}
                      </div>
                      <div className={`text-[10px] leading-tight truncate ${
                        selected ? 'opacity-70' : 'text-slate-400'
                      }`}>
                        {a.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Mode indicator ─────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: hexToRgba(meta.color, 0.08),
              color: meta.color,
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isCorrection ? (
              <span>
                <strong>Correction mode:</strong> Enter the exact counted stock — the system will calculate the difference automatically.
              </span>
            ) : isSubtract ? (
              <span>
                <strong>Remove mode:</strong> Enter how many units to subtract from current stock.
              </span>
            ) : (
              <span>
                <strong>Add mode:</strong> Enter how many units to add to current stock.
              </span>
            )}
          </div>

          {/* ── Quantity input ─────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              {isCorrection ? 'Counted Stock Level' : 'Quantity'}
            </label>

            {/* Main input with prefix */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                {isCorrection ? '=' : meta.sign}
              </span>
              <input
                ref={qtyInputRef}
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => patchForm({ quantity: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                autoFocus
                className="w-full pl-8 pr-3 py-2.5 text-lg font-semibold text-center border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none tabular-nums transition-colors"
              />
            </div>

            {/* Quick adjust buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 mr-1">Quick:</span>
              {isCorrection ? (
                <>
                  <button
                    type="button"
                    onClick={() => setExact(0)}
                    className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                  >
                    Zero
                  </button>
                  <button
                    type="button"
                    onClick={() => setExact(product.reorderPoint)}
                    className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 transition-colors"
                  >
                    Min
                  </button>
                  <button
                    type="button"
                    onClick={() => setExact(product.reorderPoint * 2)}
                    className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors"
                  >
                    Healthy
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setExact(product.stock)}
                    className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Same as now
                  </button>
                </>
              ) : (
                <>
                  {QUICK_DELTAS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => quickAdjust(d)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 transition-colors tabular-nums"
                    >
                      +{d}
                    </button>
                  ))}
                  <div className="flex-1" />
                  {QUICK_DELTAS.slice().reverse().map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => quickAdjust(-d)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors tabular-nums"
                    >
                      −{d}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ── Reason with presets ────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Reason <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={localReason}
              onChange={(e) => setLocalReason(e.target.value)}
              placeholder="Type a reason or pick one below..."
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
            />
            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {REASON_PRESETS[form.type].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLocalReason(preset)}
                  className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                    localReason === preset
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* ── Live preview: before → after ───────────────────────────── */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Result Preview
              </span>
              {finalDelta !== 0 && !isNegative && (
                <span
                  className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                    finalDelta > 0
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {finalDelta > 0 ? '+' : ''}{finalDelta}
                </span>
              )}
            </div>

            {/* Before → After visual */}
            <div className="flex items-center gap-3">
              {/* Before */}
              <div className="flex-1 text-center">
                <div className="text-[10px] text-slate-400 mb-1">Before</div>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {product.stock}
                </div>
              </div>

              {/* Arrow + delta */}
              <div className="flex flex-col items-center">
                {finalDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : finalDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                ) : (
                  <Minus className="w-5 h-5 text-slate-400" />
                )}
                <span className={`text-[10px] font-medium mt-0.5 tabular-nums ${
                  finalDelta > 0 ? 'text-green-600' : finalDelta < 0 ? 'text-red-500' : 'text-slate-400'
                }`}>
                  {finalDelta > 0 ? '+' : ''}{finalDelta}
                </span>
              </div>

              {/* After */}
              <div className="flex-1 text-center">
                <div className="text-[10px] text-slate-400 mb-1">After</div>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    isNegative
                      ? 'text-red-500'
                      : isOutAfter
                      ? 'text-red-500'
                      : isLowAfter
                      ? 'text-amber-500'
                      : 'text-green-600'
                  }`}
                >
                  {isNegative ? '!' : newStock}
                </div>
              </div>
            </div>

            {/* Projected stock bar */}
            {!isNegative && (
              <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${newPct}%`,
                    backgroundColor: isOutAfter
                      ? '#dc2626'
                      : isLowAfter
                      ? '#f59e0b'
                      : '#16a34a',
                  }}
                />
                {/* Min marker */}
                <div
                  className="absolute top-0 h-full w-px bg-slate-400 dark:bg-slate-500"
                  style={{ left: `${(product.reorderPoint / (product.reorderPoint * 2)) * 100}%` }}
                />
              </div>
            )}

            {/* Status badge */}
            {!isNegative && (
              <div className="flex justify-center">
                {isOutAfter ? (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    ⚠ Out of stock after adjustment
                  </span>
                ) : isLowAfter ? (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    ⚠ Below reorder point ({product.reorderPoint})
                  </span>
                ) : finalDelta === 0 ? (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
                    No change
                  </span>
                ) : (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    ✓ Healthy stock level
                  </span>
                )}
              </div>
            )}

            {/* Value impact (for non-correction or when delta ≠ 0) */}
            {finalDelta !== 0 && !isNegative && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    valueImpact >= 0
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-500'
                  }`}>
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Cost value impact</div>
                    <div className={`text-xs font-semibold tabular-nums ${
                      valueImpact >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {valueImpact >= 0 ? '+' : ''}{formatMoney(valueImpact)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    revenueImpact >= 0
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'
                  }`}>
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Revenue impact</div>
                    <div className={`text-xs font-semibold tabular-nums ${
                      revenueImpact >= 0 ? 'text-violet-600' : 'text-orange-500'
                    }`}>
                      {revenueImpact >= 0 ? '+' : ''}{formatMoney(revenueImpact)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Negative stock warning ────────────────────────────────── */}
          {isNegative && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-400">
                <strong>Stock cannot go below zero.</strong> Current stock is {product.stock}, you're trying to remove {Math.abs(inputQty)} units.
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !isValid || isNegative}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving…' : isCorrection ? 'Apply Correction' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  )
}
