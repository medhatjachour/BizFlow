import React, { useState, lazy, Suspense } from 'react'
import { RefreshCw, FileBarChart } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useModuleEnabled } from '@renderer/hooks/useModuleEnabled'
import NoPluginsKernel from './components/NoPluginsKernel'

// Lazy-loaded plugin report sections
const CommerceReportSection  = lazy(() => import('@renderer/plugins/commerce/reports/CommerceReportSection'))
const BakeryReportSection    = lazy(() => import('@renderer/plugins/bakery/reports/BakeryReportSection'))
const RestaurantReportSection = lazy(() => import('@renderer/plugins/restaurant/reports/RestaurantReportSection'))
const WarehouseReportSection  = lazy(() => import('@renderer/plugins/warehouse/reports/WarehouseReportSection'))
const ClinicReportSection     = lazy(() => import('@renderer/plugins/clinic/reports/ClinicReportSection'))
const VetReportSection        = lazy(() => import('@renderer/plugins/vet/reports/VetReportSection'))
const GymReportSection        = lazy(() => import('@renderer/plugins/gym/reports/GymReportSection'))

const SectionFallback: React.FC = () => (
  <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
)

const Divider: React.FC = () => (
  <div className="border-t border-slate-200 dark:border-slate-700" />
)

const Reports: React.FC = () => {
  const { t } = useLanguage()
  const [refreshSig, setRefreshSig] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const isCommerce   = useModuleEnabled('commerce')
  const isBakery     = useModuleEnabled('bakery')
  const isRestaurant = useModuleEnabled('restaurant')
  const isWarehouse  = useModuleEnabled('warehouse')
  const isClinic     = useModuleEnabled('clinic')
  const isVet        = useModuleEnabled('vet')
  const isGym        = useModuleEnabled('gym')

  const anyActive = isCommerce || isBakery || isRestaurant || isWarehouse || (__PLUGIN_CLINIC__ && isClinic) || (__PLUGIN_VET__ && isVet) || isGym

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshSig(s => s + 1)
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <div className="p-6 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <FileBarChart size={24} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('reportsAndAnalytics')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {anyActive
                ? 'Per-plugin live reports and today\'s activity'
                : 'Enable plugins to unlock reports and analytics'}
            </p>
          </div>
        </div>
        {anyActive && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50 shadow-sm font-medium text-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh All
          </button>
        )}
      </div>

      {/* No plugins state */}
      {!anyActive && <NoPluginsKernel />}

      {/* Plugin sections */}
      {isCommerce && (
        <>
          <Suspense fallback={<SectionFallback />}>
            <CommerceReportSection refreshSignal={refreshSig} />
          </Suspense>
          {(isBakery || isRestaurant || isWarehouse || isClinic) && <Divider />}
        </>
      )}

      {isBakery && (
        <>
          <Suspense fallback={<SectionFallback />}>
            <BakeryReportSection refreshSignal={refreshSig} />
          </Suspense>
          {(isRestaurant || isWarehouse || isClinic) && <Divider />}
        </>
      )}

      {isRestaurant && (
        <>
          <Suspense fallback={<SectionFallback />}>
            <RestaurantReportSection refreshSignal={refreshSig} />
          </Suspense>
          {(isWarehouse || isClinic) && <Divider />}
        </>
      )}

      {isWarehouse && (
        <>
          <Suspense fallback={<SectionFallback />}>
            <WarehouseReportSection refreshSignal={refreshSig} />
          </Suspense>
          {__PLUGIN_CLINIC__ && isClinic && <Divider />}
        </>
      )}

      {__PLUGIN_CLINIC__ && isClinic && (
        <>
          <Suspense fallback={<SectionFallback />}>
            <ClinicReportSection refreshSignal={refreshSig} />
          </Suspense>
          {__PLUGIN_VET__ && isVet && <Divider />}
        </>
      )}

      {__PLUGIN_VET__ && isVet && (
        <>
          <Suspense fallback={<SectionFallback />}>
            <VetReportSection refreshSignal={refreshSig} />
          </Suspense>
          {isGym && <Divider />}
        </>
      )}

      {isGym && (
        <Suspense fallback={<SectionFallback />}>
          <GymReportSection refreshSignal={refreshSig} />
        </Suspense>
      )}
    </div>
  )
}

export default Reports
