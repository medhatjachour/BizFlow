/**
 * Coffee Shop – Main Page
 * Tab-based navigation container for the entire coffee plugin.
 * Tabs: POS | Tables | Orders | Products | Inventory | Sales | Shifts
 */

import { useEffect, useState } from 'react'
import {
  CreditCard, LayoutGrid, Package,
  BoxesIcon, Receipt, Timer,  Users, BarChart3, Wallet, Truck
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import TablesTab     from './tables/TablesTab'
// import OrdersTab     from './tabs/OrdersTab'
import ProductsTab   from './product/ProductsTab'
import InventoryTab  from './inventory/InventoryTab'
import SalesTab      from './sales/SalesTab'
import ShiftsTab     from './shifts/ShiftsTab'
import CustomersTab  from './customers/CustomersTab'
import ReportsTab    from './reports/ReportsTab'
import FinanceTab    from './finance/FinanceTab'
import ReceiptsModule from './receipts/ReceiptsModule'
import ExpensesTab   from './expenses/ExpensesTab'
import POSView from './pos/POSView'
import { useAuth } from '@renderer/contexts/AuthContext'
import type { Capability } from '../../../../../shared/permissions'

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS_DEF = [
  { id: 'pos',       labelKey: 'cfPOS',       icon: CreditCard, capability: 'coffee_pos'       },
  { id: 'tables',    labelKey: 'cfTables',    icon: LayoutGrid, capability: 'coffee_tables'    },
  // { id: 'orders',    labelKey: 'cfOrders',    icon: ClipboardList  },
  { id: 'products',  labelKey: 'cfProducts',  icon: Package, capability: 'coffee_products'  },
  { id: 'inventory', labelKey: 'cfInventory', icon: BoxesIcon, capability: 'coffee_inventory' },
  { id: 'incoming',  labelKey: 'cfIncoming',  icon: Truck, capability: 'coffee_incoming'    },
  { id: 'expenses',  labelKey: 'cfExpenses',  icon: Receipt, capability: 'coffee_expenses'  },
  { id: 'sales',     labelKey: 'cfSales',     icon: Receipt, capability: 'coffee_sales'     },
  { id: 'shifts',    labelKey: 'cfShifts',    icon: Timer, capability: 'coffee_shifts'      },
  { id: 'customers', labelKey: 'cfCustomers', icon: Users, capability: 'coffee_customers'   },
  { id: 'reports',   labelKey: 'cfReports',   icon: BarChart3, capability: 'coffee_reports'  },
  { id: 'finance',   labelKey: 'cfFinance',   icon: Wallet, capability: 'coffee_finance'    }
] as const

type TabId = (typeof TABS_DEF)[number]['id']

// ── Component ────────────────────────────────────────────────────────────────
export default function CoffeePage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const hasPluginAccess = can('access_coffee')
  const visibleTabs = hasPluginAccess
    ? TABS_DEF.filter(tab => can(tab.capability as Capability))
    : []
  const [activeTab, setActiveTab] = useState<TabId>('pos')

  useEffect(() => {
    if (!visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'pos')
    }
  }, [activeTab, visibleTabs])

  if (!hasPluginAccess) {
    return <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">You do not have access to this plugin.</div>
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 pt-4">
        {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {visibleTabs.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors
                ${activeTab === id
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {t(labelKey as any)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'pos'       && can('coffee_pos')       && <POSView      />}
        {activeTab === 'tables'    && can('coffee_tables')    && <TablesTab    />}
        {/* {activeTab === 'orders'    && <OrdersTab    />} */}
        {activeTab === 'products'  && can('coffee_products')  && <ProductsTab  />}
        {activeTab === 'inventory' && can('coffee_inventory') && <InventoryTab />}
        {activeTab === 'incoming'  && can('coffee_incoming')  && <ReceiptsModule />}
        {activeTab === 'expenses'  && can('coffee_expenses')  && <ExpensesTab   />}
        {activeTab === 'sales'     && can('coffee_sales')     && <SalesTab     />}
        {activeTab === 'shifts'    && can('coffee_shifts')    && <ShiftsTab    />}
        {activeTab === 'customers' && can('coffee_customers') && <CustomersTab />}
        {activeTab === 'reports'   && can('coffee_reports')   && <ReportsTab   />}
        {activeTab === 'finance'   && can('coffee_finance')   && <FinanceTab   />}
      </div>
    </div>
  )
}
