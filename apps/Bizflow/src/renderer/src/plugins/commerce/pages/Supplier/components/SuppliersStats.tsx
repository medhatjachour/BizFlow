import React from 'react'
import { Users, UserCheck, ShoppingCart, DollarSign  } from 'lucide-react'
import { formatCurrency } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface SuppliersStatsProps {
  totalSuppliers: number
  activeSuppliers: number
  totalOrders: number
  totalSpend: number
}

export const SuppliersStats: React.FC<SuppliersStatsProps> = ({
  totalSuppliers,
  activeSuppliers,
  totalOrders,
  totalSpend
}) => {
  const { t } = useLanguage()

  const cards = [
    {
      label: t('totalSuppliers') || 'Total Suppliers',
      value: totalSuppliers,
      subtext: `${activeSuppliers} active partners`,
      icon: <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      accentBg: 'bg-indigo-50 dark:bg-indigo-950/50',
      borderGlow: 'border-l-indigo-500'
    },
    {
      label: t('activeAccounts') || 'Active Direct',
      value: activeSuppliers,
      subtext: `${totalSuppliers - activeSuppliers} inactive`,
      icon: <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/50',
      borderGlow: 'border-l-emerald-500'
    },
    {
      label: t('purchaseOrders') || 'Purchase Invoices',
      value: totalOrders,
      subtext: 'Lifetime cycles',
      icon: <ShoppingCart className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      accentBg: 'bg-amber-50 dark:bg-amber-950/50',
      borderGlow: 'border-l-amber-500'
    },
    {
      label: t('totalSpend') || 'Cumulative Spend',
      value: formatCurrency(totalSpend),
      subtext: 'Settled vendor ledgers',
      icon: <DollarSign className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
      accentBg: 'bg-sky-50 dark:bg-sky-950/50',
      borderGlow: 'border-l-sky-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 shadow-xs hover:shadow-md transition-all duration-200 border-l-4 ${card.borderGlow}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight">
              {card.label}
            </span>
            <div className={`p-2 rounded-lg ${card.accentBg}`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {card.value}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{card.subtext}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}