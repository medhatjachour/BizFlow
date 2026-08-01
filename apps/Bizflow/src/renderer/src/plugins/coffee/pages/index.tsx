/**
 * Coffee Shop – Main Page
 * Tab-based navigation container for the entire coffee plugin.
 * Tabs: POS | Tables | Orders | Products | Inventory | Sales | Shifts
 */

import { useState } from 'react'
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

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS_DEF = [
  { id: 'pos',       labelKey: 'cfPOS',       icon: CreditCard     },
  { id: 'tables',    labelKey: 'cfTables',    icon: LayoutGrid     },
  // { id: 'orders',    labelKey: 'cfOrders',    icon: ClipboardList  },
  { id: 'products',  labelKey: 'cfProducts',  icon: Package        },
  { id: 'inventory', labelKey: 'cfInventory', icon: BoxesIcon      },
  { id: 'incoming',  labelKey: 'cfIncoming',  icon: Truck          },
  { id: 'expenses',  labelKey: 'cfExpenses',  icon: Receipt        },
  { id: 'sales',     labelKey: 'cfSales',     icon: Receipt        },
  { id: 'shifts',    labelKey: 'cfShifts',    icon: Timer          },
  { id: 'customers', labelKey: 'cfCustomers', icon: Users          },
  { id: 'reports',   labelKey: 'cfReports',   icon: BarChart3      },
  { id: 'finance',   labelKey: 'cfFinance',   icon: Wallet         }
] as const

type TabId = (typeof TABS_DEF)[number]['id']

// ── Component ────────────────────────────────────────────────────────────────
export default function CoffeePage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<TabId>('pos')

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 pt-4">
        {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS_DEF.map(({ id, labelKey, icon: Icon }) => (
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
        {activeTab === 'pos'       && <POSView      />}
        {activeTab === 'tables'    && <TablesTab    />}
        {/* {activeTab === 'orders'    && <OrdersTab    />} */}
        {activeTab === 'products'  && <ProductsTab  />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'incoming'  && <ReceiptsModule />}
        {activeTab === 'expenses'  && <ExpensesTab   />}
        {activeTab === 'sales'     && <SalesTab     />}
        {activeTab === 'shifts'    && <ShiftsTab    />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'reports'   && <ReportsTab   />}
        {activeTab === 'finance'   && <FinanceTab   />}
      </div>
    </div>
  )
}
