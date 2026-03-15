/**
 * WarehouseFinanceSection
 *
 * Finance section for the Warehouse plugin.
 * Tabs: Inventory Overview · Stock Valuation · Critical Cost Impact
 * APIs: warehouse.getAllStockItems, warehouse.getLocations, warehouse.getCriticalStockItems, warehouse.getTransfers
 */

import { useState, useEffect } from 'react'
import {
  Warehouse, DollarSign, PackageX, MapPin, ArrowRightLeft,
  AlertTriangle, RefreshCcw, TrendingDown, Box, BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts'
import logger from '@/shared/utils/logger'

type TabType = 'overview' | 'valuation' | 'critical'

const COLORS = ['#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#facc15', '#f97316']

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
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {icon}{label}
    </button>
  )
}

const WarehouseFinanceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [stockItems, setStockItems] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [criticalItems, setCriticalItems] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const api = (window as any).api.warehouse
      const end = new Date(); end.setHours(23, 59, 59, 999)
      const start = new Date(); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0)

      const [r1, r2, r3, r4] = await Promise.allSettled([
        api.getAllStockItems?.(),
        api.getLocations?.(),
        api.getCriticalStockItems?.(),
        api.getTransfers?.({ startDate: start.toISOString(), endDate: end.toISOString() }),
      ])

      if (r1.status === 'fulfilled') setStockItems(Array.isArray(r1.value) ? r1.value : [])
      if (r2.status === 'fulfilled') setLocations(Array.isArray(r2.value) ? r2.value : [])
      if (r3.status === 'fulfilled') setCriticalItems(Array.isArray(r3.value) ? r3.value : [])
      if (r4.status === 'fulfilled') setTransfers(Array.isArray(r4.value) ? r4.value : [])
    } catch (err) { logger.error('WarehouseFinance: loadData failed', err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  // Computed metrics
  const totalStockValue = stockItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.costPrice || i.unitCost || 0), 0)
  const totalSkus = stockItems.length
  const totalCritical = criticalItems.length
  const criticalValue = criticalItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.costPrice || i.unitCost || 0), 0)
  const totalTransfers = transfers.length

  // Value by location
  const locValMap = new Map<string, number>()
  stockItems.forEach(item => {
    const loc = item.location?.name || item.locationName || 'Unassigned'
    locValMap.set(loc, (locValMap.get(loc) || 0) + Number(item.quantity || 0) * Number(item.costPrice || item.unitCost || 0))
  })
  const locValData = Array.from(locValMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  // Value by category
  const catValMap = new Map<string, number>()
  stockItems.forEach(item => {
    const cat = item.category || 'Uncategorized'
    catValMap.set(cat, (catValMap.get(cat) || 0) + Number(item.quantity || 0) * Number(item.costPrice || item.unitCost || 0))
  })
  const catValData = Array.from(catValMap.entries()).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value)

  // Critical items with potential impact
  const criticalWithImpact = criticalItems.map(item => ({
    ...item,
    currentValue: Number(item.quantity || 0) * Number(item.costPrice || item.unitCost || 0),
    potentialLoss: (Number(item.minQuantity || item.reorderPoint || 0) - Number(item.quantity || 0)) * Number(item.costPrice || item.unitCost || 0),
  }))

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-1">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Warehouse size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Warehouse Finance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Inventory Value · Valuation · Critical Cost Impact</p>
          </div>
        </div>
        <button onClick={() => loadData(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Warehouse size={16} />} label="Inventory Overview" />
          <TabButton active={activeTab === 'valuation'} onClick={() => setActiveTab('valuation')} icon={<BarChart3 size={16} />} label="Stock Valuation" />
          <TabButton active={activeTab === 'critical'} onClick={() => setActiveTab('critical')} icon={<AlertTriangle size={16} />} label="Critical Cost Impact" />
        </div>
      </div>

      {/* Inventory Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Total Stock Value" value={`$${totalStockValue.toFixed(2)}`} sub="at cost price" color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
              <StatCard icon={Box} label="Total SKUs" value={totalSkus} sub="unique items" color="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" />
              <StatCard icon={AlertTriangle} label="Critical Items" value={totalCritical} sub="below reorder level" color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <StatCard icon={ArrowRightLeft} label="Transfers (30d)" value={totalTransfers} sub="stock movements" color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" />
            </div>
          )}
          {!loading && catValData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Stock Value by Category</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catValData.slice(0, 8)} margin={{ top: 0, right: 4, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {catValData.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Stock Valuation */}
      {activeTab === 'valuation' && (
        <div className="space-y-5">
          {loading ? (
            <div className="animate-pulse h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ) : locValData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Value by Location</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={locValData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {locValData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {locValData.map((loc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: COLORS[i % COLORS.length] + '22' }}>
                        <MapPin size={15} style={{ color: COLORS[i % COLORS.length] }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{loc.name}</p>
                        <p className="text-xs text-slate-500">{((loc.value / totalStockValue) * 100).toFixed(1)}% of total</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-blue-600">${loc.value.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <MapPin size={40} className="opacity-30 mb-2" /><p className="text-sm">No location data available</p>
            </div>
          )}
        </div>
      )}

      {/* Critical Cost Impact */}
      {activeTab === 'critical' && (
        <div className="space-y-5">
          {loading ? (
            <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : criticalWithImpact.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={PackageX} label="Critical Items" value={totalCritical} sub="at or below reorder level" color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
                <StatCard icon={TrendingDown} label="Value at Risk" value={`$${criticalValue.toFixed(2)}`} sub="remaining value" color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="space-y-2">
                {criticalWithImpact.slice(0, 15).map((item: any, i) => (
                  <div key={item.id || i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600"><AlertTriangle size={15} /></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name || item.sku || `Item ${i + 1}`}</p>
                        <p className="text-xs text-slate-500">
                          Qty: {item.quantity ?? '?'} / Min: {item.minQuantity || item.reorderPoint || '?'} · SKU: {item.sku || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">Current: ${item.currentValue.toFixed(2)}</p>
                      {item.potentialLoss > 0 && <p className="text-xs text-orange-500">Shortage: ${item.potentialLoss.toFixed(2)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <AlertTriangle size={40} className="opacity-30 mb-2" /><p className="text-sm">No critical stock items found. Great job!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WarehouseFinanceSection
