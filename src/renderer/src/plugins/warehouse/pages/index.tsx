import { useState } from 'react'
import { Warehouse, Package, MapPin, ArrowRightLeft, ClipboardList } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import OverviewTab from './components/OverviewTab'
import LocationsTab from './components/LocationsTab'
import InventoryTab from './components/InventoryTab'
import TransfersTab from './components/TransfersTab'
import OperationsTab from './components/OperationsTab'

type Tab = 'overview' | 'operations' | 'locations' | 'inventory' | 'transfers'

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const { t } = useLanguage()

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('warehouseOverviewTab'), icon: <Warehouse className="w-4 h-4" /> },
    { id: 'operations', label: 'Operations', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'locations', label: t('warehouseLocationsTab'), icon: <MapPin className="w-4 h-4" /> },
    { id: 'inventory', label: t('warehouseInventoryTab'), icon: <Package className="w-4 h-4" /> },
    { id: 'transfers', label: t('warehouseTransfersTab'), icon: <ArrowRightLeft className="w-4 h-4" /> }
  ]

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="px-6 pt-5 pb-4 flex-shrink-0">
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-500 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/25">
                <Warehouse className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{t('warehouseTitle')}</h1>
                <p className="text-xs text-cyan-50">{t('warehouseSubtitle')}</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-1.5 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 ring-1 ring-cyan-200 dark:ring-cyan-700 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
        {activeTab === 'operations' && <OperationsTab />}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'transfers' && <TransfersTab />}
      </div>
    </div>
  )
}
