import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import {
  X, Loader2, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Package, RefreshCw,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { Product, AdjustForm, AdjustType } from '../types'
import { hexToRgba, formatMoney, stockPercent, stockBarColor } from '../utils'

const INTEGER_UNITS = ['piece', 'box', 'cup', 'packet', 'bottle']

interface Props {
  product: Product | null
  form: AdjustForm
  patchForm: (p: Partial<AdjustForm>) => void
  onSubmit: (payload: { quantity: number; type: AdjustType; reason?: string }) => void
  onClose: () => void
  saving: boolean
}


const QUICK_DELTAS = [1, 5, 10, 25]

export function AdjustStockModal({ product, form, patchForm, onSubmit, onClose, saving }: Props) {
  const { t } = useLanguage()
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const [localReason, setLocalReason] = useState(form.reason)

  
// ── Reason presets per type ─────────────────────────────────────────────────
const REASON_PRESETS: Record<AdjustType, string[]> = {
  restock:    [t('cfSupplierDelivery') || 'Supplier delivery', t('cfWeeklyRestock') || 'Weekly restock', t('cfNewShipment') || 'New shipment', t('cfEmergencyRestock') || 'Emergency restock'],
  adjustment: [t('cfMonthlyCount') || 'Monthly count', t('cfCycleCount') || 'Cycle count', t('cfSystemCorrection') || 'System correction', t('cfFoundStock') || 'Found stock'],
  waste:      [t('cfSpillage') || 'Spillage', t('cfExpired') || 'Expired', t('cfDamaged') || 'Damaged', t('cfQualityIssue') || 'Quality issue'],
  write_off:  [t('cfLost') || 'Lost', t('cfStolen') || 'Stolen', t('cfBeyondRepair') || 'Beyond repair', t('cfDiscontinued') || 'Discontinued'],
}

  
 const ADJUST_TYPES: {
  value: AdjustType
  label: string
  icon: typeof Plus
  sign: '+' | '-' | '±'
  color: string
  description: string
}[] = [
  { value: 'restock',    label: t('cfRestock') || 'Restock',    icon: Plus,          sign: '+', color: '#16a34a', description: t('cfAddNewUnitsToStock') || 'Add new units to stock' },
  { value: 'adjustment', label: t('cfCorrection') || 'Correction', icon: RefreshCw,     sign: '±', color: '#007cba', description: t('cfManualStockCorrection') || 'Manual stock correction' },
  { value: 'waste',      label: t('cfWaste') || 'Waste',      icon: Trash2,        sign: '-', color: '#f78344', description: t('cfSpoilageDamagedGoods') || 'Spoilage / damaged goods' },
  { value: 'write_off',  label: t('cfWriteOff') || 'Write-off',  icon: XCircle,       sign: '-', color: '#fc0303', description: t('cfRemoveFromInventory') || 'Remove from inventory' },
]
 function adjustMeta(value: string) {
  return ADJUST_TYPES.find(a => a.value === value) ?? ADJUST_TYPES[0]
}

  useEffect(() => {
    setLocalReason(form.reason)
  }, [form.reason])

  if (!product) return null

  const meta = adjustMeta(form.type)

  const isCorrection = form.type === 'adjustment'
  const isSubtract = meta.sign === '-'
  const isIntegerUnit = INTEGER_UNITS.includes(product.unit || 'piece')

  // ── Compute final values ──────────────────────────────────────────────────
  // Use parseFloat to allow fractional quantities (e.g. 1.5 kg)
  const inputQty = isIntegerUnit ? parseInt(form.quantity, 10) || 0 : parseFloat(form.quantity) || 0

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
  const isOutAfter = newStock === 0
  const isLowAfter = newStock > 0 && newStock < product.reorderPoint
  const stockPerc = newStock > 0 ? (newStock / (product.reorderPoint * 2)) * 100 : 0

  // ── Value impacts ─────────────────────────────────────────────────────────
  const valueImpact = finalDelta * product.cost
  const revenueImpact = finalDelta * product.price

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
      const current = isIntegerUnit ? parseInt(form.quantity, 10) || 0 : parseFloat(form.quantity) || 0
      patchForm({ quantity: String(current + delta) })
    }
  }

  const setExact = (val: number) => {
    patchForm({ quantity: String(val) })
  }

  const handleQtyChange = (val: string) => {
    // Prevent typing decimal point for integer units
    if (isIntegerUnit && val.includes('.')) return
    patchForm({ quantity: val })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
        {/* ── Header with product info ──────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('cfAdjustStock') || 'Adjust Stock'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {product.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="p-5 space-y-5">

          {/* ── Current stock card ─────────────────────────────────────── */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('cfCurrentStock') || 'Current Stock'}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {product.stock}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {product.unit || t('cfUnits') || 'units'}
              </span>
            </div>
          </div>

          {/* Current stock bar */}
          <div className="space-y-1">
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all" 
                style={{ width: `${stockPercent(product)}%`, backgroundColor: stockBarColor(product) }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>0</span>
              <span>{t('cfMin') || 'Min'}: {product.reorderPoint}</span>
              <span>{product.reorderPoint * 2}+</span>
            </div>
          </div>

          {/* ── Adjustment type — visual grid ──────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('cfAdjustmentType') || 'Adjustment Type'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ADJUST_TYPES.map((a) => {
                const TypeIcon = a.icon
                const selected = form.type === a.value
                return (
                  <button
                    key={a.value}
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
                    <TypeIcon size={18} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{a.label}</span>
                      <span className="text-[10px] opacity-80">{a.description}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Mode indicator ─────────────────────────────────────────── */}
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg">
            {isCorrection ? (
              <span>{t('cfCorrectionMode') || 'Enter the exact counted stock — the system will calculate the difference automatically.'}: </span>
            ) : isSubtract ? (
              <span>{t('cfRemoveMode') || ' Enter how many units to subtract from current stock.'}:</span>
            ) : (
              <span>{t('cfAddMode') || 'Enter how many units to add to current stock'}: .</span>
            )}
          </div>

          {/* ── Quantity input ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {isCorrection ? t('cfCountedStockLevel') || 'Counted Stock Level' : t('cfQuantity') || 'Quantity'}
            </label>

            {/* Main input with prefix */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                {isCorrection ? '=' : meta.sign}
              </span>
              <input
                ref={qtyInputRef}
                type="number"
                step={isIntegerUnit ? '1' : 'any'}
                value={form.quantity}
                onChange={(e) => handleQtyChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
                autoFocus
                className="w-full pl-8 pr-3 py-2.5 text-lg font-semibold text-center border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none tabular-nums transition-colors"
              />
            </div>

                {/* Quick adjust buttons */}
            <div className="flex items-center justify-between w-full mt-1">
              {isCorrection ? (
                <>
                  {/* Left: Presets */}
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => setExact(product.stock)} 
                      className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                     {t('cfSameAsNow') || 'Same as now'}
                    </button>
                    <button 
                      onClick={() => setExact(product.reorderPoint)} 
                      className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 transition-colors"
                    >
                      {t('cfMin') || 'Min'}
                    </button>
                    <button 
                      onClick={() => setExact(product.reorderPoint * 2)} 
                      className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors"
                    >
                      {t('cfHealthy') || 'Healthy'}
                    </button>
                  </div>

                  {/* Right: Zero */}
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => setExact(0)} 
                      className="px-2 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                    >
                      {t('cfZero') || 'Zero'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Left: Add */}
                  <div className="flex gap-1.5">
                    {QUICK_DELTAS.map(d => (
                      <button 
                        key={`add-${d}`}
                        onClick={() => quickAdjust(d)} 
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 transition-colors tabular-nums"
                      >
                        +{d}
                      </button>
                    ))}
                  </div>

                  {/* Right: Subtract */}
                  <div className="flex gap-1.5">
                    {QUICK_DELTAS.slice().reverse().map(d => (
                      <button 
                        key={`sub-${d}`}
                        onClick={() => quickAdjust(-d)} 
                        className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors tabular-nums"
                      >
                        −{d}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>

          {/* ── Reason with presets ────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('cfReasonOptional') || 'Reason (optional)'}
            </label>
            <input
              type="text"
              value={localReason}
              onChange={(e) => setLocalReason(e.target.value)}
              placeholder={t('cfTypeReason') || 'Type a reason or pick one below...'}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
            />
            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REASON_PRESETS[form.type].map(preset => (
                <button
                  key={preset}
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
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 space-y-3">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('cfResultPreview') || 'Result Preview'}
              </span>
              {finalDelta !== 0 && !isNegative && (
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                  finalDelta > 0
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {finalDelta > 0 ? '+' : ''}{finalDelta}
                </span>
              )}
            </div>

            {/* Before → After visual */}
            <div className="flex items-center justify-between gap-4">
              {/* Before */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 mb-1 uppercase">{t('cfBefore') || 'Before'}</span>
                <span className="text-lg font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                  {product.stock}
                </span>
              </div>

              {/* Arrow + delta */}
              <div className="flex flex-col items-center text-slate-400">
                {finalDelta > 0 ? (
                  <TrendingUp size={20} className="text-green-500" />
                ) : finalDelta < 0 ? (
                  <TrendingDown size={20} className="text-red-500" />
                ) : (
                  <RefreshCw size={20} />
                )}
                <span className={`text-xs font-medium mt-1 ${
                  finalDelta > 0 ? 'text-green-600' : finalDelta < 0 ? 'text-red-500' : 'text-slate-400'
                }`}>
                  {finalDelta > 0 ? '+' : ''}{finalDelta}
                </span>
              </div>

              {/* After */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 mb-1 uppercase">{t('cfAfter') || 'After'}</span>
                <span className={`text-lg font-bold tabular-nums ${
                  isNegative ? 'text-red-500' : 'text-slate-900 dark:text-white'
                }`}>
                  {isNegative ? '!' : newStock}
                </span>
              </div>
            </div>

            {/* Projected stock bar */}
            {!isNegative && (
              <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all" 
                  style={{ width: `${stockPerc}%`, backgroundColor: stockBarColor({ ...product, stock: newStock }) }}
                />
                {/* Min marker */}
                <div className="absolute top-0 bottom-0 w-px bg-amber-500/50" style={{ left: '50%' }} />
              </div>
            )}

            {/* Status badge */}
            {!isNegative && (
              <div className="text-center text-xs font-medium pt-1">
                {isOutAfter ? (
                  <span className="text-red-500 flex items-center justify-center gap-1">
                    <AlertTriangle size={12} /> {t('cfOutOfStockAfterAdjustment') || 'Out of stock after adjustment'}
                  </span>
                ) : isLowAfter ? (
                  <span className="text-amber-500 flex items-center justify-center gap-1">
                    <AlertTriangle size={12} /> {t('cfBelowReorderPoint', { point: product.reorderPoint }) || `Below reorder point (${product.reorderPoint})`}
                  </span>
                ) : finalDelta === 0 ? (
                  <span className="text-slate-400 flex items-center justify-center gap-1">
                    <RefreshCw size={12} /> {t('cfNoChange') || 'No change'}
                  </span>
                ) : (
                  <span className="text-green-500 flex items-center justify-center gap-1">
                    <TrendingUp size={12} /> {t('cfHealthyStockLevel') || 'Healthy stock level'}
                  </span>
                )}
              </div>
            )}

            {/* Value impact (for non-correction or when delta ≠ 0) */}
            {finalDelta !== 0 && !isNegative && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className={`flex items-center gap-2 p-2 rounded-lg ${
                  valueImpact >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-500'
                }`}>
                  <DollarSign size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] opacity-80">{t('cfCostValueImpact') || 'Cost value impact'}</span>
                    <span className={`text-sm font-bold ${valueImpact >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {valueImpact >= 0 ? '+' : ''}{formatMoney(valueImpact)}
                    </span>
                  </div>
                </div>
                
                <div className={`flex items-center gap-2 p-2 rounded-lg ${
                  revenueImpact >= 0 ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'
                }`}>
                  <TrendingUp size={16} />
                  <div className="flex flex-col">
                    <span className="text-[10px] opacity-80">{t('cfRevenueImpact') || 'Revenue impact'}</span>
                    <span className={`text-sm font-bold ${revenueImpact >= 0 ? 'text-violet-600' : 'text-orange-500'}`}>
                      {revenueImpact >= 0 ? '+' : ''}{formatMoney(revenueImpact)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Negative stock warning ────────────────────────────────── */}
          {isNegative && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>
                {t('cfStockCannotGoBelowZero', { current: product.stock, trying: Math.abs(inputQty) }) ||
                `Stock cannot go below zero. Current stock is ${product.stock}, you're trying to remove ${Math.abs(inputQty)} units.`}
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
           {t('cfCancel') || 'Cancel'}
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={!isValid || isNegative || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? t('cfSaving') || 'Saving…' : isCorrection ? t('cfApplyCorrection') || 'Apply Correction' : t('cfApplyAdjustment') || 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  )
}
