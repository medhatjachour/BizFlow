/**
 * BakeryFinanceSection
 *
 * Finance section for the Bakery plugin.
 * Tabs: P&L Overview · Waste Cost Analysis · Recipe Costs
 * APIs: bakery.getProfitLoss, bakery.getProfitLossTrend, bakery.getWasteSummary, bakery.getRecipes
 */

import { useState, useEffect } from 'react'
import {
  Croissant, TrendingUp, TrendingDown, DollarSign, Trash2,
  BookOpen, RefreshCcw, BarChart3, AlertTriangle, CheckCircle,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'

type TabType = 'overview' | 'waste' | 'recipes'

const StatCard = ({ icon: Icon, label, value, sub, trend, color }: { icon: any; label: string; value: string | number; sub?: string; trend?: 'up'|'down'|'neutral'; color: string }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-2 rounded-xl ${color}`}><Icon size={16} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
    {trend && trend !== 'neutral' && (
      <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        vs previous period
      </div>
    )}
  </div>
)

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${active ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {icon}{label}
    </button>
  )
}

const BakeryFinanceSection: React.FC = () => {
  const { t } = useLanguage()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState(30) // days

  const [plData, setPlData] = useState<any>(null)
  const [plTrend, setPlTrend] = useState<any[]>([])
  const [wasteSummary, setWasteSummary] = useState<any>(null)
  const [recipes, setRecipes] = useState<any[]>([])

  useEffect(() => { loadData() }, [dateRange])

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const api = (window as any).api.bakery
      const end = new Date(); end.setHours(23, 59, 59, 999)
      const start = new Date(); start.setDate(start.getDate() - dateRange); start.setHours(0, 0, 0, 0)

      const [r1, r2, r3, r4] = await Promise.allSettled([
        api.getProfitLoss?.({ startDate: start.toISOString(), endDate: end.toISOString() }),
        api.getProfitLossTrend?.({ days: dateRange }),
        api.getWasteSummary?.({ startDate: start.toISOString(), endDate: end.toISOString() }),
        api.getRecipes?.(),
      ])

      if (r1.status === 'fulfilled') setPlData(r1.value)
      if (r2.status === 'fulfilled') setPlTrend(Array.isArray(r2.value) ? r2.value : [])
      if (r3.status === 'fulfilled') setWasteSummary(r3.value)
      if (r4.status === 'fulfilled') setRecipes(Array.isArray(r4.value) ? r4.value : [])
    } catch (err) { logger.error('BakeryFinance: loadData failed', err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  const revenue   = Number(plData?.revenue  || plData?.totalRevenue  || 0)
  const cost      = Number(plData?.cost     || plData?.totalCost     || 0)
  const profit    = Number(plData?.profit   || plData?.netProfit     || revenue - cost)
  const margin    = revenue > 0 ? ((profit / revenue) * 100) : 0
  const wasteCost = Number(wasteSummary?.totalCost || wasteSummary?.cost || 0)
  const wasteQty  = Number(wasteSummary?.totalQty  || wasteSummary?.qty  || 0)

  const trendChartData = plTrend.map((d: any) => ({
    date: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.label || '',
    revenue: Number(d.revenue || 0),
    cost: Number(d.cost || 0),
    profit: Number(d.profit || d.revenue - d.cost || 0),
  }))

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-1">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Croissant size={22} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bakery Finance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Profit & Loss · Waste Costs · Recipe Profitability</p>
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
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50">
            <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={16} />} label="P&L Overview" />
          <TabButton active={activeTab === 'waste'} onClick={() => setActiveTab('waste')} icon={<Trash2 size={16} />} label="Waste Cost Analysis" />
          <TabButton active={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} icon={<BookOpen size={16} />} label="Recipe Costs" />
        </div>
      </div>

      {/* P&L Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Revenue" value={`$${revenue.toFixed(2)}`} sub={`${dateRange}-day period`} color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
              <StatCard icon={TrendingDown} label="Total Cost" value={`$${cost.toFixed(2)}`} sub="Ingredients + overhead" color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
              <StatCard icon={TrendingUp} label="Net Profit" value={`$${profit.toFixed(2)}`} sub={profit >= 0 ? 'Profitable period' : 'Loss period'} trend={profit >= 0 ? 'up' : 'down'} color={profit >= 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'} />
              <StatCard icon={BarChart3} label="Profit Margin" value={`${margin.toFixed(1)}%`} sub={margin >= 20 ? 'Healthy margin' : 'Below target'} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          {!loading && trendChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Revenue vs Cost Trend</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number, n: string) => [`$${v.toFixed(2)}`, n.charAt(0).toUpperCase() + n.slice(1)]} />
                  <Line type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={2} dot={false} name="revenue" />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 4" name="cost" />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} name="profit" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 justify-center">
                {[{ color: '#d97706', label: 'Revenue' }, { color: '#ef4444', label: 'Cost' }, { color: '#22c55e', label: 'Profit' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} /><span className="text-xs text-slate-500">{l.label}</span></div>
                ))}
              </div>
            </div>
          )}
          {!loading && trendChartData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <BarChart3 size={40} className="opacity-30 mb-2" /><p className="text-sm">No P&L trend data available for this period</p>
            </div>
          )}
        </div>
      )}

      {/* Waste Cost Analysis */}
      {activeTab === 'waste' && (
        <div className="space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Trash2} label="Total Waste Cost" value={`$${wasteCost.toFixed(2)}`} sub="Spoiled / discarded" color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
                <StatCard icon={AlertTriangle} label="Waste Quantity" value={wasteQty} sub="units wasted" color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" />
                <StatCard icon={TrendingDown} label="Waste % of Revenue" value={revenue > 0 ? `${(wasteCost / revenue * 100).toFixed(1)}%` : '0%'} sub={wasteCost / revenue < 0.05 ? '✓ Under 5% target' : '⚠ Above 5% target'} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              </div>
              {wasteSummary?.byCategory && Array.isArray(wasteSummary.byCategory) && wasteSummary.byCategory.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Waste by Category</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={wasteSummary.byCategory} margin={{ top: 0, right: 4, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                      <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {(!wasteSummary || wasteCost === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle size={40} className="opacity-30 mb-2 text-green-500" /><p className="text-sm">No waste recorded for this period</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Recipe Costs */}
      {activeTab === 'recipes' && (
        <div className="space-y-5">
          {loading ? (
            <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map((recipe: any) => {
                const ingredientCost = Number(recipe.ingredientCost || recipe.cost || 0)
                const sellingPrice   = Number(recipe.sellingPrice || recipe.price || 0)
                const recipeMargin   = sellingPrice > 0 ? ((sellingPrice - ingredientCost) / sellingPrice * 100) : 0
                return (
                  <div key={recipe.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">{recipe.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{recipe.category || 'Uncategorized'} · {recipe.ingredients?.length || 0} ingredients</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${recipeMargin >= 60 ? 'bg-green-100 text-green-700' : recipeMargin >= 35 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{recipeMargin.toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Ing. Cost</p>
                        <p className="text-sm font-bold text-red-600">${ingredientCost.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Sell Price</p>
                        <p className="text-sm font-bold text-green-600">${sellingPrice.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Profit</p>
                        <p className={`text-sm font-bold ${sellingPrice - ingredientCost >= 0 ? 'text-amber-600' : 'text-red-600'}`}>${(sellingPrice - ingredientCost).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <BookOpen size={40} className="opacity-30 mb-2" /><p className="text-sm">No recipes configured yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BakeryFinanceSection
