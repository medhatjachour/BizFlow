import { useEffect, useState, type ReactNode } from 'react'
import { Warehouse, Package, MapPin, ArrowRightLeft, ClipboardList, Info, X, ArrowRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import OverviewTab from './overview'
import LocationsTab from './components/LocationsTab'
import InventoryTab from './components/InventoryTab'
import TransfersTab from './components/TransfersTab'
import OperationsTab from './Operations'
import InfoTooltip from './components/InfoTooltip'
import { useAuth } from '@renderer/contexts/AuthContext'
import { pluginTabCapability } from '../../../../../shared/permissions'

type Tab = 'overview' | 'operations' | 'locations' | 'inventory' | 'transfers'

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const { t } = useLanguage()
  const { can } = useAuth()

  const TAB_INFO: Record<Tab, string> = {
    overview: t('warehouseTabInfoOverview'),
    operations: t('warehouseTabInfoOperations'),
    locations: t('warehouseTabInfoLocations'),
    inventory: t('warehouseTabInfoInventory'),
    transfers: t('warehouseTabInfoTransfers')
  }

  const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'overview', label: t('warehouseOverviewTab'), icon: <Warehouse className="w-4 h-4" /> },
    { id: 'operations', label: t('warehouseOperationsTab'), icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'locations', label: t('warehouseLocationsTab'), icon: <MapPin className="w-4 h-4" /> },
    { id: 'inventory', label: t('warehouseInventoryTab'), icon: <Package className="w-4 h-4" /> },
    { id: 'transfers', label: t('warehouseTransfersTab'), icon: <ArrowRightLeft className="w-4 h-4" /> }
  ]

  const visibleTabs = TABS.filter(tab => can(pluginTabCapability('warehouse', tab.id)!))
  useEffect(() => {
    if (!visibleTabs.some(tab => tab.id === activeTab)) setActiveTab(visibleTabs[0]?.id ?? 'overview')
  }, [activeTab, visibleTabs])

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="px-6 pt-5 pb-4 flex-shrink-0">
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-500 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/25">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">{t('warehouseTitle')}</h1>
                  <p className="text-xs text-cyan-50">{t('warehouseSubtitle')}</p>
                </div>
              </div>

              <button
                onClick={() => setShowHowItWorks(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-white/30 bg-white/10 hover:bg-white/20 transition-colors"
                title={t('warehouseHowItWorksTitle')}
              >
                <Info className="w-3.5 h-3.5" /> {t('howItWorks')}
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-1.5 flex-wrap">
              {visibleTabs.map(tab => (
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
                  <InfoTooltip text={TAB_INFO[tab.id]} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}

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

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('warehouseHowItWorksTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('warehouseHowItWorksSubtitle')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-900/20">
            <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-1">{t('warehouseHowStep1Title')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('warehouseHowStep1Desc')}</p>
          </div>

          <div className="flex items-center justify-center text-slate-300 dark:text-slate-600">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-900/20">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('warehouseHowStep2Title')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('warehouseHowStep2Desc')}</p>
          </div>

          <div className="flex items-center justify-center text-slate-300 dark:text-slate-600">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-900/20">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">{t('warehouseHowStep3Title')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('warehouseHowStep3Desc')}</p>
          </div>

          <div className="rounded-xl border border-cyan-200/70 dark:border-cyan-800/70 bg-cyan-50/70 dark:bg-cyan-900/15 p-4">
            <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-1">{t('warehouseHowSummaryTitle')}</p>
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <p><span className="font-medium">{t('warehouseHowSummaryOverviewLabel')}</span> {t('warehouseHowSummaryOverviewDesc')}</p>
              <p><span className="font-medium">{t('warehouseHowSummaryOperationsLabel')}</span> {t('warehouseHowSummaryOperationsDesc')}</p>
              <p><span className="font-medium">{t('warehouseHowSummaryInventoryLabel')}</span> {t('warehouseHowSummaryInventoryDesc')}</p>
              <p><span className="font-medium">{t('warehouseHowSummaryTransfersLabel')}</span> {t('warehouseHowSummaryTransfersDesc')}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium">{t('warehouseClose')}</button>
        </div>
      </div>
    </div>
  )
}
