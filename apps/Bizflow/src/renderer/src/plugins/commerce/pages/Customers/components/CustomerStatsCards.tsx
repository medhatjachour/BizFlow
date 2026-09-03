import { Heart, DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  totalCount: number
  totalRevenue: number
  averageSpent: number
}

export function CustomerStatsCards({ totalCount, totalRevenue, averageSpent }: Props) {
  const { t } = useLanguage()

  const stats = [
    {
      label: t('totalCustomers'),
      value: totalCount,
      icon: <Heart className="w-5 h-5 text-primary" />,
      bg: 'bg-primary/10',
      shadow: 'shadow-primary/20',
      tooltip: `${totalCount} ${t('customers')}`
    },
    {
      label: t('totalRevenue'),
      value: formatCurrency(totalRevenue),
      icon: <DollarSign className="w-5 h-5 text-success" />,
      bg: 'bg-success/10',
      shadow: 'shadow-success/20',
      tooltip: `$${totalRevenue.toFixed(2)}`
    },
    {
      label: t('averageSpent'),
      value: formatCurrency(averageSpent),
      icon: <TrendingUp className="w-5 h-5 text-accent" />,
      bg: 'bg-accent/10',
      shadow: 'shadow-accent/20',
      tooltip: `$${averageSpent.toFixed(2)}`
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map(({ label, value, icon, bg, shadow, tooltip }, i) => (
        <div
          key={i}
          className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-2xs"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
            <p
              className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight"
              title={tooltip}
            >
              {value}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${bg} ${shadow}`}
          >
            {icon}
          </div>
        </div>
      ))}
    </div>
  )
}
