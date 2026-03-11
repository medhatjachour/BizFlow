import { useState } from 'react'
import { Warehouse, Package, MapPin, ArrowRightLeft } from 'lucide-react'
import OverviewTab from './components/OverviewTab'
import LocationsTab from './components/LocationsTab'
import InventoryTab from './components/InventoryTab'
import TransfersTab from './components/TransfersTab'

type Tab = 'overview' | 'locations' | 'inventory' | 'transfers'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Warehouse className="w-4 h-4" /> },
  { id: 'locations', label: 'Locations', icon: <MapPin className="w-4 h-4" /> },
  { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
  { id: 'transfers', label: 'Transfers', icon: <ArrowRightLeft className="w-4 h-4" /> }
]

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Warehouse className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Warehouse</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500">Manage stock locations and transfers</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 px-6 py-3 border-b border-slate-100 dark:border-slate-700/50 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'transfers' && <TransfersTab />}
      </div>
    </div>
  )
}
