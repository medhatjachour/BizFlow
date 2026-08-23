/**
 * Pharmacy plugin — main page.
 * Tabbed shell: Dashboard · Sell (POS) · Products · Inventory · Sales · Suppliers · Purchase Orders · Reports
 */
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, ShoppingCart, Pill, PackageSearch,
  Receipt, Truck, ClipboardList, BarChart3, Users
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import PharmacyDashboard from './components/analytics/PharmacyDashboard'
import PharmacyPOS from './PharmacyPOS'
import PharmacySales from './sales'
import PharmacyCustomers from './components/PharmacyCustomers'
import PharmacySuppliers from './components/purchasing/PharmacySuppliers'
import PharmacyPurchaseOrders from './components/purchasing/PharmacyPurchaseOrders'
import PharmacyReports from './components/analytics/PharmacyReports'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'
import PharmacyProducts from './products'
import PharmacyInventory from './inventory'

type Tab = 'dashboard' | 'pos' | 'products' | 'inventory' | 'sales' | 'customers' | 'suppliers' | 'orders' | 'reports'

export default function PharmacyPage() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('dashboard')

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'dashboard', label: t('phDashboard') || 'Dashboard', icon: LayoutDashboard },
    { key: 'pos', label: t('phSell') || 'Sell', icon: ShoppingCart },
    { key: 'products', label: t('phProducts') || 'Products', icon: Pill },
    { key: 'inventory', label: t('phInventory') || 'Inventory', icon: PackageSearch },
    { key: 'sales', label: t('phSales') || 'Sales', icon: Receipt },
    { key: 'customers', label: t('phCustomers') || 'Customers', icon: Users },
    { key: 'suppliers', label: t('phSuppliers') || 'Suppliers', icon: Truck },
    { key: 'orders', label: t('phPurchaseOrders') || 'Purchase Orders', icon: ClipboardList },
    { key: 'reports', label: t('phReports') || 'Reports', icon: BarChart3 },
  ]

  const visibleTabs = tabs.filter(item => can(pluginTabCapability('pharmacy', item.key)!))
  useEffect(() => {
    if (!visibleTabs.some(item => item.key === tab)) setTab(visibleTabs[0]?.key ?? 'dashboard')
  }, [tab, visibleTabs])

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Pill className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t('pharmacy') || 'Pharmacy'}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('phSubtitle') || 'Sales, batches & expiry management'}</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto -mb-px">
          {visibleTabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === key
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && can('access_pharmacy') && <PharmacyDashboard onNavigate={(t) => setTab(t as Tab)} />}
        {tab === 'pos' && can('access_pharmacy') && <PharmacyPOS />}
        {tab === 'products' && can('manage_inventory') && <PharmacyProducts />}
        {tab === 'inventory' && can('manage_inventory') && <PharmacyInventory />}
        {tab === 'sales' && can('access_pharmacy') && <PharmacySales />}
        {tab === 'customers' && can('manage_customers') && <PharmacyCustomers />}
        {tab === 'suppliers' && can('manage_purchasing') && <PharmacySuppliers />}
        {tab === 'orders' && can('manage_purchasing') && <PharmacyPurchaseOrders />}
        {tab === 'reports' && can('view_finance') && <PharmacyReports />}
      </div>
    </div>
  )
}
