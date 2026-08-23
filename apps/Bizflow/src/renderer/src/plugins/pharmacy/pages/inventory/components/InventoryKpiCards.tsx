import React from 'react'
import {
  DollarSign,
  TrendingUp,
  PackageX,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { InventoryStats } from '../types'
import { money, int } from '../../components/_shared'

interface InventoryKpiCardsProps {
  summary: InventoryStats | null
}

export const InventoryKpiCards: React.FC<InventoryKpiCardsProps> = ({ summary }) => {
  if (!summary) return null

  const potentialMargin =
    summary.retailValue > 0
      ? Math.round(((summary.retailValue - summary.stockValue) / summary.retailValue) * 100)
      : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {/* Total Asset Cost */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <DollarSign size={14} className="text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Cost Value</span>
        </div>
        <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          ${money(summary.stockValue)}
        </p>
        <span className="text-[10px] text-slate-400">Total Purchase Cost</span>
      </div>

      {/* Retail Valuation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <TrendingUp size={14} className="text-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Retail Value</span>
        </div>
        <p className="text-base font-extrabold text-blue-600 dark:text-blue-400">
          ${money(summary.retailValue)}
        </p>
        <span className="text-[10px] text-emerald-600 font-semibold">+{potentialMargin}% Est. Margin</span>
      </div>

      {/* Expired Stock at Loss */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <PackageX size={14} className="text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Expired Loss</span>
        </div>
        <p className="text-base font-extrabold text-red-600 dark:text-red-400">
          {int(summary.expiredBatches)} <span className="text-xs font-normal">batches</span>
        </p>
        <span className="text-[10px] text-red-500 font-semibold">-${money(summary.expiredValue)} value</span>
      </div>

      {/* Expiring Soon Watch */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <Clock size={14} className="text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Expiring (30d)</span>
        </div>
        <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">
          {int(summary.expiringSoon)} <span className="text-xs font-normal">batches</span>
        </p>
        <span className="text-[10px] text-amber-600/90 font-medium">${money(summary.expiringValue)} at risk</span>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <AlertTriangle size={14} className="text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
        </div>
        <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          {int(summary.lowStock)} <span className="text-xs font-normal">SKUs</span>
        </p>
        <span className="text-[10px] text-amber-600 font-semibold">Below Min Threshold</span>
      </div>

      {/* Out of Stock */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
          <ShieldAlert size={14} className="text-rose-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
        </div>
        <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
          {int(summary.outOfStock)} <span className="text-xs font-normal">SKUs</span>
        </p>
        <span className="text-[10px] text-rose-500 font-semibold">Needs Purchase PO</span>
      </div>
    </div>
  )
}