/**
 * WarehouseDashboardSection — comprehensive multi-location stock analytics.
 *
 * Concurrent IPC (Promise.allSettled) + Web Worker for:
 *   COMPUTE_STOCK_VALUE → total inventory value, utilization %, top locations
 *   COMPUTE_TRENDS      → 7-day transfer volume sparkline
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Warehouse, MapPin, ArrowRightLeft, AlertTriangle, Boxes,
  TrendingUp, TrendingDown, BarChart3, Minus, Package,
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { StockValueResult, TrendsResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }

interface WarehouseData {
  locations: any[]
  todayTransfers: any[]
  weekTransfers: any[]
  stockItems: any[]
  criticalItems: any[]
}

const EMPTY: WarehouseData = {
  locations: [], todayTransfers: [], weekTransfers: [],
  stockItems: [], criticalItems: [],
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon, label, value, sub, color, trend,
}: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; color: string; trend?: 'up' | 'down' | 'flat'
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-1.5 rounded-lg ${color}`}><Icon size={15} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    <div className="flex items-center gap-1 mt-1">
      {trend === 'up'   && <TrendingUp   size={12} className="text-emerald-500" />}
      {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
      {trend === 'flat' && <Minus        size={12} className="text-slate-400" />}
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

export default function WarehouseDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { compute } = useDashboardWorker()

  const [loading, setLoading]       = useState(true)
  const [raw, setRaw]               = useState<WarehouseData>(EMPTY)
  const [stockVal, setStockVal]     = useState<StockValueResult | null>(null)
  const [transferTrend, setTransferTrend] = useState<TrendsResult | null>(null)

  useEffect(() => { load() }, [refreshSignal])

  const load = async () => {
    try {
      setLoading(true)
      const api = (globalThis as any).api?.warehouse
      if (!api) { setLoading(false); return }

      const today    = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
      const weekAgo  = new Date(today); weekAgo.setDate(today.getDate() - 7)

      // All IPC calls in parallel ────────────────────────────────────────────
      const [locationsR, todayTransR, weekTransR, stockR, criticalR] =
        await Promise.allSettled([
          api.getLocations?.(),
          api.getTransfers?.({ startDate: today.toISOString(),   endDate: tomorrow.toISOString() }),
          api.getTransfers?.({ startDate: weekAgo.toISOString(), endDate: tomorrow.toISOString() }),
          api.getAllStockItems?.(),
          api.getCriticalStockItems?.(),
        ])

      const locations      = locationsR.status    === 'fulfilled' ? (locationsR.value    || []) : []
      const todayTransfers = todayTransR.status   === 'fulfilled' ? (todayTransR.value   || []) : []
      const weekTransfers  = weekTransR.status    === 'fulfilled' ? (weekTransR.value    || []) : []
      const stockItems     = stockR.status        === 'fulfilled' ? (stockR.value        || []) : []
      const criticalItems  = criticalR.status     === 'fulfilled' ? (criticalR.value     || []) : []

      const data: WarehouseData = { locations, todayTransfers, weekTransfers, stockItems, criticalItems }
      setRaw(data)

      // Build daily transfer bucket for trend ──────────────────────────────
      const dailyTransfers = buildDailyBuckets(weekTransfers, 7)

      // Worker computations in parallel ────────────────────────────────────
      const [svResult, trendResult] = await Promise.all([
        stockItems.length
          ? compute<StockValueResult>('COMPUTE_STOCK_VALUE', {
              stocks: stockItems.map((s: any) => ({
                qty:        s.quantity  || s.qty  || 0,
                unitCost:   s.unitCost  || s.cost || 0,
                capacity:   s.capacity  || 0,
                locationId: s.locationId || '',
                locationName: s.locationName || s.location?.name || '',
              })),
            })
          : Promise.resolve(null),
        compute<TrendsResult>('COMPUTE_TRENDS', {
          values: dailyTransfers.map(d => d.count),
          labels: dailyTransfers.map(d => d.label),
        }),
      ])

      setStockVal(svResult)
      setTransferTrend(trendResult)
    } catch (err) {
      logger.error('WarehouseDashboardSection load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const buildDailyBuckets = (transfers: any[], days: number) => {
    const result: { label: string; count: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d    = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const count = transfers.filter((tr: any) => {
        const td = new Date(tr.createdAt || tr.date || 0)
        return td >= d && td < next
      }).length
      result.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), count })
    }
    return result
  }

  const trendData = useMemo(() =>
    transferTrend ? transferTrend.movingAvg.map((v, i) => ({ v: +v.toFixed(1), label: transferTrend.labels[i] || `D${i+1}` })) : []
  , [transferTrend])

  const pendingCount   = raw.todayTransfers.filter((t: any) => t.status === 'pending').length
  const inTransitCount = raw.todayTransfers.filter((t: any) => t.status === 'in_transit').length
  const doneCount      = raw.todayTransfers.filter((t: any) => t.status === 'completed').length

  const fmtCurrency = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
    return `$${n.toFixed(0)}`
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg" />
          <div className="space-y-1">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-24 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl h-48 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Plugin header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Warehouse size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('warehouse') || 'Warehouse'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('warehouseOverview') || 'Multi-location stock overview'}</p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={MapPin}        label="Locations"          value={raw.locations.length}
          sub={`${raw.locations.filter((l: any) => l.hasLowStock).length} low stock`}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" trend="flat" />
        <StatCard icon={Boxes}         label="Stock Value"        value={fmtCurrency(stockVal?.totalValue ?? 0)}
          sub={`${raw.stockItems.length} SKUs`}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" trend="flat" />
        <StatCard icon={TrendingUp}    label="Utilization"        value={`${stockVal?.utilization.toFixed(0) ?? 0}%`}
          sub={stockVal ? `${stockVal.totalQty} / ${stockVal.totalCapacity} units` : ''}
          color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
          trend={(stockVal?.utilization ?? 0) > 80 ? 'up' : 'flat'} />
        <StatCard icon={ArrowRightLeft} label="Transfers Today"   value={raw.todayTransfers.length}
          sub={`${pendingCount} pending`}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          trend={pendingCount > 0 ? 'up' : 'flat'} />
        <StatCard icon={AlertTriangle} label="Critical Items"     value={raw.criticalItems.length}
          sub={raw.criticalItems.length > 0 ? 'Need restock' : 'All OK'}
          color="bg-red-100 dark:bg-red-900/30 text-red-600"
          trend={raw.criticalItems.length > 0 ? 'down' : 'flat'} />
      </div>

      {/* ── Row 2: Trend + Location utilization + Transfer pipeline ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 7-day transfer trend sparkline */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <BarChart3 size={16} /> 7-Day Transfers
            </h3>
            {transferTrend && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                transferTrend.trend === 'up'   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                transferTrend.trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {transferTrend.change >= 0 ? '+' : ''}{transferTrend.change.toFixed(0)}%
              </span>
            )}
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="warehouseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v} transfers`, '']} contentStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} fill="url(#warehouseGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[100px] flex items-center justify-center text-xs text-slate-400">No transfer history</div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            <div><span className="block font-semibold text-slate-800 dark:text-white">{transferTrend?.avg.toFixed(1) ?? '—'}</span>Avg/day</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{transferTrend?.max ?? '—'}</span>Peak</div>
            <div><span className="block font-semibold text-slate-800 dark:text-white">{doneCount}</span>Done today</div>
          </div>
        </div>

        {/* Location utilization bars */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <MapPin size={16} /> Location Utilization
          </h3>
          {stockVal && stockVal.topLocations.length > 0 ? (
            <div className="space-y-2.5">
              {stockVal.topLocations.slice(0, 5).map((loc, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{loc.name || `Location ${i+1}`}</span>
                    <span className="font-medium text-slate-800 dark:text-white">{loc.utilization.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-1.5 rounded-full ${loc.utilization > 90 ? 'bg-red-500' : loc.utilization > 70 ? 'bg-amber-400' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, loc.utilization)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtCurrency(loc.value)} · {loc.qty} units</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <MapPin size={24} className="opacity-30" />
              No location data yet
            </div>
          )}
        </div>

        {/* Transfer pipeline */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <ArrowRightLeft size={16} /> Today's Transfers
          </h3>
          {/* Pipeline status counts */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Pending',    count: pendingCount,   color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' },
              { label: 'In Transit', count: inTransitCount, color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
              { label: 'Done',       count: doneCount,      color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-lg p-2 text-center ${color}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs">{label}</p>
              </div>
            ))}
          </div>
          {/* Recent transfers list */}
          {raw.todayTransfers.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {raw.todayTransfers.slice(0, 5).map((tr: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    tr.status === 'completed'  ? 'bg-emerald-500' :
                    tr.status === 'in_transit' ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'
                  }`} />
                  <span className="text-slate-600 dark:text-slate-400 truncate flex-1">
                    {tr.fromLocationName || tr.from || '?'} → {tr.toLocationName || tr.to || '?'}
                  </span>
                  <span className="text-slate-500 flex-shrink-0">{tr.quantity || 0} u</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">No transfers today</p>
          )}
        </div>
      </div>

      {/* ── Row 3: Critical items + Quick links ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Critical / zero-stock items */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <AlertTriangle size={16} /> Critical Stock Items
          </h3>
          {raw.criticalItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {raw.criticalItems.slice(0, 8).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                  <Package size={14} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{item.name || item.sku}</p>
                    <p className="text-xs text-red-600">{item.quantity ?? item.qty ?? 0} left · {item.locationName || item.location?.name || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-emerald-500 text-xs gap-1">
              <Boxes size={20} />
              No critical stock items
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { tab: 'locations', icon: MapPin,        label: 'Locations',      sub: 'Manage warehouse slots' },
            { tab: 'stock',     icon: Boxes,          label: 'Stock Levels',   sub: 'Per-location inventory' },
            { tab: 'transfers', icon: ArrowRightLeft, label: 'Transfers',      sub: 'Move stock between sites' },
            { tab: 'reports',   icon: BarChart3,      label: 'Reports',        sub: 'Value & utilization' },
          ].map(({ tab, icon: Icon, label, sub }) => (
            <button
              key={tab}
              onClick={() => navigate(`/warehouse?tab=${tab}`)}
              className="bg-white dark:bg-slate-800 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700 text-left hover:border-blue-400 transition-colors group flex items-start gap-3"
            >
              <Icon size={15} className="text-blue-600 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-xs">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
