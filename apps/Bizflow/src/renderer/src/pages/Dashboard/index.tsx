/**
 * Dashboard Page — Kernel shell
 *
 * Each plugin contributes its own dashboard section (lazy-loaded, guarded by
 * build flag + runtime module check).  If NO plugins are active the kernel
 * shows a clean "welcome / enable a plugin" state instead of blank space.
 */

import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { Activity, Zap, RefreshCw, Layers, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useModuleEnabled } from '../../hooks/useModuleEnabled'
import { MODULE_IDS, MODULE_REGISTRY } from '@/shared/modules'
import RecentActivity from './components/RecentActivity'
import QuickActions from './components/QuickActions'

const NotificationCenter = lazy(() => import('./components/NotificationCenter'))

// ── Plugin dashboard sections (tree-shaken when build flag is false) ─────────
const CommerceDashboard = __PLUGIN_COMMERCE__
  ? lazy(() => import('@renderer/plugins/commerce/pages/dashboard/CommerceDashboardSection'))
  : null

const BakeryDashboard = __PLUGIN_BAKERY__
  ? lazy(() => import('@renderer/plugins/bakery/dashboard/BakeryDashboardSection'))
  : null

const RestaurantDashboard = __PLUGIN_RESTAURANT__
  ? lazy(() => import('@renderer/plugins/restaurant/dashboard/RestaurantDashboardSection'))
  : null

const WarehouseDashboard = __PLUGIN_WAREHOUSE__
  ? lazy(() => import('@renderer/plugins/warehouse/dashboard/WarehouseDashboardSection'))
  : null

const ClinicDashboard = __PLUGIN_CLINIC__
  ? lazy(() => import('@renderer/plugins/clinic/dashboard/ClinicDashboardSection'))
  : null

const VetDashboard = __PLUGIN_VET__
  ? lazy(() => import('@renderer/plugins/vet/dashboard/VetDashboardSection'))
  : null

const GymDashboard = __PLUGIN_GYM__
  ? lazy(() => import('@renderer/plugins/gym/dashboard'))
  : null

const PharmacyDashboard = __PLUGIN_PHARMACY__
  ? lazy(() => import('@renderer/plugins/pharmacy/dashboard/PharmacyDashboardSection'))
  : null

const Spinner = ({ h = 'h-48' }: { h?: string }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 ${h} flex items-center justify-center`}>
    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
  </div>
)

/** Placeholder loading skeleton for a plugin section */
const PluginSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Spinner key={i} h="h-24" />
      ))}
    </div>
    <Spinner h="h-40" />
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  // Runtime module state
  const commerceEnabled   = useModuleEnabled(MODULE_IDS.COMMERCE)
  const bakeryEnabled     = useModuleEnabled(MODULE_IDS.BAKERY)
  const restaurantEnabled = useModuleEnabled(MODULE_IDS.RESTAURANT)
  const warehouseEnabled  = useModuleEnabled(MODULE_IDS.WAREHOUSE)
  const clinicEnabled     = useModuleEnabled(MODULE_IDS.CLINIC)
  const vetEnabled        = useModuleEnabled(MODULE_IDS.VET)
  const gymEnabled        = useModuleEnabled(MODULE_IDS.GYM)
  const pharmacyEnabled   = useModuleEnabled(MODULE_IDS.PHARMACY)

  // True when at least one plugin section will be rendered
  const hasActivePlugin =
    (__PLUGIN_COMMERCE__   && commerceEnabled)   ||
    (__PLUGIN_BAKERY__     && bakeryEnabled)     ||
    (__PLUGIN_RESTAURANT__ && restaurantEnabled) ||
    (__PLUGIN_WAREHOUSE__  && warehouseEnabled)  ||
    (__PLUGIN_CLINIC__     && clinicEnabled)     ||
    (__PLUGIN_VET__        && vetEnabled)        ||
    (__PLUGIN_GYM__        && gymEnabled)        ||
    (__PLUGIN_PHARMACY__   && pharmacyEnabled)

  const [refreshSignal, setRefreshSignal] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setRefreshSignal(s => s + 1), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshSignal(s => s + 1)
    setTimeout(() => setRefreshing(false), 800)
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
                {t('businessOverview')}{' '}
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
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
                <span className="text-sm font-medium capitalize">
                  {t(`${user?.role}Access` as any) || `${user?.role} Access`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto p-4 space-y-6">

        {/* ── Plugin sections ─────────────────────────────────────────────── */}
        {__PLUGIN_COMMERCE__ && commerceEnabled && CommerceDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <CommerceDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {__PLUGIN_BAKERY__ && bakeryEnabled && BakeryDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <BakeryDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {__PLUGIN_RESTAURANT__ && restaurantEnabled && RestaurantDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <RestaurantDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {__PLUGIN_WAREHOUSE__ && warehouseEnabled && WarehouseDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <WarehouseDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {__PLUGIN_CLINIC__ && clinicEnabled && ClinicDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <ClinicDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {__PLUGIN_VET__ && vetEnabled && VetDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <VetDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {__PLUGIN_GYM__ && gymEnabled && GymDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <GymDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {__PLUGIN_PHARMACY__ && pharmacyEnabled && PharmacyDashboard && (
          <Suspense fallback={<PluginSkeleton />}>
            <PharmacyDashboard refreshSignal={refreshSignal} />
          </Suspense>
        )}

        {/* ── No-plugin welcome state ──────────────────────────────────────── */}
        {!hasActivePlugin && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-dashed border-slate-300 dark:border-slate-600 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Layers size={32} className="text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('noPluginsActive') || 'No plugins active'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-sm">
              {t('enablePluginHint') ||
                'Enable a plugin from Settings to unlock its dashboard, quick actions, and reports.'}
            </p>
            {/* Available plugins overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 max-w-2xl mx-auto">
              {Object.values(MODULE_REGISTRY).map(mod => (
                <div
                  key={mod.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                >
                  <span className="text-2xl">{mod.icon}</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{mod.name}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/settings?tab=modules')}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
            >
              <Settings size={16} />
              {t('goToSettings') || 'Go to Settings'}
            </button>
          </div>
        )}

        {/* ── Kernel layout (always visible) ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>
          <div className="space-y-4">
            <QuickActions userRole={user?.role || 'sales'} />
            <Suspense fallback={<Spinner />}>
              <NotificationCenter />
            </Suspense>
            {/* System Status */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium">{t('systemStatus')}</span>
              </div>
              <p className="text-2xl font-bold mb-1">{t('allSystemsOperational')}</p>
              <p className="text-white/80 text-xs">
                {t('lastUpdated')}: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
