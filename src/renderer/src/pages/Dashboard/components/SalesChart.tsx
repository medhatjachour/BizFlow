/**
 * SalesChart Component
 * Visual representation of sales over time with key metrics
 */

import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Calendar, DollarSign, ShoppingBag, Percent } from 'lucide-react'
import { formatCurrency, formatLargeNumber } from '@renderer/utils/formatNumber'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

export default function SalesChart() {
  const { t } = useLanguage()
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7days' | '30days'>('7days')
  // Previous-period totals for trend comparison (no raw transactions needed)
  const [prevStats, setPrevStats] = useState<{ revenue: number; count: number }>({ revenue: 0, count: 0 })

  useEffect(() => {
    loadChartData()
  }, [period])

  const loadChartData = async () => {
    try {
      setLoading(true)
      const dashboardApi = (globalThis as any).api?.dashboard
      const days = period === '7days' ? 7 : 30

      // Fetch the full 2× range so we can derive previous-period totals for comparison.
      // The server returns pre-aggregated { date, total, count } rows — no items loaded.
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days * 2)
      startDate.setHours(0, 0, 0, 0)

      const dailyRows: Array<{ date: string; total: number; count: number }> =
        await dashboardApi?.getSalesChart?.({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }) || []

      // Index by YYYY-MM-DD for O(1) lookup
      const byDate = new Map(dailyRows.map((r) => [r.date, r]))

      // Cutoff between previous and current period
      const currentStart = new Date()
      currentStart.setDate(currentStart.getDate() - days)
      currentStart.setHours(0, 0, 0, 0)
      const currentStartStr = currentStart.toISOString().slice(0, 10)

      // Build per-day chart data for the current period
      const data: any[] = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        d.setHours(0, 0, 0, 0)
        const key = d.toISOString().slice(0, 10)
        const row = byDate.get(key) || { total: 0, count: 0 }
        data.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total: row.total,
          count: row.count,
        })
      }
      setChartData(data)

      // Compute previous-period totals from the older half of the fetched data
      let prevRevenue = 0
      let prevCount = 0
      for (const row of dailyRows) {
        if (row.date < currentStartStr) {
          prevRevenue += row.total
          prevCount += row.count
        }
      }
      setPrevStats({ revenue: prevRevenue, count: prevCount })
    } catch (error) {
      logger.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate key metrics from pre-aggregated server data
  const metrics = useMemo(() => {
    const totalRevenue = chartData.reduce((sum, d) => sum + d.total, 0)
    const totalSales = chartData.reduce((sum, d) => sum + d.count, 0)
    const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

    const revenueChange = prevStats.revenue > 0
      ? ((totalRevenue - prevStats.revenue) / prevStats.revenue) * 100
      : totalRevenue > 0 ? 100 : 0

    const salesChange = prevStats.count > 0
      ? ((totalSales - prevStats.count) / prevStats.count) * 100
      : totalSales > 0 ? 100 : 0

    return {
      totalRevenue,
      totalSales,
      avgSale,
      revenueChange,
      salesChange,
      hasData: chartData.length > 0 && totalRevenue > 0
    }
  }, [chartData, prevStats])

  const maxValue = Math.max(...chartData.map(d => d.total), 1)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp size={20} />
          {t('salesOverview')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              period === '7days'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('sevenDays')}
          </button>
          <button
            onClick={() => setPeriod('30days')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              period === '30days'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('thirtyDays')}
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {!loading && metrics.hasData && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-success/10 to-emerald-50 dark:from-success/20 dark:to-slate-800 rounded-lg p-4 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                <DollarSign size={16} className="text-success" />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('totalRevenue')}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1" title={`$${metrics.totalRevenue.toLocaleString()}`}>
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${metrics.revenueChange >= 0 ? 'text-success' : 'text-error'}`}>
              {metrics.revenueChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(metrics.revenueChange).toFixed(1)}%</span>
              <span className="text-slate-500 dark:text-slate-400">{t('vsPrevPeriod')}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-blue-50 dark:from-primary/20 dark:to-slate-800 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShoppingBag size={16} className="text-primary" />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('totalSales')}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1" title={metrics.totalSales.toLocaleString()}>
              {formatLargeNumber(metrics.totalSales)}
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${metrics.salesChange >= 0 ? 'text-success' : 'text-error'}`}>
              {metrics.salesChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(metrics.salesChange).toFixed(1)}%</span>
              <span className="text-slate-500 dark:text-slate-400">{t('vsPrevPeriod')}</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-accent/10 to-orange-50 dark:from-accent/20 dark:to-slate-800 rounded-lg p-4 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <Percent size={16} className="text-accent" />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('avgSaleValue')}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1" title={`$${metrics.avgSale.toLocaleString()}`}>
              {formatCurrency(metrics.avgSale)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('perTransaction')}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading sales data...</p>
          </div>
        </div>
      ) : metrics.hasData ? (
        <div className="space-y-4">
          {/* Chart */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-end justify-between gap-2 h-56">
              {chartData.map((data, index) => {
                // Calculate height as pixels instead of percentage for better visibility
                const heightPx = Math.max((data.total / maxValue) * 192, 8) // 192px = h-48 (12rem)
                const isToday = index === chartData.length - 1
                
                return (
                  <div key={`bar-${data.date}-${index}`} className="flex-1 flex flex-col items-center gap-2 group min-w-0">
                    {/* Bar container with fixed height */}
                    <div className="relative w-full h-48 flex items-end justify-center">
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-slate-900 dark:bg-slate-700 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                          <div className="font-semibold mb-1">{data.date}</div>
                          <div className="text-success font-bold" title={`$${data.total.toLocaleString()}`}>{formatCurrency(data.total)}</div>
                          <div className="text-slate-300" title={`${data.count} sales`}>{formatLargeNumber(data.count)} sale{data.count !== 1 ? 's' : ''}</div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg cursor-pointer ${
                          isToday 
                            ? 'bg-gradient-to-t from-success via-emerald-400 to-emerald-300 shadow-lg shadow-success/30' 
                            : 'bg-gradient-to-t from-primary via-blue-500 to-secondary hover:from-primary/90'
                        }`}
                        style={{ height: `${heightPx}px` }}
                      ></div>
                    </div>
                    
                    {/* Date label */}
                    <span className={`text-[10px] font-medium whitespace-nowrap ${
                      isToday ? 'text-success font-bold' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {period === '7days' ? data.date.split(' ')[1] : data.date.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Summary Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Last {period === '7days' ? '7' : '30'} days • {chartData.filter(d => d.count > 0).length} active days
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Peak:</span>
              <span className="text-sm font-bold text-primary" title={`$${Math.max(...chartData.map(d => d.total)).toLocaleString()}`}>
                {formatCurrency(Math.max(...chartData.map(d => d.total)))}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={32} className="text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Sales Data</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Start making sales to see your performance chart
            </p>
            <button 
              onClick={() => window.location.href = '/pos'}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Go to POS
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
