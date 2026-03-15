/**
 * NoPluginsFinanceKernel
 *
 * Shown in the Finance hub when no plugins are currently enabled.
 * Presents an overview of available plugins and navigates to Settings.
 */

import { useNavigate } from 'react-router-dom'
import { TrendingUp, Settings, ShoppingCart, Croissant, UtensilsCrossed, Warehouse, Stethoscope } from 'lucide-react'

const PLUGINS = [
  { icon: ShoppingCart,    color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', name: 'Commerce',   desc: 'Revenue overview, forecasting, cash flow, pricing & installments' },
  { icon: Croissant,       color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',   name: 'Bakery',     desc: 'Profit & loss, waste cost analysis, recipe cost breakdown' },
  { icon: UtensilsCrossed, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',       name: 'Restaurant', desc: 'Revenue overview, menu performance, table revenue analytics' },
  { icon: Warehouse,       color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',       name: 'Warehouse',  desc: 'Inventory value, stock valuation by location, critical cost impact' },
  { icon: Stethoscope,     color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',       name: 'Clinic',     desc: 'Session activity, visit trends, top diagnoses frequency' },
]

const NoPluginsFinanceKernel: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Hero */}
      <div className="p-5 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full mb-5 shadow-inner">
        <TrendingUp size={44} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No Plugins Active</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-md mb-8">
        Enable one or more plugins in Settings to unlock plugin-specific financial analytics, forecasting, and cost insights.
      </p>

      {/* Plugin cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
        {PLUGINS.map(({ icon: Icon, color, name, desc }) => (
          <div key={name} className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 px-6 py-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-700 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95"
      >
        <Settings size={17} />
        Go to Module Settings
      </button>
    </div>
  )
}

export default NoPluginsFinanceKernel
