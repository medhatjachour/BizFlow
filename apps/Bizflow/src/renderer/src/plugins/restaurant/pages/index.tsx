import { useEffect, useState } from 'react'
import { UtensilsCrossed, Table2, CalendarDays, BookOpen, ClipboardList, LayoutDashboard } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import OverviewTab  from './components/OverviewTab'
import TablesTab    from './tables'
import ReservationsTab from './components/ReservationsTab'
import MenuTab      from './components/MenuTab'
import OrdersTab    from './components/OrdersTab'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

type Tab = 'overview' | 'tables' | 'reservations' | 'menu' | 'orders'

export default function RestaurantPage() {
  const [active, setActive] = useState<Tab>('overview')
  const { t } = useLanguage()
  const { can } = useAuth()

  const tabs: { key: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: 'overview',     label: t('restaurantOverviewTab'),     Icon: LayoutDashboard },
    { key: 'tables',       label: t('restaurantTablesTab'),       Icon: Table2 },
    { key: 'reservations', label: t('restaurantReservationsTab'), Icon: CalendarDays },
    { key: 'menu',         label: t('restaurantMenuTab'),         Icon: BookOpen },
    { key: 'orders',       label: t('restaurantOrdersTab'),       Icon: ClipboardList }
  ]

  const visibleTabs = tabs.filter(tab => can(pluginTabCapability('restaurant', tab.key)!))
  useEffect(() => {
    if (!visibleTabs.some(tab => tab.key === active)) setActive(visibleTabs[0]?.key ?? 'overview')
  }, [active, visibleTabs])

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <UtensilsCrossed className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('restaurantTitle')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('restaurantSubtitle')}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden">
          {visibleTabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
                active === key
                  ? 'bg-white dark:bg-slate-800 border border-b-white dark:border-slate-700 dark:border-b-slate-800 text-orange-600 dark:text-orange-400 -mb-px'
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
        {active === 'overview'     && <OverviewTab     onNavigate={setActive} />}
        {active === 'tables'       && <TablesTab />}
        {active === 'reservations' && <ReservationsTab />}
        {active === 'menu'         && <MenuTab />}
        {active === 'orders'       && <OrdersTab />}
      </div>
    </div>
  )
}
