import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useModuleEnabled } from '../../hooks/useModuleEnabled'
import { MODULE_IDS, MODULE_REGISTRY } from '@/shared/modules'
import { ChevronRight, Grid2X2, Settings, ArrowRight } from 'lucide-react'

export default function PluginSelector() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Check all enabled plugins
  const commerceEnabled = useModuleEnabled(MODULE_IDS.COMMERCE)
  const bakeryEnabled = useModuleEnabled(MODULE_IDS.BAKERY)
  const restaurantEnabled = useModuleEnabled(MODULE_IDS.RESTAURANT)
  const warehouseEnabled = useModuleEnabled(MODULE_IDS.WAREHOUSE)
  const clinicEnabled = useModuleEnabled(MODULE_IDS.CLINIC)
  const vetEnabled = useModuleEnabled(MODULE_IDS.VET)
  const gymEnabled = useModuleEnabled(MODULE_IDS.GYM)
  const pharmacyEnabled = useModuleEnabled(MODULE_IDS.PHARMACY)
  const coffeeEnabled = useModuleEnabled(MODULE_IDS.COFFEE)

  // Build enabled plugins list
  const enabledPlugins = Object.values(MODULE_REGISTRY).filter(plugin =>
    (plugin.id === 'commerce' && commerceEnabled) ||
    (plugin.id === 'bakery' && bakeryEnabled) ||
    (plugin.id === 'restaurant' && restaurantEnabled) ||
    (plugin.id === 'warehouse' && warehouseEnabled) ||
    (plugin.id === 'clinic' && clinicEnabled) ||
    (plugin.id === 'vet' && vetEnabled) ||
    (plugin.id === 'gym' && gymEnabled) ||
    (plugin.id === 'pharmacy' && pharmacyEnabled) ||
    (plugin.id === 'coffee' && coffeeEnabled)
  )

  const handleSelectPlugin = (pluginId: string) => {
    const routeMap: Record<string, string> = {
      'commerce': '/commerce',
      'bakery': '/bakery',
      'restaurant': '/restaurant',
      'warehouse': '/warehouse',
      'clinic': '/clinic',
      'vet': '/vet',
      'gym': '/gym',
      'pharmacy': '/pharmacy',
      'coffee': '/coffee',
    }
    navigate(routeMap[pluginId] || '/dashboard')
  }

  const handleViewDashboard = () => {
    navigate('/dashboard')
  }

  const handleOpenSettings = () => {
    navigate('/settings')
  }

  const lastPluginId = localStorage.getItem('bizflow:lastPlugin')
  const lastPlugin = enabledPlugins.find(plugin => plugin.id === lastPluginId) ?? enabledPlugins[0]

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Grid2X2 size={15} />
              Module workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Choose what to run
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              {user?.username ? `Hi ${user.username}. ` : ''}Open a module, test its workflow, then switch instantly whenever you want.
            </p>
          </div>
          <button
            onClick={handleViewDashboard}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            View dashboard
            <ArrowRight size={15} />
          </button>
        </header>

        {/* No plugins state */}
        {enabledPlugins.length === 0 ? (
          <div className="mx-auto max-w-md">
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                No Modules Active
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Enable modules in Settings to get started with your business operations.
              </p>
              <button
                onClick={handleOpenSettings}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Open Settings
              </button>
              <button
                onClick={handleViewDashboard}
                className="w-full mt-3 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                View Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {lastPlugin && (
              <section className="mb-6 rounded-xl border border-primary/20 bg-white p-5 shadow-sm dark:border-primary/30 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-3xl">
                      {lastPlugin.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Ready to continue</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{lastPlugin.name}</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your last selected workspace</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectPlugin(lastPlugin.id)}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            )}

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">All modules</h2>
              <span className="text-xs text-slate-400">{enabledPlugins.length} available</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {enabledPlugins.map(plugin => {
                return (
                  <button
                    key={plugin.id}
                    onClick={() => handleSelectPlugin(plugin.id)}
                    className="group flex min-h-36 flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <div>
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl dark:bg-slate-800">
                        {plugin.icon}
                      </div>

                      <h3 className="mb-1 text-base font-bold">{plugin.name}</h3>
                      <p className="line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {plugin.description || 'Manage your business operations'}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-primary">
                        <span>Open module</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Need to change what is available?</span>
              <button onClick={handleOpenSettings} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                <Settings size={15} /> Manage modules
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}