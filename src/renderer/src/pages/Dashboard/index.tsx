/**
 * Dashboard Page
 * Comprehensive overview with real-time metrics, analytics, and quick actions
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  BarChart3,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react'
import DashboardStats from './components/DashboardStats'
import RecentActivity from './components/RecentActivity'
import logger from '../../../../shared/utils/logger'

import QuickActions from './components/QuickActions'

// Lazy load heavy dashboard components for faster initial load
const SalesChart = lazy(() => import('./components/SalesChart'))
const TopProducts = lazy(() => import('./components/TopProducts'))
const InventoryAlerts = lazy(() => import('./components/InventoryAlerts'))
const GoalTracking = lazy(() => import('./components/GoalTracking'))
const NotificationCenter = lazy(() => import('./components/NotificationCenter'))

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    totalProducts: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    revenueChange: 0,
    ordersChange: 0,
  })

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 5 minutes (reduced from 30 seconds)
    const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes
    const interval = setInterval(() => {
      loadDashboardData(true)
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      
      // Calculate date ranges
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const dashboardApi = (globalThis as any).api?.dashboard

      // All three calls return lightweight aggregates — no raw transaction rows shipped
      const [productStats, todayStats, yesterdayStats, customerCount] = await Promise.all([
        // @ts-ignore
        (globalThis as any).api?.products?.getStats?.() || Promise.resolve({ totalProducts: 0, lowStockCount: 0 }),
        // Today: { total, count }
        dashboardApi?.getDayStats?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }) || Promise.resolve({ total: 0, count: 0 }),
        // Yesterday: { total, count }
        dashboardApi?.getDayStats?.({ startDate: yesterday.toISOString(), endDate: today.toISOString() }) || Promise.resolve({ total: 0, count: 0 }),
        // Customer count via aggregate — no full table load
        // @ts-ignore
        (globalThis as any).api?.customers?.getCount?.() || Promise.resolve(0),
      ])

      logger.info('Dashboard data loaded', {
        todayOrders: todayStats.count,
        yesterdayOrders: yesterdayStats.count,
      })

      const todayRevenue = todayStats.total ?? 0
      const yesterdayRevenue = yesterdayStats.total ?? 0
      const revenueChange = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0

      const ordersChange = yesterdayStats.count > 0
        ? ((todayStats.count - yesterdayStats.count) / yesterdayStats.count) * 100
        : 0

      setStats({
        todayRevenue,
        todayOrders: todayStats.count ?? 0,
        totalProducts: productStats?.totalProducts || 0,
        lowStockItems: productStats?.lowStockCount || 0,
        totalCustomers: typeof customerCount === 'number' ? customerCount : (customerCount?.count ?? 0),
        revenueChange,
        ordersChange,
      })
    } catch (error) {
      logger.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadDashboardData()
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return `🌅 ${t('goodMorning')}`
    if (hour < 18) return `☀️ ${t('goodAfternoon')}`
    return `🌙 ${t('goodEvening')}`
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {getGreeting()}, {user?.username}!
              </h1>
              <p className="text-white/80 text-sm flex items-center gap-2">
                <Activity size={16} />
                {t('businessOverview')} {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                title={t('refresh')}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span className="text-sm font-medium hidden sm:inline">
                  {refreshing ? t('refreshing') : t('refresh')}
                </span>
              </button>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Zap size={16} />
                <span className="text-sm font-medium capitalize">{t(`${user?.role}Access` as any) || `${user?.role} Access`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto p-4 space-y-4">
        {/* Key Metrics */}
        <DashboardStats stats={stats} loading={loading} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            {/* Sales Chart */}
            <Suspense fallback={
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 h-96 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            }>
              <SalesChart />
            </Suspense>

            {/* Top Products */}
            <Suspense fallback={
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 h-64 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            }>
              <TopProducts />
            </Suspense>

            {/* Recent Activity */}
            <RecentActivity />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <QuickActions userRole={user?.role || 'sales'} />

            {/* Goal Tracking */}
            <Suspense fallback={
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 h-48 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            }>
              <GoalTracking />
            </Suspense>

            {/* Notification Center */}
            <Suspense fallback={
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 h-48 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            }>
              <NotificationCenter />
            </Suspense>

            {/* Inventory Alerts */}
            <Suspense fallback={
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 h-48 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            }>
              <InventoryAlerts />
            </Suspense>

            {/* Quick Stats Card */}
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

            {/* System Status */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">{t('systemStatus')}</span>
              </div>
              <p className="text-2xl font-bold mb-1">{t('allSystemsOperational')}</p>
              <p className="text-white/80 text-xs">{t('lastUpdated')}: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
