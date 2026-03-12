import { useEffect, useState } from 'react'
import { Warehouse, Package, ArrowRightLeft, AlertTriangle, RefreshCw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Overview {
  totalLocations: number
  totalSkus: number
  lowStockCount: number
  pendingTransfers: number
  recentTransfers: { id: string; fromLocation: string; toLocation: string; status: string; transferDate: string; itemCount: number }[]
}

type Tab = 'overview' | 'locations' | 'inventory' | 'transfers'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
}

export default function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  const load = async () => {
    setLoading(true)
    try { setData(await window.api.warehouse.getOverview()) }
    catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
  if (!data) return null

  const stats = [
    { label: t('warehouseTotalLocations'), value: data.totalLocations, icon: <Warehouse className="w-5 h-5" />, color: 'blue', onClick: () => onNavigate('locations') },
    { label: t('warehouseTotalSKUs'), value: data.totalSkus, icon: <Package className="w-5 h-5" />, color: 'indigo', onClick: () => onNavigate('inventory') },
    { label: t('warehouseLowStockAlerts'), value: data.lowStockCount, icon: <AlertTriangle className="w-5 h-5" />, color: data.lowStockCount > 0 ? 'red' : 'slate', onClick: () => onNavigate('inventory') },
    { label: t('warehousePendingTransfers'), value: data.pendingTransfers, icon: <ArrowRightLeft className="w-5 h-5" />, color: 'amber', onClick: () => onNavigate('transfers') }
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(s => (
          <button key={s.label} onClick={s.onClick} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-blue-300 dark:hover:border-blue-600 transition-colors group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[s.color]}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('warehouseRecentTransfers')}</h3>
          <button onClick={() => onNavigate('transfers')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{t('warehouseViewAll')}</button>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {data.recentTransfers.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">{t('warehouseNoTransfersYet')}</div>
          ) : data.recentTransfers.map(tr => (
            <div key={tr.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <ArrowRightLeft className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">{tr.fromLocation}</span>
                  <span className="text-slate-400">→</span>
                  <span>{tr.toLocation}</span>
                </div>
                <div className="text-xs text-slate-400">{tr.itemCount} {tr.itemCount !== 1 ? t('warehouseLocationsCountPlural') : t('warehouseLocationsCount')} · {new Date(tr.transferDate).toLocaleDateString()}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[tr.status]}`}>{tr.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
