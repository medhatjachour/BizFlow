/**
 * RestaurantFinanceSection
 *
 * Finance section for the Restaurant plugin.
 * Tabs: Revenue Overview · Menu Performance · Table Revenue
 * APIs: restaurant.getOverview, restaurant.getOrders, restaurant.getMenuItems, restaurant.getTables
 */

import { useState, useEffect } from 'react'
import {
  UtensilsCrossed, DollarSign, ShoppingBag, TrendingUp, TrendingDown,
  BarChart3, Star, Users, RefreshCcw, Table2,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'

type TabType = 'overview' | 'menu' | 'tables'

const COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#e879f9', '#f472b6']

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-2 rounded-xl ${color}`}><Icon size={16} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
  </div>
)

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${active ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {icon}{label}
    </button>
  )
}

const RestaurantFinanceSection: React.FC = () => {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState(30)

  const [overview, setOverview] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])

  useEffect(() => { loadData() }, [dateRange])

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const api = (window as any).api.restaurant
      const end = new Date(); end.setHours(23, 59, 59, 999)
      const start = new Date(); start.setDate(start.getDate() - dateRange); start.setHours(0, 0, 0, 0)

      const [r1, r2, r3, r4] = await Promise.allSettled([
        api.getOverview?.(),
        api.getOrders?.({ status: 'paid', startDate: start.toISOString(), endDate: end.toISOString() }),
        api.getMenuItems?.(),
        api.getTables?.(),
      ])

      if (r1.status === 'fulfilled') setOverview(r1.value)
      if (r2.status === 'fulfilled') {
        setOrders(Array.isArray(r2.value) ? r2.value : [])
      }
      if (r3.status === 'fulfilled') setMenuItems(Array.isArray(r3.value) ? r3.value : [])
      if (r4.status === 'fulfilled') setTables(Array.isArray(r4.value) ? r4.value : [])
    } catch (err) { logger.error('RestaurantFinance: loadData failed', err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  // Aggregate metrics from orders
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total || o.totalAmount || 0), 0)
  const totalOrders  = orders.length
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Revenue by day (last 14 days from orders)
  const dayMap = new Map<string, number>()
  orders.forEach(o => {
    const day = new Date(o.closedAt || o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    dayMap.set(day, (dayMap.get(day) || 0) + Number(o.total || o.totalAmount || 0))
  })
  const revByDay = Array.from(dayMap.entries()).slice(-14).map(([date, revenue]) => ({ date, revenue }))

  // Menu item revenue
  const menuRevMap = new Map<string, { name: string; revenue: number; count: number }>()
  orders.forEach(o => {
    (o.items || []).forEach((item: any) => {
      const name = item.menuItem?.name || item.name || 'Unknown'
      const old = menuRevMap.get(item.menuItemId || name) || { name, revenue: 0, count: 0 }
      old.revenue += Number(item.price || 0) * Number(item.quantity || 1)
      old.count += Number(item.quantity || 1)
      menuRevMap.set(item.menuItemId || name, old)
    })
  })
  const menuRevData = Array.from(menuRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  // Enrich menu items with revenue
  const enrichedMenu = menuItems.map(m => ({
    ...m, revenue: menuRevMap.get(m.id)?.revenue || 0, soldCount: menuRevMap.get(m.id)?.count || 0
  })).sort((a, b) => b.revenue - a.revenue)

  // Table revenue
  const tableRevMap = new Map<string, { name: string; revenue: number; orders: number }>()
  orders.forEach(o => {
    const tId = o.tableId || ''
    const tName = o.table?.name || o.tableName || `Table ${tId.slice(-4) || '?'}`
    const old = tableRevMap.get(tId) || { name: tName, revenue: 0, orders: 0 }
    old.revenue += Number(o.total || o.totalAmount || 0)
    old.orders++
    tableRevMap.set(tId, old)
  })
  const tableRevData = Array.from(tableRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-1">
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
            <UtensilsCrossed size={22} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restaurant Finance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Revenue · Menu Performance · Table Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={() => loadData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium disabled:opacity-50">
            <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={16} />} label="Revenue Overview" />
          <TabButton active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} icon={<Star size={16} />} label="Menu Performance" />
          <TabButton active={activeTab === 'tables'} onClick={() => setActiveTab('tables')} icon={<Table2 size={16} />} label="Table Revenue" />
        </div>
      </div>

      {/* Revenue Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} sub={`${dateRange}-day period`} color="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" />
              <StatCard icon={ShoppingBag} label="Total Orders" value={totalOrders} sub="closed orders" color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" />
              <StatCard icon={TrendingUp} label="Avg Order Value" value={`$${avgOrder.toFixed(2)}`} sub="per closed order" color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
            </div>
          )}
          {!loading && revByDay.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Daily Revenue Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {!loading && revByDay.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <BarChart3 size={40} className="opacity-30 mb-2" /><p className="text-sm">No revenue data for this period</p>
            </div>
          )}
        </div>
      )}

      {/* Menu Performance */}
      {activeTab === 'menu' && (
        <div className="space-y-5">
          {loading ? (
            <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : menuRevData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Menu Items by Revenue</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={menuRevData.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip formatter={(v: number | undefined) => `$${(v ?? 0).toFixed(2)}`} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {menuRevData.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {enrichedMenu.slice(0, 8).map((m: any, i) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] + '33', color: COLORS[i % COLORS.length] }}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.category || 'Uncategorized'} · {m.soldCount} sold · ${Number(m.price || 0).toFixed(2)} each</p>
                    </div>
                    <div className="text-right"><p className="text-sm font-bold text-rose-600">${m.revenue.toFixed(2)}</p></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Star size={40} className="opacity-30 mb-2" /><p className="text-sm">No order data available to analyze menu performance</p>
            </div>
          )}
        </div>
      )}

      {/* Table Revenue */}
      {activeTab === 'tables' && (
        <div className="space-y-5">
          {loading ? (
            <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : tableRevData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Revenue by Table</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tableRevData} margin={{ top: 0, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number | undefined) => `$${(v ?? 0).toFixed(2)}`} />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {tableRevData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {tableRevData.map((tbl, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS[i % COLORS.length] + '22' }}>
                        <Table2 size={15} style={{ color: COLORS[i % COLORS.length] }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tbl.name}</p>
                        <p className="text-xs text-slate-500">{tbl.orders} orders · avg ${tbl.orders > 0 ? (tbl.revenue / tbl.orders).toFixed(2) : '0'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-rose-600">${tbl.revenue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Table2 size={40} className="opacity-30 mb-2" /><p className="text-sm">No table revenue data for this period</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RestaurantFinanceSection
