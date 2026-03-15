/**
 * RestaurantDashboardSection — comprehensive service & floor analytics.
 *
 * Concurrent IPC (Promise.allSettled) + Web Worker for:
 *   COMPUTE_HEATMAP       → hourly order distribution (peak hours)
 *   COMPUTE_TABLE_METRICS → avg table turnover, avg order value, completion rate
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed, Table2, CalendarClock, ChefHat, TrendingUp, TrendingDown,
  Clock, Users, DollarSign, Minus, BarChart3,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { HeatmapResult, TableMetricsResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }

interface RestaurantData {
  tables: any[]
  reservations: any[]
  activeOrders: any[]
  allOrdersToday: any[]
  revenueToday: number
}

const EMPTY: RestaurantData = {
  tables: [], reservations: [], activeOrders: [], allOrdersToday: [], revenueToday: 0,
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

// Status colour for tables
const TABLE_COLORS: Record<string, string> = {
  occupied:  'bg-rose-500',
  reserved:  'bg-amber-400',
  available: 'bg-emerald-500',
  dirty:     'bg-slate-400',
}

// Colour palette for hour-bar chart
const HOUR_COLORS = ['#fb7185', '#f43f5e', '#e11d48']

// ─────────────────────────────────────────────────────────────────────────────

export default function RestaurantDashboardSection({ refreshSignal }: Props) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { compute } = useDashboardWorker()

  const [loading, setLoading] = useState(true)
  const [raw, setRaw] = useState<RestaurantData>(EMPTY)
  const [heatmap, setHeatmap]   = useState<HeatmapResult | null>(null)
  const [metrics, setMetrics]   = useState<TableMetricsResult | null>(null)

  useEffect(() => { load() }, [refreshSignal])

  const load = async () => {
    try {
      setLoading(true)
      const api = (globalThis as any).api?.restaurant
      if (!api) { setLoading(false); return }

      const today    = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

      // All IPC calls in parallel ────────────────────────────────────────────
      const [tablesR, reservationsR, activeOrdersR, allOrdersR, revenueR] =
        await Promise.allSettled([
          api.getTables?.(),
          api.getReservations?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
          api.getActiveOrders?.(),
          api.getOrders?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
          api.getDailyRevenue?.({ date: today.toISOString() }),
        ])

      const tables       = tablesR.status       === 'fulfilled' ? (tablesR.value       || []) : []
      const reservations = reservationsR.status === 'fulfilled' ? (reservationsR.value || []) : []
      const activeOrders = activeOrdersR.status === 'fulfilled' ? (activeOrdersR.value || []) : []
      const allOrders    = allOrdersR.status    === 'fulfilled' ? (allOrdersR.value    || []) : []
      const revenueToday = revenueR.status      === 'fulfilled' ? (revenueR.value?.total ?? revenueR.value ?? 0) : 0

      const data: RestaurantData = { tables, reservations, activeOrders, allOrdersToday: allOrders, revenueToday }
      setRaw(data)

      // Worker computations in parallel ────────────────────────────────────
      const orderTimestamps = allOrders.map((o: any) => o.createdAt || o.startTime).filter(Boolean)

      const [heatmapResult, metricsResult] = await Promise.all([
        orderTimestamps.length
          ? compute<HeatmapResult>('COMPUTE_HEATMAP', { timestamps: orderTimestamps })
          : Promise.resolve(null),
        allOrders.length
          ? compute<TableMetricsResult>('COMPUTE_TABLE_METRICS', {
              orders: allOrders.map((o: any) => ({
                startTime: o.createdAt || o.startTime,
                endTime:   o.closedAt  || o.endTime,
                total:     o.total     || o.amount || 0,
                tableId:   o.tableId   || o.table?.id,
              })),
            })
          : Promise.resolve(null),
      ])

      setHeatmap(heatmapResult)
      setMetrics(metricsResult)
    } catch (err) {
      logger.error('RestaurantDashboardSection load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build peak-hour bar data from heatmap (only show business hours 6-23)
  const hourBarData = useMemo(() => {
    if (!heatmap) return []
    return heatmap.hourCounts.slice(6, 24).map((count, i) => ({
      hour: `${i + 6}h`,
      count,
      peak: (i + 6) === heatmap.peakHour,
    }))
  }, [heatmap])

  const occupiedCount  = raw.tables.filter((t: any) => t.status === 'occupied').length
  const reservedCount  = raw.tables.filter((t: any) => t.status === 'reserved').length
  const availableCount = raw.tables.filter((t: any) => t.status === 'available').length

  // Format time in minutes → "Xm" or "Xh Ym"
  const fmtMin = (min: number) => {
    if (!min || min <= 0) return '—'
    if (min < 60) return `${Math.round(min)}m`
    return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 bg-rose-100 dark:bg-rose-900/30 rounded-lg" />
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
        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
          <UtensilsCrossed size={20} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('restaurant') || 'Restaurant'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('restaurantOverview') || "Today's service overview"}</p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Table2}       label="Tables Occupied"  value={`${occupiedCount}/${raw.tables.length}`}
          sub={`${availableCount} free`}
          color="bg-rose-100 dark:bg-rose-900/30 text-rose-600"
          trend={occupiedCount > raw.tables.length * 0.7 ? 'up' : 'flat'} />
        <StatCard icon={DollarSign}   label="Revenue Today"    value={`$${Number(raw.revenueToday).toFixed(0)}`}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" trend="up" />
        <StatCard icon={ChefHat}      label="Active Orders"    value={raw.activeOrders.length}
          sub={`${raw.activeOrders.filter((o: any) => o.status === 'pending').length} pending`}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          trend={raw.activeOrders.length > 0 ? 'up' : 'flat'} />
        <StatCard icon={CalendarClock} label="Today's Reservations" value={raw.reservations.length}
          color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600" trend="flat" />
        <StatCard icon={Clock}         label="Avg Turnover"    value={fmtMin(metrics?.avgTurnoverMin ?? 0)}
          sub={metrics ? `$${metrics.avgOrderValue.toFixed(0)} avg order` : ''}
          color="bg-sky-100 dark:bg-sky-900/30 text-sky-600" trend="flat" />
      </div>

      {/* ── Row 2: Table occupancy + Peak hours + Active orders ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Table occupancy grid */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <Table2 size={16} /> Floor Status
          </h3>
          {raw.tables.length > 0 ? (
            <>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {raw.tables.slice(0, 20).map((table: any, i: number) => (
                  <div
                    key={i}
                    title={`Table ${table.number || table.name || i+1} — ${table.status || 'unknown'}`}
                    className={`h-8 rounded flex items-center justify-center text-white text-xs font-bold ${TABLE_COLORS[table.status] || 'bg-slate-300'}`}
                  >
                    {table.number || table.name || (i+1)}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Occupied ({occupiedCount})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Reserved ({reservedCount})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Free ({availableCount})</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <Table2 size={24} className="opacity-30" />
              No tables configured
            </div>
          )}
        </div>

        {/* Hourly activity (peak hours) */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <BarChart3 size={16} /> Hourly Activity
            </h3>
            {heatmap && (
              <span className="text-xs text-slate-500">
                Peak: <strong className="text-rose-600">{heatmap.peakHour}:00</strong>
              </span>
            )}
          </div>
          {hourBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={hourBarData} barSize={6} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} axisLine={false} tickLine={false}
                  interval={2} />
                <Tooltip
                  formatter={(v: any) => [`${v} orders`, '']}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {hourBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.peak ? '#e11d48' : '#fda4af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[110px] flex items-center justify-center text-xs text-slate-400">No order data</div>
          )}
          {heatmap && (
            <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-center text-slate-500">
              <div><span className="block font-semibold text-slate-800 dark:text-white">{heatmap.periods.morning}</span>Morning</div>
              <div><span className="block font-semibold text-slate-800 dark:text-white">{heatmap.periods.afternoon}</span>Afternoon</div>
              <div><span className="block font-semibold text-slate-800 dark:text-white">{heatmap.periods.evening}</span>Evening</div>
            </div>
          )}
        </div>

        {/* Active orders list */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <ChefHat size={16} /> Active Orders
          </h3>
          {raw.activeOrders.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {raw.activeOrders.map((order: any, i: number) => {
                const elapsed = order.createdAt
                  ? Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                  : null
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${TABLE_COLORS[order.status] || 'bg-rose-500'}`}>
                      {order.tableNumber || order.table?.number || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-white truncate">
                        {order.items?.length || 0} item(s)
                        {order.total ? ` · $${Number(order.total).toFixed(0)}` : ''}
                      </p>
                      {elapsed !== null && (
                        <p className={`text-xs ${elapsed > 30 ? 'text-red-500' : 'text-slate-500'}`}>
                          {elapsed}m ago
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      order.status === 'ready'    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      order.status === 'preparing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}>{order.status || 'open'}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <ChefHat size={24} className="opacity-30" />
              No active orders
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Upcoming reservations + Metrics + Quick Links ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Upcoming reservations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-3">
            <CalendarClock size={16} /> Today's Reservations
          </h3>
          {raw.reservations.length > 0 ? (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {raw.reservations.slice(0, 6).map((res: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex-shrink-0 text-center">
                    <p className="text-xs font-bold text-rose-600">{res.time || '?'}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{res.guestName || res.name || 'Guest'}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Users size={10} />{res.partySize || res.guestCount || 1} guests
                    </p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    res.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    res.status === 'arrived'   ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{res.status || 'pending'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs gap-2">
              <CalendarClock size={24} className="opacity-30" />
              No reservations today
            </div>
          )}
        </div>

        {/* Service metrics */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm mb-4">
            <TrendingUp size={16} /> Service Metrics
          </h3>
          {metrics ? (
            <div className="space-y-4">
              {[
                { label: 'Avg Turnover Time', value: fmtMin(metrics.avgTurnoverMin) },
                { label: 'Avg Order Value',   value: `$${metrics.avgOrderValue.toFixed(2)}` },
                { label: 'Completion Rate',   value: `${metrics.completionRate}%` },
                { label: 'Orders Today',      value: raw.allOrdersToday.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs gap-2">
              <Clock size={24} className="opacity-30" />
              No metrics yet
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-2">
          {[
            { tab: 'tables',       icon: Table2,        label: 'Table Layout',    sub: 'View floor plan & seats' },
            { tab: 'reservations', icon: CalendarClock, label: 'Reservations',    sub: 'Manage guest bookings' },
            { tab: 'orders',       icon: ChefHat,       label: 'Kitchen Orders',  sub: 'Track dine-in orders' },
            { tab: 'menu',         icon: UtensilsCrossed, label: 'Menu',          sub: 'Manage menu items' },
          ].map(({ tab, icon: Icon, label, sub }) => (
            <button
              key={tab}
              onClick={() => navigate(`/restaurant?tab=${tab}`)}
              className="w-full bg-white dark:bg-slate-800 rounded-lg px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-left hover:border-rose-400 transition-colors group flex items-center gap-3"
            >
              <Icon size={15} className="text-rose-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
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
