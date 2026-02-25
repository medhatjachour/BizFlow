/**
 * Finance Page - Refactored with Backend Filtering
 * Performance optimized with server-side date range filtering
 * 
 * Features:
 * - Backend date range filtering
 * - Real-time metrics calculation
 * - Profit margin tracking
 * - Top products analysis
 * - Sales trends visualization
 * - Export capabilities
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { RefreshCcw, Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Percent, Calendar, BarChart3, Waves, Sparkles, Activity, HelpCircle, Calculator, CreditCard } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useLanguage } from '../../contexts/LanguageContext'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js'
import type { DateRangeType } from './types'
import { useToast } from '../../contexts/ToastContext'
import RevenueForecasting from './components/RevenueForecasting'
import CashFlowProjection from './components/CashFlowProjection'
import ProductInsights from './components/ProductInsights'
import FinancialHealthDashboard from './components/FinancialHealth'
import PricingCalculator from './components/PricingCalculator'
import StoreComparisonSection from './components/StoreComparisonSection'
import InstallmentPlansSection from './components/InstallmentPlansSection'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
)

type FinanceMetrics = {
  revenue: number
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
  // Refund statistics
  totalRefunded?: number
  refundedItems?: number
  refundedTransactions?: number
  refundRate?: number
}

type TopProduct = {
  name: string
  revenue: number
  quantity: number
  cost: number
  profit: number
  profitMargin: number
}

type SalesByDay = {
  date: string
  revenue: number
}

type SalesByCategory = {
  name: string
  revenue: number
}

type TabType = 'overview' | 'forecasting' | 'cashflow' | 'insights' | 'health' | 'pricing' | 'installments'

export default function Finance() {
  const toast = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRangeType>('30days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Finance data state
  const [currentMetrics, setCurrentMetrics] = useState<FinanceMetrics | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([])
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategory[]>([])

  // Calculate date ranges
  const { currentDates, previousDates } = useMemo(() => {
    const currentEnd = new Date()
    currentEnd.setHours(23, 59, 59, 999)
    let currentStart = new Date()

    switch (dateRange) {
      case 'today':
        currentStart.setHours(0, 0, 0, 0)
        break
      case '7days':
        currentStart.setDate(currentStart.getDate() - 7)
        currentStart.setHours(0, 0, 0, 0)
        break
      case '30days':
        currentStart.setDate(currentStart.getDate() - 30)
        currentStart.setHours(0, 0, 0, 0)
        break
      case '90days':
        currentStart.setDate(currentStart.getDate() - 90)
        currentStart.setHours(0, 0, 0, 0)
        break
      case 'custom':
        if (customStartDate) currentStart = new Date(customStartDate)
        if (customEndDate) currentEnd.setTime(new Date(customEndDate).getTime())
        break
    }

    // Calculate previous period for comparison
    const periodLength = currentEnd.getTime() - currentStart.getTime()
    const previousEnd = new Date(currentStart.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - periodLength)

    return {
      currentDates: {
        start: currentStart.toISOString(),
        end: currentEnd.toISOString()
      },
      previousDates: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString()
      }
    }
  }, [dateRange, customStartDate, customEndDate])

  // Load finance data from backend
  const loadFinanceData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      // @ts-ignore
      const data = await window.api['search:finance']({
        startDate: currentDates.start,
        endDate: currentDates.end,
        previousStartDate: previousDates.start,
        previousEndDate: previousDates.end,
        includeCOGS: localStorage.getItem('includeCOGSInCalculations') !== 'false'
      })

      if (data) {
        setCurrentMetrics(data.currentMetrics)
        setTopProducts(data.topProducts || [])
        setSalesByDay(data.salesByDay || [])
        setSalesByCategory(data.salesByCategory || [])
      }
    } catch (error) {
      console.error('Error loading finance data:', error)
      // Show error without including toast in dependencies
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to load finance data:', errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentDates.start, currentDates.end, previousDates.start, previousDates.end])

  // Load data when dates change
  useEffect(() => {
    loadFinanceData()
  }, [loadFinanceData])

  const handleRefresh = () => {
    loadFinanceData()
  }

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
        ...topProducts.map((p, i) => ({
          Section: 'Top Products',
          Metric: `${i + 1}. ${p.name}`,
          Value: `$${p.revenue.toFixed(2)} (${p.quantity} units, ${p.profitMargin.toFixed(1)}% margin)`
        }))
      ]

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Finance Report')

      const date = new Date().toISOString().split('T')[0]
      const filename = `finance-report-${dateRange}-${date}.xlsx`
      XLSX.writeFile(wb, filename)

      toast.success(`${t('financeExportSuccess')}: ${t('financeReportExported')} ${filename}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error(`${t('financeExportFailed')}: ${error instanceof Error ? error.message : t('financeUnknownError')}`)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('financeLoadingMetrics')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('financeTitle')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('financeSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? t('financeExporting') : t('financeExportData')}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('financeRefreshData')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<BarChart3 size={18} />}
            label={t('financeOverview')}
          />
          <TabButton
            active={activeTab === 'forecasting'}
            onClick={() => setActiveTab('forecasting')}
            icon={<TrendingUp size={18} />}
            label={t('financeForecasting')}
            badge="AI"
          />
          <TabButton
            active={activeTab === 'cashflow'}
            onClick={() => setActiveTab('cashflow')}
            icon={<Waves size={18} />}
            label={t('financeCashFlow')}
          />
          <TabButton
            active={activeTab === 'insights'}
            onClick={() => setActiveTab('insights')}
            icon={<Sparkles size={18} />}
            label={t('financeInsights')}
            badge="AI"
          />
          <TabButton
            active={activeTab === 'pricing'}
            onClick={() => setActiveTab('pricing')}
            icon={<Calculator size={18} />}
            label={t('financePricing')}
            badge="NEW"
          />
          <TabButton
            active={activeTab === 'installments'}
            onClick={() => setActiveTab('installments')}
            icon={<CreditCard size={18} />}
            label={t('financeInstallments')}
            badge="NEW"
          />
          <TabButton
            active={activeTab === 'health'}
            onClick={() => setActiveTab('health')}
            icon={<Activity size={18} />}
            label={t('financeHealth')}
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Date Range Filter */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-slate-600 dark:text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('financeDateRange')}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['today', '7days', '30days', '90days', 'custom'] as DateRangeType[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    dateRange === range
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {range === 'today' && t('financeToday')}
                  {range === '7days' && t('financeLast7Days')}
                  {range === '30days' && t('financeLast30Days')}
                  {range === '90days' && t('financeLast90Days')}
                  {range === 'custom' && t('financeCustomRange')}
                </button>
              ))}
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards - Improved Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <KPICard
              title={t('financeRevenue')}
              value={`$${currentMetrics?.revenue.toFixed(2) || '0.00'}`}
              change={currentMetrics?.revenueChange || 0}
              icon={<DollarSign size={24} />}
              color="blue"
              subtitle={`${currentMetrics?.transactions || 0} ${t('financeTransactions')}`}
              tooltip={t('financeTooltipRevenue')}
            />
            <KPICard
              title={t('financeGrossProfit')}
              value={`$${currentMetrics?.totalProfit.toFixed(2) || '0.00'}`}
              change={currentMetrics?.profitChange || 0}
              icon={<TrendingUp size={24} />}
              color="green"
              subtitle={currentMetrics?.totalExpenses 
                ? `COGS: $${currentMetrics.totalCost.toFixed(0)} | Expenses: $${currentMetrics.totalExpenses.toFixed(0)}`
                : `${t('financeTotalCost')}: $${currentMetrics?.totalCost.toFixed(2) || '0.00'}`
              }
              showChange={currentMetrics?.profitChange !== undefined}
              tooltip={t('financeTooltipProfit')}
            />
            <KPICard
              title={t('financeRefunds')}
              value={`$${currentMetrics?.totalRefunded?.toFixed(2) || '0.00'}`}
              change={-(currentMetrics?.refundRate || 0)}
              icon={<TrendingDown size={24} />}
              color="red"
              subtitle={`${currentMetrics?.refundedTransactions || 0} ${t('financeTransactions')} | ${currentMetrics?.refundedItems || 0} ${t('financeItems')}`}
              showChange={true}
              tooltip={`${t('financeTooltipRefunds')} ${currentMetrics?.refundRate?.toFixed(1) || 0}% ${t('financeOf')} ${t('financeTransactions')} ${t('financeHadRefunds')}.`}
            />
            <KPICard
              title={t('financeProfitMargin')}
              value={`${currentMetrics?.profitMargin.toFixed(2) || '0.00'}%`}
              change={0}
              icon={<Percent size={24} />}
              color="purple"
              subtitle={t('financeAverage')}
              showChange={false}
              tooltip={t('financeTooltipMargin')}
            />
            <KPICard
              title={t('financeAvgOrder')}
              value={`$${currentMetrics?.avgOrderValue.toFixed(2) || '0.00'}`}
              change={currentMetrics?.avgOrderValueChange || 0}
              icon={<ShoppingCart size={24} />}
              color="orange"
              subtitle={t('financePerTransaction')}
              tooltip={t('financeTooltipAvgOrder')}
            />
          </div>

          {/* Charts and Top Products - Improved Responsive Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Sales Trend - Enhanced Visualization */}
            <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary" />
                    {t('financeSalesTrend')}
                  </h3>
                  <Tooltip text={t('financeTooltipSalesTrend')}>
                    <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
                  </Tooltip>
                </div>
                {salesByDay.length > 0 && (
                  <span className="text-sm text-slate-500">
                    {t('financeLast')} {Math.min(salesByDay.length, 14)} {t('financeDays')}
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-[320px]">
                {salesByDay.length > 0 ? (
                  <Line
                    data={{
                      labels: salesByDay.slice(-14).map(day => 
                        new Date(day.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })
                      ),
                      datasets: [
                        {
                          label: t('financeRevenue'),
                          data: salesByDay.slice(-14).map(day => day.revenue),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                          pointBackgroundColor: 'rgb(59, 130, 246)',
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          callbacks: {
                            label: (context) => {
                              const value = context.parsed.y ?? 0
                              const prevValue = context.dataIndex > 0 
                                ? (context.dataset.data[context.dataIndex - 1] as number ?? 0)
                                : value
                              const change = prevValue > 0 
                                ? ((value - prevValue) / prevValue * 100).toFixed(1)
                                : '0.0'
                              return [
                                `${t('financeRevenue')}: $${value.toFixed(2)}`,
                                `${t('financeChange')}: ${Number.parseFloat(change) >= 0 ? '+' : ''}${change}%`
                              ]
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => '$' + value
                          }
                        },
                        x: {
                          grid: {
                            display: false
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500">{t('financeNoData')}</p>
                      <p className="text-sm text-slate-400 mt-1">{t('financeNoSalesYet')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Products - Enhanced Design */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" />
                    {t('financeTopProducts')}
                  </h3>
                  <Tooltip text={t('financeTooltipTopProducts')}>
                    <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
                  </Tooltip>
                </div>
                {topProducts.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    {t('financeTopLabel')} {topProducts.length}
                  </span>
                )}
              </div>
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                {topProducts.length > 0 ? (
                  topProducts.slice(0, 10).map((product, index) => (
                    <div key={index} className="group relative">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-slate-400 text-white' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">
                              {product.quantity} {t('financeUnits')}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              product.profitMargin >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              product.profitMargin >= 25 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {product.profitMargin.toFixed(1)}% {t('financeMargin')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-primary text-sm whitespace-nowrap">
                            ${product.revenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                            +${product.profit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500">{t('financeNoProductSales')}</p>
                    <p className="text-sm text-slate-400 mt-1">{t('financeTopProductsHere')}</p>
                  </div>
                )}
              </div>
              
              {/* Summary */}
              {topProducts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{t('financeTotalRevenue')}</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        ${topProducts.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">{t('financeTotalProfit')}</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        ${topProducts.reduce((sum, p) => sum + p.profit, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sales by Category - Donut Chart Visualization */}
          {salesByCategory.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity size={20} className="text-primary" />
                    {t('financeSalesBy')}
                  </h3>
                  <Tooltip text={t('financeTooltipCategoryBreakdown')}>
                    <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
                  </Tooltip>
                </div>
                <span className="text-sm text-slate-500">
                  {salesByCategory.length} {salesByCategory.length === 1 ? t('financeCategoryLabel') : t('financeCategoriesLabel')}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                {/* Donut Chart - Larger with center text */}
                <div className="md:col-span-3 h-96 relative flex items-center justify-center">
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-4xl font-bold text-slate-900 dark:text-white">
                      ${salesByCategory.reduce((sum, c) => sum + c.revenue, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('financeTotalRevenue')}</p>
                    <div className="mt-2 px-3 py-1 bg-primary/10 rounded-full">
                      <p className="text-xs font-semibold text-primary">
                        {salesByCategory.length} {salesByCategory.length === 1 ? t('financeCategoryLabel') : t('financeCategoriesLabel')}
                      </p>
                    </div>
                  </div>
                  
                  <Doughnut
                    data={{
                      labels: salesByCategory.map(c => c.name),
                      datasets: [
                        {
                          data: salesByCategory.map(c => c.revenue),
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',   // Blue
                            'rgba(147, 51, 234, 0.8)',   // Purple
                            'rgba(236, 72, 153, 0.8)',   // Pink
                            'rgba(34, 197, 94, 0.8)',    // Green
                            'rgba(251, 146, 60, 0.8)',   // Orange
                            'rgba(14, 165, 233, 0.8)',   // Sky
                            'rgba(168, 85, 247, 0.8)',   // Violet
                            'rgba(239, 68, 68, 0.8)',    // Red
                          ],
                          borderColor: [
                            'rgb(59, 130, 246)',
                            'rgb(147, 51, 234)',
                            'rgb(236, 72, 153)',
                            'rgb(34, 197, 94)',
                            'rgb(251, 146, 60)',
                            'rgb(14, 165, 233)',
                            'rgb(168, 85, 247)',
                            'rgb(239, 68, 68)',
                          ],
                          borderWidth: 2,
                          hoverOffset: 10
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '65%',
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          padding: 12,
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          callbacks: {
                            label: (context) => {
                              const total = salesByCategory.reduce((sum, c) => sum + c.revenue, 0)
                              const value = context.parsed
                              const percentage = ((value / total) * 100).toFixed(1)
                              return [
                                `${context.label}`,
                                `${t('financeRevenue')}: $${value.toFixed(2)}`,
                                `${t('financeShare')}: ${percentage}%`
                              ]
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>

                {/* Legend with Stats - Adjusted column span */}
                <div className="md:col-span-2 space-y-2">
                  {salesByCategory.map((category, index) => {
                    const totalRevenue = salesByCategory.reduce((sum, c) => sum + c.revenue, 0)
                    const percentage = totalRevenue > 0 ? (category.revenue / totalRevenue) * 100 : 0
                    const colors = [
                      'bg-blue-500',
                      'bg-purple-500',
                      'bg-pink-500',
                      'bg-green-500',
                      'bg-orange-500',
                      'bg-sky-500',
                      'bg-violet-500',
                      'bg-red-500',
                    ]
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} flex-shrink-0`}></div>
                          <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate">
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-medium">
                            {percentage.toFixed(1)}%
                          </span>
                          <span className="font-semibold text-primary text-sm">
                            ${category.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* Category Summary */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{t('financeTopCategory')}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {salesByCategory[0]?.name || 'N/A'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{t('financeTotalRevenue')}</p>
                  <p className="text-sm font-semibold text-primary">
                    ${salesByCategory.reduce((sum, c) => sum + c.revenue, 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{t('financeAvgPerCategory')}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    ${(salesByCategory.reduce((sum, c) => sum + c.revenue, 0) / salesByCategory.length).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Store Comparison Section - Bottom of Overview Tab */}
          <StoreComparisonSection 
            startDate={new Date(currentDates.start)}
            endDate={new Date(currentDates.end)}
          />
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

// KPI Card Component - Enhanced with Tooltips
function KPICard({ 
  title, 
  value, 
  change, 
  icon, 
  color,
  showChange = true,
  subtitle,
  tooltip
}: { 
  title: string
  value: string
  change: number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  showChange?: boolean
  subtitle?: string
  tooltip?: string
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400'
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {showChange && (
          <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h3>
        {tooltip && (
          <Tooltip text={tooltip}>
            <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </Tooltip>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      )}
    </div>
  )
}

// Tooltip Component
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 whitespace-normal">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  )
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
  badge
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
        active
          ? 'bg-primary text-white shadow-md'
          : 'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}
