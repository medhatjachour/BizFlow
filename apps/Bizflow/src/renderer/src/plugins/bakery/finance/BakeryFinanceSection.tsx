/**
 * BakeryFinanceSection
 *
 * Finance section for the Bakery plugin.
 * Tabs: P&L Overview · Waste Cost Analysis · Recipe Costs
 * APIs: bakery.getProfitLoss, bakery.getProfitLossTrend, bakery.getWasteSummary, bakery.getRecipes
 */

import { useState, useEffect } from 'react'
import {
  Croissant,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Trash2,
  BookOpen,
  RefreshCcw,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Receipt
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'
import { StatCard, TabButton, CustomTooltip } from './BakeryFinanceComponents'
type TabType = 'overview' | 'waste' | 'recipes'
// Custom Tooltip Component


const BakeryFinanceSection: React.FC = () => {
  const { t } = useLanguage()
  useToast()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState(30) // days

  const [plData, setPlData] = useState<any>(null)
  const [plTrend, setPlTrend] = useState<any>(null) // { weeks, series } from getProfitLossTrend
  const [wasteSummary, setWasteSummary] = useState<any>(null)
  const [Bexpenses, setBexpenses] = useState<any>(null)
  const [recipes, setRecipes] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const api = (window as any).api.bakery
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const start = new Date()
      start.setDate(start.getDate() - dateRange)
      start.setHours(0, 0, 0, 0)

      const [r1, r2, r3, r4, r5] = await Promise.allSettled([
        api.getProfitLoss?.({ startDate: start.toISOString(), endDate: end.toISOString() }),
        api.getProfitLossTrend?.({ days: dateRange }),
        api.getWasteSummary?.({ startDate: start.toISOString(), endDate: end.toISOString() }),
        api.getRecipes?.(),
        api.expenses.getSummary?.({ startDate: start.toISOString(), endDate: end.toISOString() })
      ])

      if (r1.status === 'fulfilled') setPlData(r1.value)
      if (r2.status === 'fulfilled') setPlTrend(r2.value || null)
      if (r3.status === 'fulfilled') setWasteSummary(r3.value)
      if (r4.status === 'fulfilled') setRecipes(Array.isArray(r4.value) ? r4.value : [])
      if (r5.status === 'fulfilled') setBexpenses(r5.value)
    } catch (err) {
      logger.error('BakeryFinance: loadData failed', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
console.log(recipes, 'recipes')
  // getProfitLoss returns { rows, totals: { totalRevenue, totalProductionCost, wasteCost, grossProfit } }
  const revenue = Number(
    plData?.totals?.totalRevenue || plData?.totalRevenue || plData?.revenue || 0
  )
  const cost = Number(plData?.totals?.totalProductionCost || plData?.totalCost || plData?.cost || 0)
  const profit = Number(
    plData?.totals?.grossProfit || plData?.netProfit || plData?.profit || revenue - cost
  )
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0
  const wasteCost = Number(wasteSummary?.totalCost || wasteSummary?.cost || 0)
  const expenses = Number(Bexpenses?.totalAmount || Bexpenses?.totalAmount || 0)
  // getWasteSummary returns totalQuantity (not totalQty)
  const wasteQty = Number(
    wasteSummary?.totalQuantity || wasteSummary?.totalQty || wasteSummary?.qty || 0
  )
  // byWasteType entries: { wasteType, _sum: { cost, quantity }, _count }
  const wasteChartData = (wasteSummary?.byWasteType || []).map((w: any) => ({
    name: w.wasteType || 'Other',
    cost: Number(w._sum?.cost || 0)
  }))

  // getProfitLossTrend returns { weeks: string[], series: [{ recipeId, recipeName, data: [{ week, cost, revenue, profit }] }] }
  const trendChartData = (() => {
    if (!plTrend?.weeks) return []
    return plTrend.weeks.map((week: string) => {
      const totals = (plTrend.series || []).reduce(
        (acc: any, s: any) => {
          const wData = (s.data || []).find((d: any) => d.week === week)
          return {
            revenue: acc.revenue + (wData?.revenue || 0),
            cost: acc.cost + (wData?.cost || 0),
            profit: acc.profit + (wData?.profit || 0)
          }
        },
        { revenue: 0, cost: 0, profit: 0 }
      )
      return { date: week, ...totals }
    })
  })()

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-1">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Croissant size={22} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('bakeryFinanceTitle')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('bakeryFinanceSubtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm"
          >
            <option value={7}>{t('bakeryFinanceLast7')}</option>
            <option value={30}>{t('bakeryFinanceLast30')}</option>
            <option value={90}>{t('bakeryFinanceLast90')}</option>
            <option value={36500000000}>{t('bakeryFinanceAllTheTime')}</option>
          </select>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-lg hover:bg-[color:var(--accent-strong)] text-sm font-medium disabled:opacity-50"
          >
            <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
            {t('bakeryFinanceRefresh')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<BarChart3 size={16} />}
            label={t('bakeryFinancePnL')}
          />
          <TabButton
            active={activeTab === 'waste'}
            onClick={() => setActiveTab('waste')}
            icon={<Trash2 size={16} />}
            label={t('bakeryFinanceWasteTab')}
          />
          <TabButton
            active={activeTab === 'recipes'}
            onClick={() => setActiveTab('recipes')}
            icon={<BookOpen size={16} />}
            label={t('bakeryFinanceRecipesTab')}
          />
        </div>
      </div>

      {/* P&L Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <StatCard
                icon={DollarSign}
                label={t('bakeryFinanceRevenue')}
                value={`$${revenue.toFixed(2)}`}
                sub={`${dateRange}-day period`}
                color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              />
              <StatCard
                icon={TrendingDown}
                label={t('bakeryFinanceTotalCost')}
                value={`$${cost.toFixed(2)}`}
                sub={t('bakeryFinanceCostSub')}
                color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              />
              <StatCard
                icon={TrendingUp}
                label={t('bakeryFinanceNetProfit')}
                value={`$${profit.toFixed(2)}`}
                sub={profit >= 0 ? t('bakeryFinanceProfitable') : t('bakeryFinanceLossPeriod')}
                trend={profit >= 0 ? 'up' : 'down'}
                color={
                  profit >= 0
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }
              />
              <StatCard
                icon={BarChart3}
                label={t('bakeryFinanceProfitMargin')}
                value={`${margin.toFixed(1)}%`}
                sub={margin >= 20 ? t('bakeryFinanceHealthyMargin') : t('bakeryFinanceBelowTarget')}
                color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              />
              <StatCard
                icon={Receipt}
                label={t('bakeryFinanceExpenses')}
                value={`$${expenses.toFixed(2)}`}
                sub={expenses >= 0 ? t('') : t('')}
                color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              />
              <StatCard
                icon={BarChart3}
                label={t('bakeryFinanceTotalWasteCost')}
                value={`$${wasteCost.toFixed(2)}`}
                sub={margin >= 20 ? t('') : t('')}
                color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              />
            </div>
          )}
          {!loading && trendChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                {t('bakeryFinanceTrendTitle')}
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number | undefined, n: string | undefined) => [
                      `$${(v ?? 0).toFixed(2)}`,
                      n ? n.charAt(0).toUpperCase() + n.slice(1) : ''
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={false}
                    name="revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 4"
                    name="cost"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="profit"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                {[
                  { color: '#d97706', label: t('bakeryFinanceRevenue') },
                  { color: '#ef4444', label: t('bakeryFinanceTotalCost') },
                  { color: '#22c55e', label: t('bakeryFinanceProfit') }
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} />
                    <span className="text-xs text-slate-500">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!loading && trendChartData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <BarChart3 size={40} className="opacity-30 mb-2" />
              <p className="text-sm">{t('bakeryFinanceTrendEmpty')}</p>
            </div>
          )}
        </div>
      )}

      {/* Waste Cost Analysis */}
      {activeTab === 'waste' && (
        <div className="space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  icon={Trash2}
                  label={t('bakeryFinanceTotalWasteCost')}
                  value={`$${wasteCost.toFixed(2)}`}
                  sub={t('bakeryFinanceWasteSpoiled')}
                  color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                />
                <StatCard
                  icon={AlertTriangle}
                  label={t('bakeryFinanceWasteQtyLabel')}
                  value={wasteQty}
                  sub={t('bakeryFinanceWasteUnits')}
                  color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                />
                <StatCard
                  icon={TrendingDown}
                  label={t('bakeryFinanceWastePct')}
                  value={revenue > 0 ? `${((wasteCost / revenue) * 100).toFixed(1)}%` : '0%'}
                  sub={
                    wasteCost / revenue < 0.05
                      ? t('bakeryFinanceWasteUnder')
                      : t('bakeryFinanceWasteOver')
                  }
                  color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                />
              </div>
              {wasteChartData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                    {t('bakeryFinanceWasteByType')}
                  </h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={wasteChartData}
                      margin={{ top: 0, right: 4, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.15)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `$${v}`}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip content={<CustomTooltip active={false} payload={[]} label="" />} />
                      <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {(!wasteSummary || wasteCost === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle size={40} className="opacity-30 mb-2 text-green-500" />
                  <p className="text-sm">{t('bakeryFinanceNoWaste')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Recipe Statistics */}
      {activeTab === 'recipes' && (() => {
        const rows: any[] = plData?.rows || []
        // Merge plData rows (real financial data) with recipe metadata
        const recipeMap = new Map(recipes.map((r: any) => [r.id, r]))
        const displayRows = rows.length > 0
          ? rows
          : recipes.map((r: any) => ({ recipeId: r.id, recipeName: r.name, totalRevenue: 0, totalProductionCost: 0, wasteCost: 0, grossProfit: 0, marginPercent: 0, unitsSold: 0, unitsProduced: 0 }))

        const topRevenue = Math.max(...displayRows.map((r: any) => r.totalRevenue || 0), 1)

        return (
          <div className="space-y-5">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                ))}
              </div>
            ) : displayRows.length > 0 ? (
              <>
                {/* Summary bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard icon={DollarSign} label={t('bakeryFinanceTotalRevenue')} value={`$${displayRows.reduce((s: number, r: any) => s + (r.totalRevenue || 0), 0).toFixed(2)}`} sub={t('bakeryFinanceAllRecipes')} color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
                  <StatCard icon={Receipt} label={t('bakeryFinanceProdCost')} value={`$${displayRows.reduce((s: number, r: any) => s + (r.totalProductionCost || 0), 0).toFixed(2)}`} sub={t('bakeryFinanceAllRecipes')} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
                  <StatCard icon={Trash2} label={t('bakeryFinanceTotalWasteCost')} value={`$${displayRows.reduce((s: number, r: any) => s + (r.wasteCost || 0), 0).toFixed(2)}`} sub={t('bakeryFinanceWasteSpoiled')} color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
                  <StatCard icon={TrendingUp} label={t('bakeryFinanceGrossProfit')} value={`$${displayRows.reduce((s: number, r: any) => s + (r.grossProfit || 0), 0).toFixed(2)}`} sub={t('bakeryFinanceAllRecipes')} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Per-recipe cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayRows.map((row: any) => {
                    const meta = recipeMap.get(row.recipeId)
                    const margin = row.marginPercent ?? 0
                    const isProfit = (row.grossProfit ?? 0) >= 0
                    const revenueShare = topRevenue > 0 ? ((row.totalRevenue || 0) / topRevenue) * 100 : 0
                    return (
                      <div
                        key={row.recipeId}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{row.recipeName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {meta?.category || t('bakeryFinanceUncategorized')} ·{' '}
                              {row.unitsSold ?? 0} {t('bakeryFinanceSold')} · {row.unitsProduced ?? 0} {t('bakeryFinanceProduced')}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${margin >= 60 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : margin >= 35 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : margin > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>

                        {/* Revenue progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>{t('bakeryFinanceRevenue')}</span>
                            <span>${(row.totalRevenue || 0).toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${revenueShare}%` }} />
                          </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('bakeryFinanceProdCost')}</p>
                            <p className="text-sm font-bold text-amber-600">${(row.totalProductionCost || 0).toFixed(2)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('bakeryFinanceWaste')}</p>
                            <p className="text-sm font-bold text-red-500">${(row.wasteCost || 0).toFixed(2)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('bakeryFinanceRevenue')}</p>
                            <p className="text-sm font-bold text-green-600">${(row.totalRevenue || 0).toFixed(2)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('bakeryFinanceProfit')}</p>
                            <p className={`text-sm font-bold ${isProfit ? 'text-blue-600' : 'text-red-600'}`}>
                              {isProfit ? '+' : ''}${(row.grossProfit || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <BookOpen size={40} className="opacity-30 mb-2" />
                <p className="text-sm">{t('bakeryFinanceNoRecipes')}</p>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default BakeryFinanceSection
