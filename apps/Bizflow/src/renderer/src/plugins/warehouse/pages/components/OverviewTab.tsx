import { useEffect, useState } from 'react'
import { Warehouse, Package, ArrowRightLeft, AlertTriangle, ClipboardList } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import InfoTooltip from './InfoTooltip'

interface Overview {
  totalLocations: number
  totalSKUs: number
  lowStockCount: number
  pendingTransfers: number
  activeOrders: number
  inboundPending: number
  outboundPending: number
  recentTransfers: { id: string; fromLocation: { name: string; code: string }; toLocation: { name: string; code: string }; status: string; transferDate: string; _count?: { items: number } }[]
  recentMovements?: Array<{ id: string; movementType: string; productName: string; quantity: number; unit: string; actedBy?: string | null; location?: { name: string; code: string } }>
}

type Tab = 'overview' | 'operations' | 'locations' | 'inventory' | 'transfers'

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 animate-pulse">
          <div className="h-5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 mb-3" />
              <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (!data) return null

  const stats = [
    { label: t('warehouseTotalLocations'), hint: t('warehouseOverviewInfoTotalLocations'), value: data.totalLocations, icon: <Warehouse className="w-5 h-5" />, color: 'blue', onClick: () => onNavigate('locations') },
    { label: t('warehouseTotalSKUs'), hint: t('warehouseOverviewInfoTotalSkus'), value: data.totalSKUs, icon: <Package className="w-5 h-5" />, color: 'indigo', onClick: () => onNavigate('inventory') },
    { label: t('warehouseLowStockAlerts'), hint: t('warehouseOverviewInfoLowStock'), value: data.lowStockCount, icon: <AlertTriangle className="w-5 h-5" />, color: data.lowStockCount > 0 ? 'red' : 'slate', onClick: () => onNavigate('inventory') },
    { label: t('warehousePendingTransfers'), hint: t('warehouseOverviewInfoPendingTransfers'), value: data.pendingTransfers, icon: <ArrowRightLeft className="w-5 h-5" />, color: 'amber', onClick: () => onNavigate('transfers') },
    { label: t('warehouseActiveOrders'), hint: t('warehouseOverviewInfoActiveOrders'), value: data.activeOrders, icon: <ClipboardList className="w-5 h-5" />, color: 'blue', onClick: () => onNavigate('operations') }
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
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-500 text-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('warehouseOperationsSnapshotTitle')}</h3>
            <p className="text-xs text-cyan-50 mt-1">{t('warehouseOperationsSnapshotSubtitle')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <button onClick={() => onNavigate('operations')} className="rounded-lg bg-white/15 border border-white/20 px-3 py-2 hover:bg-white/25 transition-colors">
              <div className="text-xl font-semibold">{data.activeOrders}</div>
              <div className="text-[11px] text-cyan-50">{t('warehouseActive')}</div>
            </button>
            <button onClick={() => onNavigate('operations')} className="rounded-lg bg-white/15 border border-white/20 px-3 py-2 hover:bg-white/25 transition-colors">
              <div className="text-xl font-semibold">{data.inboundPending}</div>
              <div className="text-[11px] text-cyan-50">{t('warehouseInbound')}</div>
            </button>
            <button onClick={() => onNavigate('operations')} className="rounded-lg bg-white/15 border border-white/20 px-3 py-2 hover:bg-white/25 transition-colors">
              <div className="text-xl font-semibold">{data.outboundPending}</div>
              <div className="text-[11px] text-cyan-50">{t('warehouseOutbound')}</div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(s => (
          <button key={s.label} onClick={s.onClick} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-sm transition-all group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[s.color]}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1.5">{s.label} <InfoTooltip text={s.hint} /></div>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
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
                  <span className="text-slate-500 dark:text-slate-400">{tr.fromLocation.name}</span>
                  <span className="text-slate-400">→</span>
                  <span>{tr.toLocation.name}</span>
                </div>
                <div className="text-xs text-slate-400">{tr._count?.items ?? 0} {t('warehouseItems')} · {new Date(tr.transferDate).toLocaleDateString()}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[tr.status]}`}>{tr.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('warehouseLatestActivity')}</h3>
          <button onClick={() => onNavigate('operations')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{t('warehouseOpenOperations')}</button>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {(data.recentMovements ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">{t('warehouseNoActivityYet')}</div>
          ) : (data.recentMovements ?? []).map(mv => (
            <div key={mv.id} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-800 dark:text-slate-100">{mv.productName}</div>
                <div className="text-slate-500">{mv.quantity > 0 ? '+' : ''}{mv.quantity} {mv.unit}</div>
              </div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{mv.movementType} · {mv.location?.name || t('warehouseNotAvailable')} · {mv.actedBy || t('warehouseSystem')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
