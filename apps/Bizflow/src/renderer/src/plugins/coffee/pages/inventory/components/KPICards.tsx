import { Package, Boxes, DollarSign, TrendingUp } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatMoney, formatNumber } from '../utils'

interface Props {
  kpis: {
    totalProducts: number
    totalUnits: number
    invValue: number
    expRevenue: number
  }
  loading: boolean
}

export function KPICards({ kpis, loading }: Props) {
  const { t } = useLanguage()
  const cards = [
    {
      label: t('cfTotalProducts'),
      value: formatNumber(kpis.totalProducts),
      sub:   t('cfInInventory'),
      icon:  Package,
      color: '#7c3aed',
      bg:    'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: t('cfStockUnits'),
      value: formatNumber(kpis.totalUnits),
      sub:   t('cfTotalUnits'),
      icon:  Boxes,
      color: '#0891b2',
      bg:    'bg-cyan-50 dark:bg-cyan-900/20',
    },
    {
      label: t('cfInventoryValue'),
      value: formatMoney(kpis.invValue),
      sub:   t('cfAtCostPrice'),
      icon:  DollarSign,
      color: '#dc2626',
      bg:    'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: t('cfExpectedRevenue'),
      value: formatMoney(kpis.expRevenue),
      sub:   t('cfIfAllSold'),
      icon:  TrendingUp,
      color: '#16a34a',
      bg:    'bg-green-50 dark:bg-green-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.label} className={`rounded-xl p-4 ${card.bg} border border-slate-200 dark:border-slate-700`}>
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.color + '20', color: card.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</div>
                <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
