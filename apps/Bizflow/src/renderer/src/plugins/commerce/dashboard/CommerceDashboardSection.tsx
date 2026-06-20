/**
 * CommerceDashboardSection
 *
 * Self-contained commerce widget for the kernel Dashboard.
 * Owns its own data fetching so Dashboard/index.tsx stays clean.
 *
 * Rendered conditionally:
 *   __PLUGIN_COMMERCE__ && commerceEnabled && <CommerceDashboardSection />
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { TrendsResult } from '@renderer/hooks/useDashboardWorker'
import DashboardStats from './DashboardStats'
import logger from '@/shared/utils/logger'

const SalesChart     = lazy(() => import('./SalesChart'))
const TopProducts    = lazy(() => import('./TopProducts'))
const GoalTracking   = lazy(() => import('./GoalTracking'))
const InventoryAlerts = lazy(() => import('./InventoryAlerts'))

const Spinner = ({ h = 'h-48' }: { h?: string }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 ${h} flex items-center justify-center`}>
    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
  </div>
)

interface Props {
  /** Passed down from kernel so the refresh button also refreshes commerce data */
  refreshSignal?: number
}

export default function CommerceDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const { compute } = useDashboardWorker()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayRevenue:   0,
    todayOrders:    0,
    totalProducts:  0,
    lowStockItems:  0,
    totalCustomers: 0,
    revenueChange:  0,
    ordersChange:   0,
  })
  const [weekTrend, setWeekTrend] = useState<TrendsResult | null>(null)

  useEffect(() => {
    loadCommerceData()
  }, [refreshSignal])

  const loadCommerceData = async () => {
    try {
      setLoading(true)

      const today     = new Date(); today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
      const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(today.getDate() - 14)

      const dashboardApi = (globalThis as any).api?.dashboard

      const [productStats, todayStats, yesterdayStats, customerCount, weekDailyR] = await Promise.all([
        (globalThis as any).api?.products?.getStats?.()
          || Promise.resolve({ totalProducts: 0, lowStockCount: 0 }),
        dashboardApi?.getDayStats?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() })
          || Promise.resolve({ total: 0, count: 0 }),
        dashboardApi?.getDayStats?.({ startDate: yesterday.toISOString(), endDate: today.toISOString() })
          || Promise.resolve({ total: 0, count: 0 }),
        (globalThis as any).api?.customers?.getCount?.()
          || Promise.resolve(0),
        dashboardApi?.getDailyRevenue?.({ startDate: twoWeeksAgo.toISOString(), endDate: tomorrow.toISOString() })
          || Promise.resolve([]),
      ])

      const todayRevenue     = todayStats.total     ?? 0
      const yesterdayRevenue = yesterdayStats.total ?? 0
      const revenueChange    = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
      const ordersChange     = yesterdayStats.count > 0
        ? ((todayStats.count - yesterdayStats.count) / yesterdayStats.count) * 100 : 0

      setStats({
        todayRevenue,
        todayOrders:    todayStats.count ?? 0,
        totalProducts:  productStats?.totalProducts  || 0,
        lowStockItems:  productStats?.lowStockCount   || 0,
        totalCustomers: typeof customerCount === 'number' ? customerCount : (customerCount?.count ?? 0),
        revenueChange,
        ordersChange,
      })

      // Worker: compute 7-day trend from daily revenue array ───────────────
      if (Array.isArray(weekDailyR) && weekDailyR.length > 0) {
        const last7 = weekDailyR.slice(-7)
        const trendResult = await compute<TrendsResult>('COMPUTE_TRENDS', {
          values: last7.map((d: any) => d.total ?? d.revenue ?? d.value ?? 0),
          labels: last7.map((d: any) =>
            d.date ? new Date(d.date).toLocaleDateString('en', { weekday: 'short' }) : ''
          ),
        })
        setWeekTrend(trendResult)
      }
    } catch (error) {
      logger.error('CommerceDashboardSection: error loading data', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Commerce Metric Cards */}
      <DashboardStats stats={stats} loading={loading} />

      {/* Commerce Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — Charts */}
        <div className="lg:col-span-2 space-y-4">
          <Suspense fallback={<Spinner h="h-96" />}>
            <SalesChart />
          </Suspense>
          <Suspense fallback={<Spinner h="h-64" />}>
            <TopProducts />
          </Suspense>
        </div>

        {/* Right column — Commerce Panels */}
        <div className="space-y-4">
          <Suspense fallback={<Spinner />}>
            <GoalTracking />
          </Suspense>
          <Suspense fallback={<Spinner />}>
            <InventoryAlerts />
          </Suspense>

          {/* Week-over-Week Revenue Trend (worker-computed) */}
          {weekTrend && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                <BarChart3 size={16} /> Week Comparison
              </h3>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500">7-day avg revenue</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    ${weekTrend.avg.toFixed(0)}
                  </p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${
                  weekTrend.trend === 'up'   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  weekTrend.trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {weekTrend.trend === 'up'   && <TrendingUp   size={14} />}
                  {weekTrend.trend === 'down' && <TrendingDown size={14} />}
                  {weekTrend.trend === 'flat' && <Minus        size={14} />}
                  {weekTrend.change >= 0 ? '+' : ''}{weekTrend.change.toFixed(1)}%
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center text-slate-500">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">${weekTrend.min.toFixed(0)}</p>
                  <p>Lowest</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">${weekTrend.avg.toFixed(0)}</p>
                  <p>Avg</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">${weekTrend.max.toFixed(0)}</p>
                  <p>Highest</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats mini-card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 size={18} />
              {t('quickStats')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{t('avgOrderValue')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  ${stats.todayOrders > 0 ? (stats.todayRevenue / stats.todayOrders).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{t('productsInStock')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {stats.totalProducts - stats.lowStockItems}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{t('lowStockItems')}</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {stats.lowStockItems}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">{t('activeCustomers')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {stats.totalCustomers}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
