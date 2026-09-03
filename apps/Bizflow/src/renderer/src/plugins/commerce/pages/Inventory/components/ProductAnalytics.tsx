import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Trophy
} from 'lucide-react'
import { formatLargeNumber, formatCurrency } from '@renderer/utils/formatNumber'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'

type TopProduct = {
  productId: string
  productName: string
  category: string
  unitsSold: number
  revenue: number
  transactions: number
  avgUnitsPerTransaction: number
}

type OverallStats = {
  totalUnitsSold: number
  totalRevenue: number
  totalTransactions: number
  uniqueProducts: number
  avgOrderValue: number
}

type CategoryPerformance = {
  category: string
  revenue: number
  unitsSold: number
}

const EMPTY_STATS: OverallStats = {
  totalUnitsSold: 0,
  totalRevenue: 0,
  totalTransactions: 0,
  uniqueProducts: 0,
  avgOrderValue: 0
}

const PERIODS = [
  { value: '7', labelKey: 'inventoryUiSevenDays' },
  { value: '30', labelKey: 'inventoryUiThirtyDays' },
  { value: '90', labelKey: 'inventoryUiNinetyDays' },
  { value: '365', labelKey: 'inventoryUiOneYear' }
] as const

export default function ProductAnalytics() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [overallStats, setOverallStats] = useState<OverallStats>(EMPTY_STATS)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    void loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - Number(timeRange))
      const dateParams = { startDate: startDate.toISOString(), endDate: endDate.toISOString() }

      const [products, stats] = await Promise.all([
        (window as any).api?.analytics?.getTopSellingProducts({ limit: 20, ...dateParams }),
        (window as any).api?.analytics?.getOverallStats(dateParams)
      ])

      setTopProducts(products || [])
      setOverallStats(stats || EMPTY_STATS)
    } catch (loadError) {
      logger.error('Error loading analytics:', loadError)
      setTopProducts([])
      setOverallStats(EMPTY_STATS)
      setError(t('inventoryUiAnalyticsLoadError'))
    } finally {
      setLoading(false)
    }
  }

  const categoryPerformance = useMemo(() => {
    return topProducts
      .reduce((categories, product) => {
        const categoryName = product.category || 'Uncategorized'
        const existing = categories.find((category) => category.category === categoryName)
        if (existing) {
          existing.revenue += product.revenue
          existing.unitsSold += product.unitsSold
        } else {
          categories.push({
            category: categoryName,
            revenue: product.revenue,
            unitsSold: product.unitsSold
          })
        }
        return categories
      }, [] as CategoryPerformance[])
      .sort((a, b) => b.revenue - a.revenue)
  }, [topProducts])

  const leadingProduct = topProducts[0]
  const largestCategoryRevenue = Math.max(categoryPerformance[0]?.revenue || 0, 1)

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">{t('salesAnalytics')}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('inventoryUiSalesDescription')}</p>
          </div>
        </div>

        <div className="inline-flex self-start lg:self-auto items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" aria-label={t('inventoryUiAnalyticsPeriod')}>
          <CalendarDays size={14} className="mx-1.5 text-slate-400" />
          {PERIODS.map((period) => (
            <button
              key={period.value}
              type="button"
              onClick={() => setTimeRange(period.value)}
              className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-colors ${
                timeRange === period.value
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t(period.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300"><AlertTriangle size={15} />{error}</div>
          <button type="button" onClick={() => void loadAnalytics()} className="text-[11px] font-bold text-rose-700 dark:text-rose-300">{t('inventoryUiRetry')}</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-24 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />)}
          </div>
          <div className="h-72 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
        </div>
      ) : topProducts.length === 0 && !error ? (
        <div className="min-h-72 flex flex-col items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center px-6">
          <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"><TrendingUp size={22} className="text-slate-400" /></div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('noSalesDataAvailable')}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('salesAnalyticsWillAppear')}</p>
        </div>
      ) : topProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {[
              { label: t('inventoryUiRevenue'), value: formatCurrency(overallStats.totalRevenue), icon: DollarSign, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' },
              { label: t('inventoryUiUnitsSold'), value: formatLargeNumber(overallStats.totalUnitsSold), icon: Package, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
              { label: t('inventoryUiTransactions'), value: formatLargeNumber(overallStats.totalTransactions), icon: ShoppingCart, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' },
              { label: t('inventoryUiAverageOrder'), value: formatCurrency(overallStats.avgOrderValue), icon: TrendingUp, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
              { label: t('inventoryUiProductsSold'), value: formatLargeNumber(overallStats.uniqueProducts), icon: BarChart3, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' }
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-3 ${metric.color}`}><metric.icon size={14} /></div>
                <p className="text-lg font-bold text-slate-950 dark:text-white tabular-nums">{metric.value}</p>
                <p className="text-[10px] font-semibold uppercase text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            <section className="xl:col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800"><h3 className="text-xs font-bold text-slate-900 dark:text-white">{t('inventoryUiCategoryMix')}</h3><p className="text-[10px] text-slate-500">{t('inventoryUiCategoryMixDescription')}</p></div>
              <div className="p-4 space-y-3.5">
                {categoryPerformance.slice(0, 6).map((category, index) => (
                  <div key={category.category}>
                    <div className="flex items-center justify-between gap-4 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0"><span className="w-5 text-[10px] font-bold text-slate-300">{String(index + 1).padStart(2, '0')}</span><span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{category.category}</span></div>
                      <div className="text-right whitespace-nowrap"><span className="text-[11px] font-bold text-slate-900 dark:text-white">{formatCurrency(category.revenue)}</span><span className="ml-2 text-[9px] text-slate-400">{formatLargeNumber(category.unitsSold)} {t('inventoryUiUnits')}</span></div>
                    </div>
                    <div className="ml-7 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max((category.revenue / largestCategoryRevenue) * 100, 2)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            {leadingProduct && (
              <section className="xl:col-span-2 rounded-lg border border-slate-800 bg-slate-950 text-white p-4 flex flex-col justify-between min-h-56">
                <div><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-amber-400">{t('inventoryUiPeriodLeader')}</span><Trophy size={17} className="text-amber-400" /></div><h3 className="mt-5 text-lg font-bold leading-tight">{leadingProduct.productName}</h3><p className="mt-1 text-[11px] text-slate-400">{leadingProduct.category || t('uncategorized')}</p></div>
                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10">
                  <div><p className="text-base font-bold">{formatLargeNumber(leadingProduct.unitsSold)}</p><p className="text-[9px] text-slate-400">{t('inventoryUiUnits')}</p></div>
                  <div><p className="text-base font-bold text-emerald-400">{formatCurrency(leadingProduct.revenue)}</p><p className="text-[9px] text-slate-400">{t('inventoryUiRevenue')}</p></div>
                  <div><p className="text-base font-bold">{leadingProduct.transactions}</p><p className="text-[9px] text-slate-400">{t('inventoryUiOrders')}</p></div>
                </div>
              </section>
            )}
          </div>

          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"><div><h3 className="text-xs font-bold text-slate-900 dark:text-white">{t('inventoryUiProductRanking')}</h3><p className="text-[10px] text-slate-500">{t('inventoryUiProductRankingDescription')}</p></div><span className="text-[10px] font-semibold text-slate-400">{t('inventoryUiTop')} {Math.min(topProducts.length, 10)}</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800"><tr className="text-[9px] uppercase text-slate-500"><th className="px-4 py-2.5 w-14">{t('inventoryUiRank')}</th><th className="px-4 py-2.5">{t('Product')}</th><th className="px-4 py-2.5 text-right">{t('inventoryUiUnits')}</th><th className="px-4 py-2.5 text-right">{t('inventoryUiRevenue')}</th><th className="px-4 py-2.5 text-right">{t('inventoryUiOrders')}</th><th className="px-4 py-2.5 text-right">{t('inventoryUiUnitsPerOrder')}</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topProducts.slice(0, 10).map((product, index) => (
                    <tr key={product.productId} className="hover:bg-sky-50/40 dark:hover:bg-sky-950/10 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-slate-400">#{index + 1}</td>
                      <td className="px-4 py-3"><p className="text-xs font-bold text-slate-900 dark:text-white">{product.productName}</p><p className="text-[10px] text-slate-400">{product.category || t('uncategorized')}</p></td>
                      <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">{formatLargeNumber(product.unitsSold)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(product.revenue)}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{formatLargeNumber(product.transactions)}</td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{product.avgUnitsPerTransaction.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}