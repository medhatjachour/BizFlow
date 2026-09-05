// src/plugins/restaurant/pages/index.tsx
import { useEffect } from 'react'
import {
  UtensilsCrossed,
  Table2,
  Trash,
  CalendarDays,
  Receipt,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Package,
  TrendingUp
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

import { RestaurantProvider, useRestaurant } from '../context/RestaurantContext'
import OverviewAndKdsPage from './Kitchen/index'
import TablesTab from './tables'
import ReservationsTab from './Reservation'
import MenuTab from './menu'
import OrdersTab from './POS'
import SalesHistoryTab from './sales'
import StaffShiftsPage from './shifts'
import RestaurantInventoryPage from './inventory'
import RecipesPage from './recipes'
import KitchenWasteLogPage from './waste'
import { sounds } from './utils/sound'

type Tab =
  | 'overview'
  | 'tables'
  | 'reservations'
  | 'menu'
  | 'orders'
  | 'sales'
  | 'shifts'
  | 'inventory'
  | 'recipes'
  | 'waste'

const CONTEXT_TO_TAB: Record<string, Tab> = {
  floor: 'tables',
  pos: 'orders',
  kds: 'overview',
  sales: 'sales',
  reservations: 'reservations',
  menu: 'menu',
  inventory: 'inventory',
  recipes: 'recipes',
  shifts: 'shifts',
  waste: 'waste'
}

const TAB_TO_CONTEXT: Record<Tab, any> = {
  overview: 'kds',
  tables: 'floor',
  reservations: 'reservations',
  menu: 'menu',
  orders: 'pos',
  sales: 'sales',
  shifts: 'shifts',
  inventory: 'inventory',
  recipes: 'recipes',
  waste: 'waste'
}

function RestaurantPageContent() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const { currentView, setCurrentView, activeTable, draftItems } = useRestaurant()

  const activeTab: Tab = CONTEXT_TO_TAB[currentView] || 'overview'

  const tabs: { key: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: 'overview',     label: t('restaurantOverviewTab'),     Icon: LayoutDashboard },
    { key: 'tables',       label: t('restaurantTablesTab'),       Icon: Table2 },
    { key: 'orders',       label: t('restaurantOrdersTab'),       Icon: ClipboardList },
    { key: 'sales',        label: 'Sales & History',              Icon: TrendingUp },
    { key: 'reservations', label: t('restaurantReservationsTab'), Icon: CalendarDays },
    { key: 'menu',         label: t('restaurantMenuTab'),         Icon: BookOpen },
    { key: 'inventory',    label: t('restaurantInventoryTab'),    Icon: Package },
    { key: 'recipes',      label: t('restaurantRecipesTab'),      Icon: Receipt },
    { key: 'shifts',       label: t('restaurantShiftsTab'),       Icon: ShieldCheck },
    { key: 'waste',        label: t('restaurantWasteTab'),        Icon: Trash }
  ]

  const visibleTabs = tabs.filter((tab) => can(pluginTabCapability('restaurant', tab.key)!))

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      const fallback = visibleTabs[0]?.key ?? 'overview'
      setCurrentView(TAB_TO_CONTEXT[fallback])
    }
  }, [activeTab, visibleTabs, setCurrentView])

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 select-none">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('restaurantTitle')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('restaurantSubtitle')}
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden scrollbar-none">
          {visibleTabs.map(({ key, label, Icon }) => {
            const isActive = activeTab === key
            const isOrders = key === 'orders'

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  sounds.playBump()
                  setCurrentView(TAB_TO_CONTEXT[key])
                }}
                className={[
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap active:scale-98',
                  isActive
                    ? 'bg-white dark:bg-slate-800 border border-b-white dark:border-slate-700 dark:border-b-slate-800 text-orange-600 dark:text-orange-400 -mb-px shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>

                {isOrders && (activeTable || draftItems.length > 0) && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black uppercase ${
                      isActive
                        ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400'
                        : 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    {activeTable ? `T-${activeTable.number}` : `${draftItems.length}`}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Viewport */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview'     && can(pluginTabCapability('restaurant', 'overview')!) && <OverviewAndKdsPage onNavigate={(v) => setCurrentView(v as any)} />}
        {activeTab === 'tables'       && can(pluginTabCapability('restaurant', 'tables')!) && <TablesTab />}
        {activeTab === 'orders'       && can(pluginTabCapability('restaurant', 'orders')!) && <OrdersTab />}
        {activeTab === 'sales'        && can(pluginTabCapability('restaurant', 'sales')!) && <SalesHistoryTab />}
        {activeTab === 'reservations' && can(pluginTabCapability('restaurant', 'reservations')!) && <ReservationsTab onNavigateToFloor={() => setCurrentView('floor')} />}
        {activeTab === 'menu'         && can(pluginTabCapability('restaurant', 'menu')!) && <MenuTab />}
        {activeTab === 'inventory'    && can(pluginTabCapability('restaurant', 'inventory')!) && <RestaurantInventoryPage />}
        {activeTab === 'recipes'      && can(pluginTabCapability('restaurant', 'recipes')!) && <RecipesPage />}
        {activeTab === 'shifts'       && can(pluginTabCapability('restaurant', 'shifts')!) && <StaffShiftsPage />}
        {activeTab === 'waste'        && can(pluginTabCapability('restaurant', 'waste')!) && <KitchenWasteLogPage />}
      </div>
    </div>
  )
}

export default function RestaurantPage() {
  return (
    <RestaurantProvider>
      <RestaurantPageContent />
    </RestaurantProvider>
  )
}