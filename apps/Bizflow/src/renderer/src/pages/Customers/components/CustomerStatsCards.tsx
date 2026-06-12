import { Heart, DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  totalCount: number
  totalRevenue: number
  averageSpent: number
}

export function CustomerStatsCards({ totalCount, totalRevenue, averageSpent }: Props) {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalCustomers')}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Heart size={24} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalRevenue')}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1" title={`$${totalRevenue.toFixed(2)}`}>
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <DollarSign size={24} className="text-success" />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('averageSpent')}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1" title={`$${averageSpent.toFixed(2)}`}>
              {formatCurrency(averageSpent)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <TrendingUp size={24} className="text-accent" />
          </div>
        </div>
      </div>
    </div>
  )
}
