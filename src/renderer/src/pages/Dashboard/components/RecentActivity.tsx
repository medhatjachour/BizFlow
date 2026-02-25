/**
 * RecentActivity Component
 * Recent sales and transactions
 */

import { useState, useEffect } from 'react'
import { Clock, DollarSign, ShoppingCart } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

export default function RecentActivity() {
  const { t } = useLanguage()
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const saleTransactionsApi = (globalThis as any).api?.saleTransactions
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 14)
      startDate.setHours(0, 0, 0, 0)

      const transactions = await saleTransactionsApi?.getByDateRange?.({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
      
      const recentActivities = (transactions || [])
        .filter((transaction: any) => transaction.status === 'completed')
        .map((transaction: any) => ({
          ...transaction,
          totalItems: (transaction.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
        }))
        .slice(0, 10)

      setActivities(recentActivities)
    } catch (error) {
      logger.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    
    if (seconds < 60) return t('justNow')
    if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t('minutesAgo')}`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${t('hoursAgo')}`
    return `${Math.floor(seconds / 86400)} ${t('daysAgo')}`
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock size={18} />
          {t('recentActivity')}
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map((activity, index) => (
            <div
              key={activity.id || index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="p-2 rounded-full bg-emerald-500/10">
                <ShoppingCart size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t('newSale')}
                  {activity.customerName && ` - ${activity.customerName}`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activity.totalItems || 0} item{(activity.totalItems || 0) === 1 ? '' : 's'} • {getTimeAgo(activity.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <DollarSign size={14} />
                <span className="text-sm">{activity.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No recent activity
          </p>
        </div>
      )}
    </div>
  )
}
