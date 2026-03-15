/**
 * CommerceFinanceSection
 *
 * Self-contained Finance section for the Commerce plugin.
 * All 7 tabs extracted from the original Finance/index.tsx.
 * Tabs: Overview · Forecasting · Cash Flow · Insights · Pricing · Installments · Health
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  RefreshCcw, Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Percent, Calendar, BarChart3, Waves, Sparkles, Activity, HelpCircle,
  Calculator, CreditCard,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip as ChartTooltip, Legend, Filler,
} from 'chart.js'
import type { DateRangeType } from '@renderer/pages/Finance/types'
import { useToast } from '@renderer/contexts/ToastContext'
import RevenueForecasting from '@renderer/pages/Finance/components/RevenueForecasting'
import CashFlowProjection from '@renderer/pages/Finance/components/CashFlowProjection'
import ProductInsights from '@renderer/pages/Finance/components/ProductInsights'
import FinancialHealthDashboard from '@renderer/pages/Finance/components/FinancialHealth'
import PricingCalculator from '@renderer/pages/Finance/components/PricingCalculator'
import StoreComparisonSection from '@renderer/pages/Finance/components/StoreComparisonSection'
import InstallmentPlansSection from '@renderer/pages/Finance/components/InstallmentPlansSection'
import logger from '@/shared/utils/logger'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, ChartTooltip, Legend, Filler)

type FinanceMetrics = {
  revenue: number
  revenueWithTax?: number
  transactions: number
  avgOrderValue: number
  revenueChange: number
  transactionsChange: number
  avgOrderValueChange: number
  totalProfit: number
  profitMargin: number
  totalCost: number
  totalExpenses?: number
  grossProfit?: number
  profitChange?: number
  totalRefunded?: number
  totalRefundedWithTax?: number
  refundedItems?: number
  refundedTransactions?: number
  refundRate?: number
}
type TopProduct = { name: string; revenue: number; quantity: number; cost: number; profit: number; profitMargin: number }
type SalesByDay = { date: string; revenue: number }
type SalesByCategory = { name: string; revenue: number }
type TabType = 'overview' | 'forecasting' | 'cashflow' | 'insights' | 'health' | 'pricing' | 'installments'

// ─── Inner Components ──────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 whitespace-normal">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  )
}

function KPICard({ title, value, change, icon, color, showChange = true, subtitle, tooltip }: {
  title: string; value: string; change: number; icon: React.ReactNode; color: 'blue'|'green'|'purple'|'orange'|'red'; showChange?: boolean; subtitle?: string; tooltip?: string
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  }
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        {showChange && (
          <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h3>
        {tooltip && <Tooltip text={tooltip}><HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" /></Tooltip>}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  )
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${active ? 'bg-primary text-white shadow-md' : 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {icon}
      <span className="font-medium">{label}</span>
      {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${active ? 'bg-white/20 text-white' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'}`}>{badge}</span>}
    </button>
  )
}

// ─── Main Section ──────────────────────────────────────────────────────────

const CommerceFinanceSection: React.FC = () => {
  const toast = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [dateRange, setDateRange] = useState<DateRangeType>('30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [currentMetrics, setCurrentMetrics] = useState<FinanceMetrics | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([])
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategory[]>([])

  const { currentDates, previousDates } = useMemo(() => {
    const currentEnd = new Date(); currentEnd.setHours(23, 59, 59, 999)
    let currentStart = new Date()
    switch (dateRange) {
      case 'today': currentStart.setHours(0, 0, 0, 0); break
      case '7days': currentStart.setDate(currentStart.getDate() - 7); currentStart.setHours(0, 0, 0, 0); break
      case '30days': currentStart.setDate(currentStart.getDate() - 30); currentStart.setHours(0, 0, 0, 0); break
      case '90days': currentStart.setDate(currentStart.getDate() - 90); currentStart.setHours(0, 0, 0, 0); break
      case 'custom':
        if (customStartDate) currentStart = new Date(customStartDate)
        if (customEndDate) currentEnd.setTime(new Date(customEndDate).getTime())
        break
    }
    const periodLength = currentEnd.getTime() - currentStart.getTime()
    const previousEnd = new Date(currentStart.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - periodLength)
    return {
      currentDates: { start: currentStart.toISOString(), end: currentEnd.toISOString() },
      previousDates: { start: previousStart.toISOString(), end: previousEnd.toISOString() },
    }
  }, [dateRange, customStartDate, customEndDate])

  const loadFinanceData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true)
      // @ts-ignore
      const data = await window.api['search:finance']({
        startDate: currentDates.start, endDate: currentDates.end,
        previousStartDate: previousDates.start, previousEndDate: previousDates.end,
      })
      if (data) {
        setCurrentMetrics(data.currentMetrics)
        setTopProducts(data.topProducts || [])
        setSalesByDay(data.salesByDay || [])
        setSalesByCategory(data.salesByCategory || [])
      }
    } catch (error) {
      logger.error('CommerceFinance: load failed', error)
    } finally { setLoading(false); setRefreshing(false) }
  }, [currentDates.start, currentDates.end, previousDates.start, previousDates.end])

  useEffect(() => { loadFinanceData() }, [loadFinanceData])

  const handleExport = async () => {
    try {
      setExporting(true)
      const exportData = [
        { Section: 'Overview', Metric: 'Total Revenue', Value: `$${currentMetrics?.revenue.toFixed(2)}` },
        { Section: 'Overview', Metric: 'Total Transactions', Value: currentMetrics?.transactions },
        { Section: 'Overview', Metric: 'Avg Order Value', Value: `$${currentMetrics?.avgOrderValue.toFixed(2)}` },
        { Section: 'Overview', Metric: 'Total Profit', Value: `$${currentMetrics?.totalProfit.toFixed(2)}` },
        { Section: 'Overview', Metric: 'Profit Margin', Value: `${currentMetrics?.profitMargin.toFixed(2)}%` },
        { Section: '', Metric: '', Value: '' },
        ...topProducts.map((p, i) => ({ Section: 'Top Products', Metric: `${i + 1}. ${p.name}`, Value: `$${p.revenue.toFixed(2)} (${p.quantity} units, ${p.profitMargin.toFixed(1)}% margin)` }))
      ]
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Commerce Finance')
      XLSX.writeFile(wb, `commerce-finance-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Commerce finance data exported')
    } catch (error) {
      logger.error('CommerceFinance: export failed', error)
      toast.error('Export failed')
    } finally { setExporting(false) }
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-1">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <ShoppingCart size={22} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Commerce Finance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Revenue · Profit · Forecasting · Installments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium disabled:opacity-50">
            <Download size={15} className={exporting ? 'animate-bounce' : ''} />
            {exporting ? 'Exporting…' : t('financeExportData')}
          </button>
          <button onClick={() => loadFinanceData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
            <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
            {t('financeRefreshData')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'overview', icon: <BarChart3 size={18} />, label: t('financeOverview') },
            { id: 'forecasting', icon: <TrendingUp size={18} />, label: t('financeForecasting'), badge: 'AI' },
            { id: 'cashflow', icon: <Waves size={18} />, label: t('financeCashFlow') },
            { id: 'insights', icon: <Sparkles size={18} />, label: t('financeInsights'), badge: 'AI' },
            { id: 'pricing', icon: <Calculator size={18} />, label: t('financePricing'), badge: 'NEW' },
            { id: 'installments', icon: <CreditCard size={18} />, label: t('financeInstallments'), badge: 'NEW' },
            { id: 'health', icon: <Activity size={18} />, label: t('financeHealth') },
          ].map(tab => (
            <TabButton key={tab.id} active={activeTab === tab.id as TabType} onClick={() => setActiveTab(tab.id as TabType)}
              icon={tab.icon} label={tab.label} badge={(tab as any).badge} />
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-slate-600 dark:text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('financeDateRange')}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['today', '7days', '30days', '90days', 'custom'] as DateRangeType[]).map(range => (
                <button key={range} onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg transition-colors ${dateRange === range ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                  {range === 'today' && t('financeToday')}
                  {range === '7days' && t('financeLast7Days')}
                  {range === '30days' && t('financeLast30Days')}
                  {range === '90days' && t('financeLast90Days')}
                  {range === 'custom' && t('financeCustomRange')}
                </button>
              ))}
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                  <span className="text-slate-500">to</span>
                  <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4 animate-pulse">
              {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <KPICard title={t('financeRevenue')} value={`$${currentMetrics?.revenue.toFixed(2) || '0.00'}`}
                change={currentMetrics?.revenueChange || 0} icon={<DollarSign size={24} />} color="blue"
                subtitle={currentMetrics?.revenueWithTax ? `${currentMetrics.transactions || 0} ${t('financeTransactions')} | With Tax: $${currentMetrics.revenueWithTax.toFixed(2)}` : `${currentMetrics?.transactions || 0} ${t('financeTransactions')}`}
                tooltip={`Total income from all sales before deducting costs (pre-tax). Tax collected: $${((currentMetrics?.revenueWithTax || 0) - (currentMetrics?.revenue || 0)).toFixed(2)}`} />
              <KPICard title={t('financeGrossProfit')} value={`$${currentMetrics?.totalProfit.toFixed(2) || '0.00'}`}
                change={currentMetrics?.profitChange || 0} icon={<TrendingUp size={24} />} color="green"
                subtitle={currentMetrics?.totalExpenses ? `COGS: $${currentMetrics.totalCost.toFixed(0)} | Expenses: $${currentMetrics.totalExpenses.toFixed(0)}` : `${t('financeTotalCost')}: $${currentMetrics?.totalCost.toFixed(2) || '0.00'}`}
                showChange={currentMetrics?.profitChange !== undefined} tooltip={t('financeTooltipProfit')} />
              <KPICard title={t('financeRefunds')} value={`$${currentMetrics?.totalRefunded?.toFixed(2) || '0.00'}`}
                change={-(currentMetrics?.refundRate || 0)} icon={<TrendingDown size={24} />} color="red"
                subtitle={`${currentMetrics?.refundedTransactions || 0} ${t('financeTransactions')} | ${currentMetrics?.refundedItems || 0} ${t('financeItems')}`} showChange={true}
                tooltip={`Refund rate: ${currentMetrics?.refundRate?.toFixed(1) || 0}% of transactions`} />
              <KPICard title={t('financeProfitMargin')} value={`${currentMetrics?.profitMargin.toFixed(2) || '0.00'}%`}
                change={0} icon={<Percent size={24} />} color="purple"
                subtitle={`${t('financeAverage')} (Based on pre-tax revenue)`} showChange={false}
                tooltip={`Profit margin = (Profit ÷ Revenue) × 100`} />
              <KPICard title={t('financeAvgOrder')} value={`$${currentMetrics?.avgOrderValue.toFixed(2) || '0.00'}`}
                change={currentMetrics?.avgOrderValueChange || 0} icon={<ShoppingCart size={24} />} color="orange"
                subtitle={t('financePerTransaction')} tooltip={t('financeTooltipAvgOrder')} />
            </div>
          )}

          {/* Charts */}
          {!loading && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Sales Trend */}
              <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary" />{t('financeSalesTrend')}
                  </h3>
                  <Tooltip text={t('financeTooltipSalesTrend')}><HelpCircle size={16} className="text-slate-400 cursor-help" /></Tooltip>
                </div>
                <div className="min-h-[280px]">
                  {salesByDay.length > 0 ? (
                    <Line data={{ labels: salesByDay.slice(-14).map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })), datasets: [{ label: t('financeRevenue'), data: salesByDay.slice(-14).map(d => d.revenue), borderColor: 'rgb(59,130,246)', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4, pointRadius: 4 }] }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v } }, x: { grid: { display: false } } } }} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-center py-12">
                      <div><BarChart3 size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" /><p className="text-slate-500">{t('financeNoData')}</p></div>
                    </div>
                  )}
                </div>
              </div>
              {/* Top Products */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Sparkles size={20} className="text-primary" />{t('financeTopProducts')}
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {topProducts.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${p.profitMargin >= 50 ? 'bg-green-100 text-green-700' : p.profitMargin >= 25 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{p.profitMargin.toFixed(1)}% margin</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-primary text-sm">${p.revenue.toFixed(2)}</p>
                        <p className="text-xs text-green-600">+${p.profit.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && <div className="text-center py-8 text-slate-400"><ShoppingCart size={36} className="mx-auto mb-2 opacity-30" /><p className="text-sm">{t('financeNoProductSales')}</p></div>}
                </div>
              </div>
            </div>
          )}

          {/* Sales by Category */}
          {!loading && salesByCategory.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                <Activity size={20} className="text-primary" />{t('financeSalesBy')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                <div className="md:col-span-3 h-72 relative flex items-center justify-center">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">${salesByCategory.reduce((s, c) => s + c.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('financeTotalRevenue')}</p>
                  </div>
                  <Doughnut data={{ labels: salesByCategory.map(c => c.name), datasets: [{ data: salesByCategory.map(c => c.revenue), backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(147,51,234,0.8)', 'rgba(236,72,153,0.8)', 'rgba(34,197,94,0.8)', 'rgba(251,146,60,0.8)', 'rgba(14,165,233,0.8)', 'rgba(168,85,247,0.8)', 'rgba(239,68,68,0.8)'], borderWidth: 2, hoverOffset: 8 }] }}
                    options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  {salesByCategory.map((cat, i) => {
                    const total = salesByCategory.reduce((s, c) => s + c.revenue, 0)
                    const pct = total > 0 ? (cat.revenue / total * 100).toFixed(1) : '0'
                    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500', 'bg-sky-500', 'bg-violet-500', 'bg-red-500']
                    return (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} /><span className="text-sm truncate">{cat.name}</span></div>
                        <div className="flex items-center gap-2"><span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{pct}%</span><span className="font-semibold text-primary text-sm">${cat.revenue.toFixed(2)}</span></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <StoreComparisonSection startDate={new Date(currentDates.start)} endDate={new Date(currentDates.end)} />
        </div>
      )}

      {activeTab === 'forecasting' && <RevenueForecasting />}
      {activeTab === 'cashflow' && <CashFlowProjection />}
      {activeTab === 'insights' && <ProductInsights />}
      {activeTab === 'health' && <FinancialHealthDashboard />}
      {activeTab === 'pricing' && <PricingCalculator />}
      {activeTab === 'installments' && <InstallmentPlansSection />}
    </div>
  )
}

export default CommerceFinanceSection
