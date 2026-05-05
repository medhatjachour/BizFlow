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
import { ChefHat, FlaskConical, BarChart3, Package, Trash2, Calendar, LayoutDashboard, ShoppingBag, Info, X, ArrowDown } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DailyOverviewTab from './components/DailyOverviewTab'
import RecipesTab from './components/RecipesTab'
import ProductionTab from './components/ProductionTab'
import SalesTab from './components/SalesTab'
import PantryTab from './components/PantryTab'
import WasteTab from './components/WasteTab'
import ScheduleTab from './components/ScheduleTab'
import ProfitLossTab from './components/ProfitLossTab'
import EndOfDayModal from './components/EndOfDayModal'

type Tab = 'overview' | 'recipes' | 'production' | 'sales' | 'pantry' | 'waste' | 'schedule' | 'pnl'

// ─── How it Works Modal ───────────────────────────────────────────────────────

function BakeryHowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Bakery Workflow</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">How production flows through the system</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Flow */}
        <div className="px-6 py-5 space-y-1 overflow-y-auto max-h-[70vh]">

          {/* Step 1 — Recipes */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5" /> Recipes
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Define what you bake — ingredients, yield quantity, unit, expiry days, and cost per batch. Recipes are your production templates.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* Step 2 — Pantry */}
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">2</div>
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Pantry
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                  Track raw ingredient stock (flour, sugar, eggs…). Ingredients are automatically deducted when you log a production batch.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* Step 3 — Production */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">3</div>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5" /> Production
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                  Log a bake: choose a recipe and how many batches you made. Deducts ingredients from pantry and creates a batch record with available units to sell.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1.5">
                  Each batch tracks: units produced → units sold → units remaining → expiry.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-slate-400" />
          </div>

          {/* Step 4 — Sales */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">4</div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> Sales
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  <span className="font-medium">Sell from Batch</span> (recommended) — shows available stock per batch. Click a batch, enter qty + price, confirm.
                  Or use <span className="font-medium">Custom Sale</span> for walk-ins or items without a tracked batch.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-2">
            <ArrowDown className="h-4 w-4 text-slate-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">Also handle waste and review finances:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1.5">
                <Trash2 className="h-3 w-3" /> Waste Log
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Log expired, dropped, or overbaked items. Linked to batches for cost impact.
              </p>
            </div>
            <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3" /> Finance &amp; P&amp;L
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Revenue, production costs, waste losses, net profit — by recipe and period.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Summary: what lives where</p>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-amber-600 dark:text-amber-400">Recipes</span> — production templates with ingredients and yield</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-green-600 dark:text-green-400">Pantry</span> — raw ingredient stock; auto-deducted on each batch</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-blue-600 dark:text-blue-400">Production</span> — batch history: units produced, sold, remaining</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-emerald-600 dark:text-emerald-400">Sales</span> — every sale; batch-linked FIFO + custom free-form</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-red-600 dark:text-red-400">Waste</span> — spoilage tracking with cost impact per batch</p>
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium text-purple-600 dark:text-purple-400">P&amp;L</span> — profit margins, revenue vs cost, trend analysis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BakeryPage() {
  const [active, setActive] = useState<Tab>('overview')
  const [showEOD, setShowEOD] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const { t } = useLanguage()

  const tabs: { key: Tab; label: string; Icon: typeof ChefHat }[] = [
    { key: 'overview',   label: t('bakeryOverviewTab'),   Icon: LayoutDashboard },
    { key: 'recipes',    label: t('bakeryRecipesTab'),    Icon: ChefHat },
    { key: 'production', label: t('bakeryProductionTab'), Icon: FlaskConical },
    { key: 'sales',      label: t('bakerySalesTab'), Icon: ShoppingBag },
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

      {showHowItWorks && <BakeryHowItWorksModal onClose={() => setShowHowItWorks(false)} />}

      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <ChefHat className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('bakery')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('bakerySubtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
          >
            <Info className="h-3.5 w-3.5" /> How it works
          </button>
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
        {active === 'sales'      && <SalesTab />}
        {active === 'pantry'     && <PantryTab />}
        {active === 'waste'      && <WasteTab />}
        {active === 'schedule'   && <ScheduleTab />}
        {active === 'pnl'        && <ProfitLossTab />}
      </div>
    </div>
  )
}
