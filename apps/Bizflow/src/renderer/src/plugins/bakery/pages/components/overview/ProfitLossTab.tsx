import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, DollarSign, BarChart3, Star } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

type PLRow = {
  recipeId: string
  recipeName: string
  costPerBatch: number
  totalProductionCost: number
  unitsProduced: number
  totalRevenue: number
  unitsSold: number
  grossProfit: number
  marginPercent: number
  wasteCost?: number
}

type PLData = {
  rows: PLRow[]
  totals: {
    totalProductionCost: number
    totalRevenue: number
    grossProfit: number
    wasteCost?: number
  }
}

type TrendPoint = { week: string; cost: number; revenue: number; profit: number }
type TrendSeries = { recipeId: string; recipeName: string; data: TrendPoint[] }

export default function ProfitLossTab() {
  const [data, setData]           = useState<PLData | null>(null)
  const [trendData, setTrendData] = useState<{ weeks: string[]; series: TrendSeries[] } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [trendLoading, setTrendLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [showTrend, setShowTrend] = useState(false)
  const { t } = useLanguage()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.bakery.getProfitLoss({
        startDate: startDate || undefined,
        endDate: endDate || undefined
      })
      setData(result)
    } catch (e: any) {
      setError(e.message ?? t('bakeryPnLLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const loadTrend = async () => {
    if (trendData) { setShowTrend(v => !v); return }
    setTrendLoading(true)
    try {
      const result = await window.api.bakery.getProfitLossTrend({ weeks: 8 })
      setTrendData(result)
      setShowTrend(true)
    } catch {
      // silent
    } finally {
      setTrendLoading(false)
    }
  }

  const overallMargin =
    data && data.totals.totalRevenue > 0
      ? ((data.totals.grossProfit / data.totals.totalRevenue) * 100).toFixed(1)
      : null

  const bestRecipe = data?.rows.reduce<PLRow | null>((best, row) => {
    if (!best || row.marginPercent > (best.marginPercent ?? -Infinity)) return row
    return best
  }, null)
  const worstRecipe = data?.rows.reduce<PLRow | null>((worst, row) => {
    if (!worst || row.marginPercent < (worst.marginPercent ?? Infinity)) return row
    return worst
  }, null)

  const Stat = ({
    label, value, color, icon: Icon
  }: { label: string; value: string; color: string; icon: typeof DollarSign }) => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('bakeryFromDate')}</label>
          <input
            type="date" value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('bakeryToDate')}</label>
          <input
            type="date" value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
          />
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-medium transition-colors"
        >
          {t('bakeryApplyFilter')}
        </button>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate('') }}
            className="text-sm text-slate-400 hover:text-slate-600 underline"
          >
            {t('bakeryClearFilter')}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t('bakeryLoadingPnL')}
        </div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat
              label={t('bakeryRevenueCol')}
              value={`$${data.totals.totalRevenue.toFixed(2)}`}
              color="text-green-600"
              icon={DollarSign}
            />
            <Stat
              label={t('bakeryCostCol')}
              value={`$${data.totals.totalProductionCost.toFixed(2)}`}
              color="text-amber-600"
              icon={BarChart3}
            />
            <Stat
              label={t('bakeryGrossProfit')}
              value={`$${data.totals.grossProfit.toFixed(2)}`}
              color={data.totals.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}
              icon={data.totals.grossProfit >= 0 ? TrendingUp : TrendingDown}
            />
            <Stat
              label={t('bakeryMargin')}
              value={overallMargin != null ? `${overallMargin}%` : '—'}
              color={
                overallMargin == null ? 'text-slate-400'
                  : parseFloat(overallMargin) >= 0 ? 'text-blue-600' : 'text-red-600'
              }
              icon={BarChart3}
            />
          </div>

          {/* Best / Worst recipe chips */}
          {(bestRecipe || worstRecipe) && (
            <div className="flex flex-wrap gap-3">
              {bestRecipe && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5">
                  <Star className="h-4 w-4 text-green-500 fill-green-500" />
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                    {t('bakeryPnLBestRecipe')}: {bestRecipe.recipeName} ({bestRecipe.marginPercent.toFixed(1)}%)
                  </span>
                </div>
              )}
              {worstRecipe && worstRecipe.recipeId !== bestRecipe?.recipeId && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                    {t('bakeryPnLWorstRecipe')}: {worstRecipe.recipeName} ({worstRecipe.marginPercent.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Per-recipe table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('bakeryRecipeCol')} Breakdown
              </h3>
              <button
                onClick={loadTrend}
                disabled={trendLoading}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                {trendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
                {showTrend ? 'Hide' : t('bakeryPnLTrend')}
              </button>
            </div>

            {data.rows.length === 0 ? (
              <p className="text-sm text-slate-400">{t('bakeryNoPnLData')}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">{t('bakeryRecipeCol')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryUnitsProducedCol')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryUnitsSold')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryCostCol')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryPnLCostPerUnit')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryWasteCostCol')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryRevenueCol')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryPnLPricePerUnit')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryGrossProfit')}</th>
                      <th className="px-4 py-3 text-right">{t('bakeryMargin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {data.rows.map(row => {
                      const profitable = row.grossProfit >= 0
                      const cpUnit = row.unitsProduced > 0 ? row.totalProductionCost / row.unitsProduced : null
                      const rpUnit = row.unitsSold > 0 ? row.totalRevenue / row.unitsSold : null
                      return (
                        <tr key={row.recipeId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">
                            {row.recipeName}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                            {row.unitsProduced.toFixed(0)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                            {row.unitsSold}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                            ${row.totalProductionCost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 text-xs">
                            {cpUnit != null ? `$${cpUnit.toFixed(3)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-500">
                            {(row.wasteCost ?? 0) > 0 ? `$${(row.wasteCost ?? 0).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600">
                            {row.totalRevenue > 0 ? `$${row.totalRevenue.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 text-xs">
                            {rpUnit != null ? `$${rpUnit.toFixed(3)}` : '—'}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${profitable ? 'text-blue-600' : 'text-red-500'}`}>
                            {(profitable ? '+' : '') + `$${row.grossProfit.toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              profitable
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {profitable
                                ? <TrendingUp className="h-3 w-3" />
                                : <TrendingDown className="h-3 w-3" />
                              }
                              {row.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-700/50 font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200" colSpan={3}>{t('bakeryTotals')}</td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">
                        ${data.totals.totalProductionCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right text-rose-500">
                        {(data.totals.wasteCost ?? 0) > 0 ? `$${(data.totals.wasteCost ?? 0).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        ${data.totals.totalRevenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3" />
                      <td className={`px-4 py-3 text-right ${data.totals.grossProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {(data.totals.grossProfit >= 0 ? '+' : '') + `$${data.totals.grossProfit.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {overallMargin != null
                          ? <span className={`text-xs font-medium ${parseFloat(overallMargin) >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                              {overallMargin}%
                            </span>
                          : '—'
                        }
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Trend sparklines */}
          {showTrend && trendData && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                {t('bakeryPnLTrendTitle')}
              </h3>
              {trendData.series.length === 0 ? (
                <p className="text-sm text-slate-400">{t('bakeryPnLNoTrend')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendData.series.map(series => (
                    <TrendSparkline key={series.recipeId} series={series} />
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">
            * Revenue is calculated from sales of the linked product. Recipes without a linked product show only production costs.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Sparkline sub-component ──────────────────────────────────────────────────

function TrendSparkline({ series }: { series: TrendSeries }) {
  const profits = series.data.map(d => d.profit)
  const min = Math.min(...profits, 0)
  const max = Math.max(...profits, 1)
  const range = max - min || 1
  const w = 120
  const h = 40
  const pts = profits.map((p, i) => {
    const x = (i / Math.max(profits.length - 1, 1)) * w
    const y = h - ((p - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  const lastProfit = profits[profits.length - 1] ?? 0
  const isUp = lastProfit >= 0

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{series.recipeName}</p>
        <span className={`text-xs font-bold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
          {isUp ? '+' : ''}${lastProfit.toFixed(0)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 40 }}>
        {/* Zero line */}
        {min < 0 && (
          <line
            x1={0} y1={h - ((0 - min) / range) * h}
            x2={w} y2={h - ((0 - min) / range) * h}
            stroke="#e2e8f0" strokeDasharray="2 2" strokeWidth={0.5}
          />
        )}
        <polyline
          points={pts}
          fill="none"
          stroke={isUp ? '#16a34a' : '#ef4444'}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Last point dot */}
        {profits.length > 0 && (() => {
          const lastIdx = profits.length - 1
          const lx = (lastIdx / Math.max(profits.length - 1, 1)) * w
          const ly = h - ((profits[lastIdx] - min) / range) * h
          return <circle cx={lx} cy={ly} r={2} fill={isUp ? '#16a34a' : '#ef4444'} />
        })()}
      </svg>
      <p className="text-[10px] text-slate-400 mt-1 text-right">{series.data.length} weeks</p>
    </div>
  )
}
