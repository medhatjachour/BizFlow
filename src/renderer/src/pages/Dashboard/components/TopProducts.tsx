/**
 * TopProducts Component
 * Best selling products
 */

import { useState, useEffect } from 'react'
import { TrendingUp, Package } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

export default function TopProducts() {
  const { t } = useLanguage()
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTopProducts()
  }, [])

  const loadTopProducts = async () => {
    try {
      setLoading(true)
      const saleTransactionsApi = (globalThis as any).api?.saleTransactions
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)

      const transactions = await saleTransactionsApi?.getByDateRange?.({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      // Calculate product sales using transaction items
      const productSales = new Map<string, { name: string; revenue: number; quantity: number }>()
      
      ;(transactions || []).forEach((transaction: any) => {
        if (transaction.status !== 'completed') return

        (transaction.items || []).forEach((item: any) => {
          if (!item?.productId) return

          const existing = productSales.get(item.productId) || { 
            name: item.product?.name || 'Unknown Product',
            revenue: 0,
            quantity: 0
          }

          existing.revenue += item.total ?? item.price * item.quantity
          existing.quantity += item.quantity
          productSales.set(item.productId, existing)
        })
      })

      const sorted = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      setTopProducts(sorted)
    } catch (error) {
      logger.error('Error loading top products:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp size={18} />
        {t('topSellingProducts')}
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : topProducts.length > 0 ? (
        <div className="space-y-2">
          {topProducts.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary font-bold text-sm">
                #{index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {product.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {product.quantity} {t('unitsSold')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  ${product.revenue.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('noProductsSold')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {t('startSelling')}
          </p>
        </div>
      )}
    </div>
  )
}
