import {  BarChart3, TrendingUp, TrendingDown, Star, AlertTriangle, Loader2 } from 'lucide-react'
import { useProfitLoss } from '../hooks/useProfitLoss'
import { TrendSparkline } from './TrendSparkline'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '../utils'

export function ProfitLossSection() {
  const {
    data,
    trendData,
    loading,
    trendLoading,
    error,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showTrend,
    toggleTrend,
    reload,
    derived
  } = useProfitLoss()

  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-2" />
        <p className="text-sm font-medium text-slate-500">{t('bakeryLoadingPnL')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6 bg-slate-50/50 dark:bg-slate-900/40 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
      {/* Date Filter Strip */}
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              {t('bakeryFromDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              {t('bakeryToDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={reload}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold transition-all shadow-xs"
          >
            {t('bakeryApplyFilter')}
          </button>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline font-semibold"
            >
              {t('bakeryClearFilter')}
            </button>
          )}
        </div>

        <button
          onClick={toggleTrend}
          disabled={trendLoading}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
        >
          {trendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
          <span>{showTrend ? 'Hide Trend Analysis' : t('bakeryPnLTrend')}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{t('bakeryRevenueCol')}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.totals.totalRevenue)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{t('bakeryCostCol')}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {formatCurrency(data.totals.totalProductionCost)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{t('bakeryGrossProfit')}</p>
          <p
            className={`text-xl sm:text-2xl font-extrabold ${
              data.totals.grossProfit >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(data.totals.grossProfit)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-1">{t('bakeryMargin')}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-200">
            {derived.overallMargin ? `${derived.overallMargin}%` : '—'}
          </p>
        </div>
      </div>

      {/* Best / Worst Performers */}
      {(derived.bestRecipe || derived.worstRecipe) && (
        <div className="flex flex-wrap gap-3">
          {derived.bestRecipe && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/60 rounded-xl px-3.5 py-2">
              <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {t('bakeryPnLBestRecipe')}: {derived.bestRecipe.recipeName} ({derived.bestRecipe.marginPercent.toFixed(1)}%)
              </span>
            </div>
          )}
          {derived.worstRecipe && derived.worstRecipe.recipeId !== derived.bestRecipe?.recipeId && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-300 dark:border-rose-800/60 rounded-xl px-3.5 py-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                {t('bakeryPnLWorstRecipe')}: {derived.worstRecipe.recipeName} ({derived.worstRecipe.marginPercent.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 text-left">{t('bakeryRecipeCol')}</th>
              <th className="px-3 py-3 text-right">{t('bakeryUnitsProducedCol')}</th>
              <th className="px-3 py-3 text-right">{t('bakeryUnitsSold')}</th>
              <th className="px-3 py-3 text-right">{t('bakeryCostCol')}</th>
              <th className="px-3 py-3 text-right">{t('bakeryWasteCostCol')}</th>
              <th className="px-3 py-3 text-right">{t('bakeryRevenueCol')}</th>
              <th className="px-3 py-3 text-right">{t('bakeryGrossProfit')}</th>
              <th className="px-4 py-3 text-right">{t('bakeryMargin')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.rows.map(row => {
              const profitable = row.grossProfit >= 0
              return (
                <tr key={row.recipeId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{row.recipeName}</td>
                  <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{row.unitsProduced.toFixed(0)}</td>
                  <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{row.unitsSold}</td>
                  <td className="px-3 py-3 text-right text-amber-600 dark:text-amber-400 font-semibold">
                    {formatCurrency(row.totalProductionCost)}
                  </td>
                  <td className="px-3 py-3 text-right text-rose-500 font-semibold">
                    {(row.wasteCost ?? 0) > 0 ? formatCurrency(row.wasteCost ?? 0) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                    {row.totalRevenue > 0 ? formatCurrency(row.totalRevenue) : '—'}
                  </td>
                  <td className={`px-3 py-3 text-right font-extrabold ${profitable ? 'text-sky-600' : 'text-rose-500'}`}>
                    {(profitable ? '+' : '') + formatCurrency(row.grossProfit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        profitable
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {profitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {row.marginPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Sparkline trends */}
      {showTrend && trendData && (
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            {t('bakeryPnLTrendTitle')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {trendData.series.map(series => (
              <TrendSparkline key={series.recipeId} series={series} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { ProfitLossSection as ProfitLossTab }