import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, ShoppingCart, Calendar } from 'lucide-react'
import { formatLargeNumber, formatCurrency } from '@renderer/utils/formatNumber'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

type TopProduct = {
  productId: string
  productName: string
  category: string
  unitsSold: number
  revenue: number
  transactions: number
  avgUnitsPerTransaction: number
}

type CategoryPerformance = {
  category: string
  revenue: number
  unitsSold: number
  percentage: number
}

type OverallStats = {
  totalUnitsSold: number
  totalRevenue: number
  totalTransactions: number
  uniqueProducts: number
  avgOrderValue: number
}

export default function ProductAnalytics() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalUnitsSold: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    uniqueProducts: 0,
    avgOrderValue: 0
  })
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(timeRange))

      const dateParams = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }

      // Load both products and overall stats in parallel
      const [products, stats] = await Promise.all([
        (window as any).api?.analytics?.getTopSellingProducts({
          limit: 20,
          ...dateParams
        }),
        (window as any).api?.analytics?.getOverallStats(dateParams)
      ])
      
      setTopProducts(products || [])
      setOverallStats(stats || {
        totalUnitsSold: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        uniqueProducts: 0,
        avgOrderValue: 0
      })
    } catch (error) {
      logger.error('Error loading analytics:', error)
      setTopProducts([])
      setOverallStats({
        totalUnitsSold: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        uniqueProducts: 0,
        avgOrderValue: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate category performance from top products (for visualization only)
  const categoryPerformance: CategoryPerformance[] = topProducts.reduce((acc, product) => {
    const existing = acc.find(c => c.category === product.category)
    if (existing) {
      existing.revenue += product.revenue
      existing.unitsSold += product.unitsSold
    } else {
      acc.push({
        category: product.category,
        revenue: product.revenue,
        unitsSold: product.unitsSold,
        percentage: 0
      })
    }
    return acc
  }, [] as CategoryPerformance[])

  // Calculate percentages based on OVERALL revenue, not just top products
  categoryPerformance.forEach(c => {
    c.percentage = overallStats.totalRevenue > 0 ? (c.revenue / overallStats.totalRevenue) * 100 : 0
  })
  categoryPerformance.sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('salesAnalytics')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('performanceInsights')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          {['7', '30', '90', '365'].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === days
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {days === '365' ? t('oneYear') : `${days} ${t('sevenDays').replace('7', '').trim()}`}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">{t('loadingAnalytics')}</p>
          </div>
        </div>
      )}

      {!loading && topProducts.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-700">
          <TrendingUp size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {t('noSalesDataAvailable')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {t('salesAnalyticsWillAppear')}
          </p>
        </div>
      )}

      {!loading && topProducts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg">
                  <DollarSign size={24} className="text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1" title={`$${overallStats.totalRevenue.toLocaleString()}`}>
                {formatCurrency(overallStats.totalRevenue)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('totalRevenueLabel')}</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500 dark:bg-green-600 rounded-lg">
                  <Package size={24} className="text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1" title={overallStats.totalUnitsSold.toLocaleString()}>
                {formatLargeNumber(overallStats.totalUnitsSold)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('unitsSoldLabel')}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-500 dark:bg-purple-600 rounded-lg">
                  <ShoppingCart size={24} className="text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1" title={overallStats.totalTransactions.toLocaleString()}>
                {formatLargeNumber(overallStats.totalTransactions)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('transactionsLabel')}</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-amber-500 dark:bg-amber-600 rounded-lg">
                  <TrendingUp size={24} className="text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1" title={`$${overallStats.avgOrderValue.toLocaleString()}`}>
                {formatCurrency(overallStats.avgOrderValue)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('avgOrderValueLabel')}</div>
            </div>
          </div>

          {categoryPerformance.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('categoryPerformance')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('revenueDistributionByCategory')}</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {categoryPerformance.slice(0, 5).map((cat, index) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">#{index + 1}</span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{cat.category}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {formatLargeNumber(cat.unitsSold)} units
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-slate-900 dark:text-white" title={`$${cat.revenue.toLocaleString()}`}>
                            {formatCurrency(cat.revenue)}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {cat.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('topSellingProducts')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('bestPerformersInPeriod')}</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('rankColumn')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('productColumn')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('unitsSoldColumn')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('revenueColumn')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('transactionsColumn')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('avgUnitsPerOrder')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {topProducts.slice(0, 10).map((product, index) => (
                    <tr key={product.productId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">#{index + 1}</span>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full">{t('topBadge')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{product.productName}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{product.category}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-lg font-semibold text-slate-900 dark:text-white" title={product.unitsSold.toLocaleString()}>
                          {formatLargeNumber(product.unitsSold)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-lg font-bold text-green-600 dark:text-green-400" title={`$${product.revenue.toLocaleString()}`}>
                          {formatCurrency(product.revenue)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-slate-900 dark:text-white font-medium" title={product.transactions.toLocaleString()}>
                          {formatLargeNumber(product.transactions)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-medium">
                        {product.avgUnitsPerTransaction.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
