/**
 * Bakery Management Page
 *
 * Tabs:
 *  0. Overview     – daily command center: capacity, schedule, alerts
 *  1. Recipes      – create / edit / delete recipes with ingredient costing
 *  2. Production   – log batches produced, view history
 *  3. Pantry       – ingredient stock tracking with low-stock alerts
 *  4. Waste Log    – track ingredient/product waste
 *  5. Schedule     – plan daily production runs
 *  6. Profit & Loss – revenue vs costs (including waste), margin analysis
 */

import { useState } from 'react'
import { ChefHat, FlaskConical, BarChart3, Package, Trash2, Calendar, LayoutDashboard } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DailyOverviewTab from './components/DailyOverviewTab'
import RecipesTab from './components/RecipesTab'
import ProductionTab from './components/ProductionTab'
import PantryTab from './components/PantryTab'
import WasteTab from './components/WasteTab'
import ScheduleTab from './components/ScheduleTab'
import ProfitLossTab from './components/ProfitLossTab'
import EndOfDayModal from './components/EndOfDayModal'

type Tab = 'overview' | 'recipes' | 'production' | 'pantry' | 'waste' | 'schedule' | 'pnl'

export default function BakeryPage() {
  const [active, setActive] = useState<Tab>('overview')
  const [showEOD, setShowEOD] = useState(false)
  const { t } = useLanguage()

  const tabs: { key: Tab; label: string; Icon: typeof ChefHat }[] = [
    { key: 'overview',   label: t('bakeryOverviewTab'),   Icon: LayoutDashboard },
    { key: 'recipes',    label: t('bakeryRecipesTab'),    Icon: ChefHat },
    { key: 'production', label: t('bakeryProductionTab'), Icon: FlaskConical },
    { key: 'pantry',     label: t('bakeryPantryTab'),     Icon: Package },
    { key: 'waste',      label: t('bakeryWasteTab'),      Icon: Trash2 },
    { key: 'schedule',   label: t('bakeryScheduleTab'),   Icon: Calendar },
    { key: 'pnl',        label: t('bakeryProfitLossTab'), Icon: BarChart3 }
  ]

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* End of Day Modal */}
      {showEOD && (
        <EndOfDayModal
          onClose={() => setShowEOD(false)}
          onWasteLogged={() => setShowEOD(false)}
        />
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <ChefHat className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('bakery')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('bakerySubtitle')}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
                active === key
                  ? 'bg-white dark:bg-slate-800 border border-b-white dark:border-slate-700 dark:border-b-slate-800 text-amber-600 dark:text-amber-400 -mb-px'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {active === 'overview'   && <DailyOverviewTab onEndOfDay={() => setShowEOD(true)} />}
        {active === 'recipes'    && <RecipesTab />}
        {active === 'production' && <ProductionTab />}
        {active === 'pantry'     && <PantryTab />}
        {active === 'waste'      && <WasteTab />}
        {active === 'schedule'   && <ScheduleTab />}
        {active === 'pnl'        && <ProfitLossTab />}
      </div>
    </div>
  )
}
