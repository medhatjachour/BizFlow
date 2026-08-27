import React from 'react'
import { Plus, Check, AlertCircle, Clock } from 'lucide-react'
import { remainingDisplay, daysUntil, getFefoBatch } from '../utils'
import type { MedicineLite } from '../types'

interface Props {
  medicine: MedicineLite
  isInCart: boolean
  onClick: () => void
}

export const MedicineCard: React.FC<Props> = ({ medicine, isInCart, onClick }) => {
  const fefoBatch = getFefoBatch(medicine.batches)
  const isOutOfStock = medicine.totalStock <= 0 || !fefoBatch
  const price = fefoBatch?.sellingPrice ?? fefoBatch?.costPerUnit ?? 0
  const days = fefoBatch ? daysUntil(fefoBatch.expiryDate) : null
  const isExpiringSoon = days !== null && days >= 0 && days <= 30

  const stock = remainingDisplay(
    medicine.totalStock,
    medicine.unit,
    medicine.subUnit,
    medicine.subUnitsPerContainer
  )

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={onClick}
      className={`group relative w-full text-left p-3 rounded-2xl border transition-all duration-100 flex flex-col justify-between select-none h-[82px] ${
        isOutOfStock
          ? 'bg-slate-100/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/40 opacity-45 cursor-not-allowed'
          : isInCart
          ? 'bg-violet-50/90 dark:bg-violet-950/30 border-violet-500 dark:border-violet-500/80 shadow-xs ring-1 ring-violet-500/20'
          : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/70 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-xs active:scale-[0.98]'
      }`}
    >
      {/* ── Top Row: Medicine Name + Category / Status Pill ─────────────── */}
      <div className="flex items-start justify-between gap-1.5 w-full">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug">
            {medicine.name}
          </h4>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">
            {medicine.category || 'General'}
          </p>
        </div>

        {/* Status Indicator Icon */}
        <div className="shrink-0 flex items-center gap-1">
          {isInCart ? (
            <span className="w-5 h-5 rounded-lg bg-violet-600 text-white flex items-center justify-center text-[10px] shadow-xs">
              <Check size={11} className="stroke-[3]" />
            </span>
          ) : isOutOfStock ? (
            <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              Out
            </span>
          ) : isExpiringSoon ? (
            <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Clock size={9} /> {days}d
            </span>
          ) : (
            <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700/60 group-hover:bg-violet-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
              <Plus size={12} className="stroke-[2.5]" />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Live Stock + Price ───────────────────────────── */}
      <div className="flex items-baseline justify-between gap-2 w-full pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isOutOfStock
                ? 'bg-slate-300 dark:bg-slate-600'
                : medicine.isLowStock
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-300 truncate">
            {stock.value}
            <span className="text-[10px] font-normal text-slate-400 ml-0.5">{stock.unit}</span>
          </span>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-xs font-black tabular-nums text-violet-600 dark:text-violet-400">
            {price > 0 ? `$${price.toFixed(2)}` : '—'}
          </span>
        </div>
      </div>
    </button>
  )
}