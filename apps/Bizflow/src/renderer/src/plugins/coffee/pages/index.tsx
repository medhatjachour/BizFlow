/**
 * Coffee Shop – Main Page
 * Tab-based navigation container for the entire coffee plugin.
 * Tabs: POS | Tables | Orders | Products | Inventory | Sales | Shifts
 */

import { useState } from 'react'
import {
  CreditCard, LayoutGrid, ClipboardList, Package,
  BoxesIcon, Receipt, Timer, Coffee, Users, BarChart3, Wallet, Truck
} from 'lucide-react'
import POSView       from './components/POSView'
import TablesTab     from './components/TablesTab'
import OrdersTab     from './components/OrdersTab'
import ProductsTab   from './product/ProductsTab'
import InventoryTab  from './components/InventoryTab'
import SalesTab      from './components/SalesTab'
import ShiftsTab     from './components/ShiftsTab'
import CustomersTab  from './components/CustomersTab'
import ReportsTab    from './components/ReportsTab'
import FinanceTab    from './components/FinanceTab'
import IncomingReceiptsTab from './components/IncomingReceiptsTab'
import ExpensesTab   from './components/ExpensesTab'

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'pos',       label: 'POS',       icon: CreditCard     },
  { id: 'tables',    label: 'Tables',    icon: LayoutGrid     },
  { id: 'orders',    label: 'Orders',    icon: ClipboardList  },
  { id: 'products',  label: 'Products',  icon: Package        },
  { id: 'inventory', label: 'Inventory', icon: BoxesIcon      },
  { id: 'incoming',  label: 'Incoming',  icon: Truck          },
  { id: 'expenses',  label: 'Expenses',  icon: Receipt        },
  { id: 'sales',     label: 'Sales',     icon: Receipt        },
  { id: 'shifts',    label: 'Shifts',    icon: Timer          },
  { id: 'customers', label: 'Customers', icon: Users          },
  { id: 'reports',   label: 'Reports',   icon: BarChart3      },
  { id: 'finance',   label: 'Finance',   icon: Wallet         }
] as const

type TabId = (typeof TABS)[number]['id']

// ── Component ────────────────────────────────────────────────────────────────
export default function CoffeePage() {
  const [activeTab, setActiveTab] = useState<TabId>('pos')

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Coffee Shop</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">POS · Tables · Orders · Inventory · Shifts</p>
          </div>
        </div>

        {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => (
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
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'pos'       && <POSView      />}
        {activeTab === 'tables'    && <TablesTab    />}
        {activeTab === 'orders'    && <OrdersTab    />}
        {activeTab === 'products'  && <ProductsTab  />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'incoming'  && <IncomingReceiptsTab />}
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
