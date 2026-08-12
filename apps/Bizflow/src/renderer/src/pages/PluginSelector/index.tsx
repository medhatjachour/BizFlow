/**
 * Plugin Selector Page
 * Allows users to select which business module/plugin to load
 */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useModuleEnabled } from '../../hooks/useModuleEnabled'
import { MODULE_IDS, MODULE_REGISTRY } from '@/shared/modules'
import { ChevronRight, Settings } from 'lucide-react'

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
    // Route to the plugin's main page
    const routeMap: Record<string, string> = {
      'commerce': '/sales',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome to BizFlow
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {user?.username ? `Hi ${user.username}, ` : ''}
            Select a business module to get started
          </p>
        </div>

        {/* No plugins state */}
        {enabledPlugins.length === 0 ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
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
            {/* Plugins grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {enabledPlugins.map(plugin => {
                return (
                  <button
                    key={plugin.id}
                    onClick={() => handleSelectPlugin(plugin.id)}
                    className="text-left group relative overflow-hidden rounded-2xl border-2 transition-all hover:shadow-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    <div className="p-8 relative z-10">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-slate-100 dark:bg-slate-700 text-2xl">
                        {plugin.icon}
                      </div>

                      {/* Content */}
                      <h3 className="text-xl font-bold mb-2">{plugin.name}</h3>
                      <p className="text-sm opacity-75 mb-6 leading-relaxed">
                        {plugin.description || 'Manage your business operations'}
                      </p>

                      {/* CTA */}
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Open Module</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={handleViewDashboard}
                className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                View Dashboard
              </button>
              <button
                onClick={handleOpenSettings}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Modules
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
