/**
 * BakeryDashboardSection — comprehensive production & ingredient analytics.
 *
 * Concurrent IPC (Promise.allSettled) + Web Worker for trend / efficiency / cost:
 *   COMPUTE_TRENDS     → 7-day batch production sparkline
 *   COMPUTE_EFFICIENCY  → planned-vs-actual yield per batch
 *   COMPUTE_INGREDIENT_COST → cost per batch & total ingredient spend
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Croissant, ClipboardList, Package, AlertTriangle, TrendingUp, TrendingDown,
  Flame, Wheat, Scale, ChefHat, BarChart3, Clock, Minus,
} from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, Tooltip, XAxis } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { TrendsResult, EfficiencyResult, IngredientCostResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }

interface BakeryData {
  todayBatches: any[]
  weekBatches: any[]
  recipes: number
  lowIngredients: any[]
  wasteLogs: any[]
  schedule: any[]
}

const EMPTY: BakeryData = {
  todayBatches: [], weekBatches: [], recipes: 0,
  lowIngredients: [], wasteLogs: [], schedule: [],
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; color: string; trend?: 'up' | 'down' | 'flat'
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-1.5 rounded-lg ${color}`}><Icon size={15} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    <div className="flex items-center gap-1 mt-1">
      {trend === 'up'   && <TrendingUp   size={12} className="text-emerald-500" />}
      {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
      {trend === 'flat' && <Minus        size={12} className="text-slate-400" />}
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

export default function BakeryDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { compute } = useDashboardWorker()

  const [loading, setLoading] = useState(true)
  const [raw, setRaw] = useState<BakeryData>(EMPTY)
  const [trends, setTrends] = useState<TrendsResult | null>(null)
  const [efficiency, setEfficiency] = useState<EfficiencyResult | null>(null)
  const [costAnalysis, setCostAnalysis] = useState<IngredientCostResult | null>(null)

  useEffect(() => { load() }, [refreshSignal])

  const load = async () => {
    try {
      setLoading(true)
      const api = (globalThis as any).api?.bakery
      if (!api) { setLoading(false); return }

      const now  = new Date()
      const today    = new Date(now); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 7)

      // All IPC calls in parallel ──────────────────────────────────────────
      const [todayBatchesR, weekBatchesR, recipesR, lowIngR, wasteR, scheduleR] =
        await Promise.allSettled([
          api.getProductionBatches?.({ startDate: today.toISOString(),   endDate: tomorrow.toISOString() }),
          api.getProductionBatches?.({ startDate: weekAgo.toISOString(), endDate: tomorrow.toISOString() }),
          api.getRecipes?.({ limit: 1 }),
          api.getLowIngredients?.(),
          api.getWasteLogs?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
          api.getProductionSchedule?.({ date: today.toISOString() }),
        ])

      const todayBatches = todayBatchesR.status === 'fulfilled' ? (todayBatchesR.value?.data || todayBatchesR.value || []) : []
      const weekBatches  = weekBatchesR.status  === 'fulfilled' ? (weekBatchesR.value?.data  || weekBatchesR.value  || []) : []
      const recipes      = recipesR.status      === 'fulfilled' ? (recipesR.value?.total ?? recipesR.value?.length ?? 0) : 0
      const lowIng       = lowIngR.status       === 'fulfilled' ? (lowIngR.value              || []) : []
      const wasteLogs    = wasteR.status        === 'fulfilled' ? (wasteR.value?.data          || wasteR.value          || []) : []
      const schedule     = scheduleR.status     === 'fulfilled' ? (scheduleR.value?.data       || scheduleR.value       || []) : []

      const data: BakeryData = { todayBatches, weekBatches, recipes, lowIngredients: lowIng, wasteLogs, schedule }
      setRaw(data)

      // Build 7-day daily bucket array for trend computation ────────────────
      const dailyCounts = buildDailyBuckets(weekBatches, 7)

      // All worker computations in parallel ────────────────────────────────
      const [trendsResult, effResult, costResult] = await Promise.all([
        compute<TrendsResult>('COMPUTE_TRENDS', {
          values: dailyCounts.map(d => d.count),
          labels: dailyCounts.map(d => d.label),
        }),
        todayBatches.length
          ? compute<EfficiencyResult>('COMPUTE_EFFICIENCY', {
              batches: todayBatches.map((b: any) => ({
                name:    b.name || b.recipeName || 'Batch',
                planned: b.plannedQuantity || 0,
                actual:  b.actualQuantity  || 0,
              })),
            })
          : Promise.resolve(null),
        todayBatches.length
          ? compute<IngredientCostResult>('COMPUTE_INGREDIENT_COST', {
              batches: todayBatches.map((b: any) => ({
                name:        b.name || b.recipeName || '',
                quantity:    b.actualQuantity || b.plannedQuantity || 1,
                ingredients: (b.ingredients || []).map((ing: any) => ({
                  name:     ing.name     || '',
                  qty:      ing.qty      || 0,
                  unitCost: ing.unitCost || 0,
                })),
              })),
            })
          : Promise.resolve(null),
      ])

      setTrends(trendsResult)
      setEfficiency(effResult)
      setCostAnalysis(costResult)
    } catch (err) {
      logger.error('BakeryDashboardSection load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const buildDailyBuckets = (batches: any[], days: number) => {
    const result: { label: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d    = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const count = batches.filter((b: any) => {
        const bd = new Date(b.createdAt || b.scheduledAt || 0)
        return bd >= d && bd < next
      }).length
      result.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), count })
    }
    return result
  }

  const trendData = useMemo(() =>
    trends ? trends.movingAvg.map((v, i) => ({ v: +v.toFixed(1), label: trends.labels[i] || `D${i+1}` })) : []
  , [trends])

  const completedBatches  = raw.todayBatches.filter((b: any) => b.status === 'completed').length
  const pendingBatches    = raw.todayBatches.filter((b: any) => b.status === 'pending').length
  const inProgressBatches = raw.todayBatches.filter((b: any) => b.status === 'in_progress').length
  const totalWaste        = raw.wasteLogs.reduce((s: number, w: any) => s + (w.quantity || 0), 0)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-lg" />
          <div className="space-y-1">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-24 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-48 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Plugin header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Croissant size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('bakery') || 'Bakery'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('bakeryOverview') || "Today's production overview"}</p>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={ClipboardList} label="Today's Batches" value={raw.todayBatches.length}
          sub={`${completedBatches} done`}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" trend="flat" />
        <StatCard icon={Flame} label="In Progress" value={inProgressBatches}
          sub={`${pendingBatches} pending`}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-600"
          trend={inProgressBatches > 0 ? 'up' : 'flat'} />
        <StatCard icon={Package} label="Recipes" value={raw.recipes}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" trend="flat" />
        <StatCard icon={AlertTriangle} label="Low Ingredients" value={raw.lowIngredients.length}
          sub={raw.lowIngredients.length > 0 ? 'Need restock' : 'All stocked'}
          color="bg-red-100 dark:bg-red-900/30 text-red-600"
          trend={raw.lowIngredients.length > 0 ? 'down' : 'flat'} />
        <StatCard icon={Scale} label="Waste Today" value={`${totalWaste.toFixed(1)} kg`}
          sub="from waste logs"
          color="bg-slate-100 dark:bg-slate-700 text-slate-500"
          trend={totalWaste > 5 ? 'down' : 'flat'} />
      </div>

      {/* ── Row 2: 7-day Trend + Efficiency + Schedule ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 7-day batch trend sparkline */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <BarChart3 size={16} /> 7-Day Production Trend
            </h3>
            {trends && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                trends.trend === 'up'   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                trends.trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {trends.change >= 0 ? '+' : ''}{trends.change.toFixed(0)}%
              </span>
            )}
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={trendData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: any) => [`${v} batches`, '']}
                  contentStyle={{ fontSize: 11 }}
                />
                <Line type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-xs text-slate-400">No history yet</div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            <div><span className="block font-semibold text-slate-800 dark:text-white">{trends?.avg.toFixed(1) ?? '—'}</span>Avg/day</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{trends?.max ?? '—'}</span>Peak</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{trends?.min ?? '—'}</span>Low</div>
          </div>
        </div>

        {/* Production efficiency */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <TrendingUp size={16} /> Production Efficiency
          </h3>
          {efficiency && efficiency.items.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{efficiency.overallPct}%</p>
                  <p className="text-xs text-slate-500">Overall yield</p>
                </div>
              </div>
              <div className="space-y-2">
                {efficiency.items.slice(0, 4).map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{item.name || `Batch ${i+1}`}</span>
                      <span className="font-medium text-slate-800 dark:text-white">{item.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-1.5 rounded-full ${item.pct >= 100 ? 'bg-emerald-500' : item.pct >= 80 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, item.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="flex-1 text-center py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                  {efficiency.aboveTarget} on target
                </span>
                <span className="flex-1 text-center py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                  {efficiency.belowTarget} low yield
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <ChefHat size={24} className="opacity-30" />
              No batches today yet
            </div>
          )}
        </div>

        {/* Today's schedule / active batches */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <Clock size={16} /> Today's Schedule
          </h3>
          {(raw.schedule.length > 0 || raw.todayBatches.length > 0) ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {(raw.schedule.length > 0 ? raw.schedule : raw.todayBatches).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.status === 'completed'  ? 'bg-emerald-500' :
                    item.status === 'in_progress' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{item.name || item.recipeName || `Batch ${i+1}`}</p>
                    <p className="text-xs text-slate-500">{item.startTime ? `${item.startTime} · ` : ''}{item.plannedQuantity || 0} unit(s)</p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    item.status === 'completed'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    item.status === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}>{item.status || 'pending'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <ClipboardList size={24} className="opacity-30" />
              No batches scheduled
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Low Ingredients + Cost Analysis + Quick Links ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Low ingredient urgency */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <Wheat size={16} /> Low Stock Ingredients
          </h3>
          {raw.lowIngredients.length > 0 ? (
            <div className="space-y-2">
              {raw.lowIngredients.slice(0, 6).map((ing: any, i: number) => {
                const pct = ing.capacity > 0 ? (ing.currentStock / ing.capacity) * 100 : 10
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{ing.name}</span>
                      <span className="text-slate-500">{ing.currentStock} {ing.unit || 'u'}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                      <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-emerald-500 text-xs gap-1">
              <Package size={20} />
              All ingredients stocked
            </div>
          )}
        </div>

        {/* Ingredient cost analysis */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <Scale size={16} /> Cost Analysis (Today)
          </h3>
          {costAnalysis && costAnalysis.batches.length > 0 ? (
            <>
              <div className="text-center mb-3">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">${costAnalysis.totalCost}</p>
                <p className="text-xs text-slate-500">Total ingredient cost</p>
              </div>
              <div className="space-y-2">
                {costAnalysis.batches.slice(0, 4).map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{b.name}</span>
                    <div className="text-right">
                      <span className="font-medium text-slate-800 dark:text-white">${b.totalCost.toFixed(2)}</span>
                      <span className="text-slate-400 ml-1">(${b.costPerUnit.toFixed(2)}/u)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-slate-400 text-xs gap-1">
              <Scale size={20} className="opacity-30" />
              No cost data for today
            </div>
          )}
        </div>

        {/* Quick nav links */}
        <div className="space-y-2">
          {[
            { tab: 'schedule', icon: ClipboardList, label: 'Production Schedule', sub: "Manage today's batches" },
            { tab: 'recipes',  icon: ChefHat,       label: 'Recipes',             sub: 'Browse & manage recipes' },
            { tab: 'pantry',   icon: Wheat,          label: 'Pantry',              sub: 'Ingredient stock levels' },
            { tab: 'waste',    icon: Scale,          label: 'Waste Logs',          sub: 'Record & review waste' },
          ].map(({ tab, icon: Icon, label, sub }) => (
            <button
              key={tab}
              onClick={() => navigate(`/bakery?tab=${tab}`)}
              className="w-full bg-white dark:bg-slate-800 rounded-lg px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-left hover:border-amber-400 transition-colors group flex items-center gap-3"
            >
              <Icon size={15} className="text-amber-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-xs">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
