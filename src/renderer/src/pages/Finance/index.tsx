/**
 * Finance Hub
 *
 * Plugin-aware Finance page. Shows a plugin selector at the top;
 * each active plugin has its own Finance section with tailored tabs.
 *
 * Plugins: Commerce · Bakery · Restaurant · Warehouse · Clinic
 */

import React, { useState, useEffect, lazy, Suspense } from 'react'
import { TrendingUp, ShoppingCart, Croissant, UtensilsCrossed, Warehouse, Stethoscope, PawPrint } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useModuleEnabled } from '@renderer/hooks/useModuleEnabled'
import NoPluginsFinanceKernel from './components/NoPluginsFinanceKernel'

// Lazy-load plugin sections
const CommerceFinanceSection   = lazy(() => import('@renderer/plugins/commerce/finance/CommerceFinanceSection'))
const BakeryFinanceSection     = lazy(() => import('@renderer/plugins/bakery/finance/BakeryFinanceSection'))
const RestaurantFinanceSection = lazy(() => import('@renderer/plugins/restaurant/finance/RestaurantFinanceSection'))
const WarehouseFinanceSection  = lazy(() => import('@renderer/plugins/warehouse/finance/WarehouseFinanceSection'))
const ClinicFinanceSection     = lazy(() => import('@renderer/plugins/clinic/finance/ClinicFinanceSection'))
const VetFinanceSection        = lazy(() => import('@renderer/plugins/vet/finance/VetFinanceSection'))

const SectionFallback: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />
    <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
    </div>
  </div>
)

type PluginId = 'commerce' | 'bakery' | 'restaurant' | 'warehouse' | 'clinic' | 'vet'

const PLUGIN_TABS: { id: PluginId; label: string; icon: React.ElementType; activeClass: string; hoverClass: string }[] = [
  { id: 'commerce',   label: 'Commerce',   icon: ShoppingCart,    activeClass: 'bg-indigo-600 text-white shadow-md', hoverClass: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
  { id: 'bakery',     label: 'Bakery',     icon: Croissant,       activeClass: 'bg-amber-500 text-white shadow-md',  hoverClass: 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, activeClass: 'bg-rose-600 text-white shadow-md',   hoverClass: 'hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-700 dark:text-rose-300' },
  { id: 'warehouse',  label: 'Warehouse',  icon: Warehouse,       activeClass: 'bg-blue-600 text-white shadow-md',   hoverClass: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
  { id: 'clinic',     label: 'Clinic',     icon: Stethoscope,     activeClass: 'bg-teal-600 text-white shadow-md',   hoverClass: 'hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-300' },
  { id: 'vet',        label: 'Vet Clinic', icon: PawPrint,        activeClass: 'bg-violet-600 text-white shadow-md', hoverClass: 'hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-700 dark:text-violet-300' },
]

const Finance: React.FC = () => {
  const { t } = useLanguage()

  const isCommerce   = useModuleEnabled('commerce')
  const isBakery     = useModuleEnabled('bakery')
  const isRestaurant = useModuleEnabled('restaurant')
  const isWarehouse  = useModuleEnabled('warehouse')
  const isClinic     = useModuleEnabled('clinic')
  const isVet        = useModuleEnabled('vet')

  const enabledPlugins = PLUGIN_TABS.filter(p =>
    (p.id === 'commerce'   && isCommerce)   ||
    (p.id === 'bakery'     && isBakery)     ||
    (p.id === 'restaurant' && isRestaurant) ||
    (p.id === 'warehouse'  && isWarehouse)  ||
    (p.id === 'clinic'     && isClinic)     ||
    (p.id === 'vet'        && isVet)
  )

  const anyActive = enabledPlugins.length > 0
  const [activePlugin, setActivePlugin] = useState<PluginId | null>(null)

  // Auto-select the first enabled plugin when the list changes
  useEffect(() => {
    if (enabledPlugins.length === 0) { setActivePlugin(null); return }
    if (!activePlugin || !enabledPlugins.find(p => p.id === activePlugin)) {
      setActivePlugin(enabledPlugins[0].id)
    }
  }, [isCommerce, isBakery, isRestaurant, isWarehouse, isClinic, isVet])

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <TrendingUp size={24} className="text-slate-600 dark:text-slate-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Finance & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {anyActive
              ? 'Plugin-tailored financial insights and analytics'
              : 'Enable plugins to unlock financial analytics'}
          </p>
        </div>
      </div>

      {/* No plugins */}
      {!anyActive && <NoPluginsFinanceKernel />}

      {/* Plugin selector tabs */}
      {anyActive && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-2">
            {enabledPlugins.map(plugin => {
              const Icon = plugin.icon
              const isActive = activePlugin === plugin.id
              return (
                <button
                  key={plugin.id}
                  onClick={() => setActivePlugin(plugin.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive ? plugin.activeClass : `text-slate-600 dark:text-slate-300 ${plugin.hoverClass}`}`}
                >
                  <Icon size={16} />{plugin.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Active plugin section */}
      {anyActive && activePlugin && (
        <Suspense fallback={<SectionFallback />}>
          {activePlugin === 'commerce'   && <CommerceFinanceSection />}
          {activePlugin === 'bakery'     && <BakeryFinanceSection />}
          {activePlugin === 'restaurant' && <RestaurantFinanceSection />}
          {activePlugin === 'warehouse'  && <WarehouseFinanceSection />}
          {activePlugin === 'clinic'     && <ClinicFinanceSection />}
          {activePlugin === 'vet'        && <VetFinanceSection />}
        </Suspense>
      )}
    </div>
  )
}

export default Finance

// ─── LEGACY COMPATIBILITY SHIM ──────────────────────────────────────────────
// The code below is intentionally removed (was the old monolithic Commerce-only
// Finance page). All commerce finance logic now lives in:
//   src/renderer/src/plugins/commerce/finance/CommerceFinanceSection.tsx
//
// The following dead-code comment block is kept to aid future git blame searches.
//
// REMOVED:
//  - FinanceMetrics type (moved to ./types)
//  - KPICard, TabButton, Tooltip helper components (inlined in CommerceFinanceSection)
//  - All chart/XLSX/date-range logic (moved to CommerceFinanceSection)
// ─────────────────────────────────────────────────────────────────────────────

// END OF FILE — all remaining lines below this comment were the old Finance()
// function body and have been replaced by the plugin hub above.

