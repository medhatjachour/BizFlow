import { TrendingUp, Boxes, Tag, PackageX } from 'lucide-react'
import { ProfitAnalysis } from '../types'
import { formatCurrency, formatCompactNumber } from '../utils'

export function ProfitInventoryCard({ profit }: { profit: ProfitAnalysis }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Realized Profit */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> Realized Profit &amp; Margin
          </h3>
          <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            {profit.sales.realizationRate.toFixed(0)}% realized
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 p-3 text-center">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Expected Profit (List)</p>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200">{formatCurrency(profit.sales.expectedProfit)}</p>
            <p className="text-[10px] text-slate-400">{profit.sales.expectedMargin.toFixed(1)}% margin</p>
          </div>
          <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Actual Profit</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(profit.sales.actualProfit)}</p>
            <p className="text-[10px] text-emerald-500 font-semibold">{profit.sales.actualMargin.toFixed(1)}% margin</p>
          </div>
        </div>

        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, profit.sales.realizationRate))}%` }}
          />
        </div>

        <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-700/60 pt-1">
          <div className="flex justify-between pt-1"><span className="text-slate-500">Expected List Revenue</span><span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(profit.sales.expectedRevenue)}</span></div>
          <div className="flex justify-between pt-1"><span className="text-slate-500">Actual Invoiced Revenue</span><span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(profit.sales.actualRevenue)}</span></div>
          <div className="flex justify-between pt-1 text-amber-600 dark:text-amber-400"><span className="flex items-center gap-1"><Tag size={12} /> Discounts Granted</span><span className="font-bold">−{formatCurrency(profit.sales.discountsGiven)}</span></div>
          <div className="flex justify-between pt-1"><span className="text-slate-500">COGS (Acquisition Cost)</span><span className="font-semibold text-orange-500">{formatCurrency(profit.sales.cogs)}</span></div>
        </div>
      </div>

      {/* Inventory Potential */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Boxes size={16} className="text-sky-500" /> Warehouse Inventory Asset
          </h3>
          <span className="text-[11px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
            {profit.inventory.batchCount} batches
          </span>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/80 p-4 text-center">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Unrealized Potential Profit on Stock</p>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 my-0.5">{formatCurrency(profit.inventory.potentialProfit)}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-500 font-semibold">{profit.inventory.potentialMargin.toFixed(1)}% projected return</p>
        </div>

        <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-700/60 pt-1">
          <div className="flex justify-between pt-1"><span className="text-slate-500">Asset Cost Value</span><span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(profit.inventory.cost)}</span></div>
          <div className="flex justify-between pt-1"><span className="text-slate-500">Projected Retail Value</span><span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(profit.inventory.retail)}</span></div>
          <div className="flex justify-between pt-1"><span className="text-slate-500">Total Units in Storage</span><span className="font-semibold text-slate-700 dark:text-slate-300">{formatCompactNumber(profit.inventory.inStockUnits)}</span></div>
          {profit.inventory.expiredCost > 0.005 && (
            <div className="flex justify-between pt-1 text-rose-500 font-medium">
              <span className="flex items-center gap-1"><PackageX size={12} /> Locked in Expired Stock</span>
              <span className="font-bold">{formatCurrency(profit.inventory.expiredCost)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}