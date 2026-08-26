import React from 'react'
import { Pill, AlertTriangle, Clock, Package, DollarSign, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '../utils'
import type { BatchFilterKey } from '../types'

interface MedicinesStatsProps {
  metrics: {
    totalCount: number
    expiredCount: number
    expiringCount: number
    lowStockCount: number
    totalValuation: number
  }
  activeFilter: BatchFilterKey
  onSelectFilter: (filter: BatchFilterKey) => void
}

export const MedicinesStats: React.FC<MedicinesStatsProps> = ({
  metrics,
  activeFilter,
  onSelectFilter
}) => {
  const { t } = useLanguage()

  const cards = [
    {
      id: null,
      label: t('vetTotalMedicines') || 'Total Medicines',
      value: metrics.totalCount,
      icon: Pill,
      color: 'text-violet-600 dark:text-violet-400',
      activeRing: 'ring-violet-500/40 bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800',
      clickable: true
    },
    {
      id: 'expired' as BatchFilterKey,
      label: t('vetExpiredBatches') || 'Expired Batches',
      value: metrics.expiredCount,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      activeRing: 'ring-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800',
      clickable: true
    },
    {
      id: 'expiring' as BatchFilterKey,
      label: t('vetExpiring30') || 'Expiring ≤30 days',
      value: metrics.expiringCount,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      activeRing: 'ring-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
      clickable: true
    },
    {
      id: 'low_stock' as BatchFilterKey,
      label: t('vetLowStockCard') || 'Low Stock',
      value: metrics.lowStockCount,
      icon: Package,
      color: 'text-orange-600 dark:text-orange-400',
      activeRing: 'ring-orange-500/40 bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
      clickable: true
    },
    {
      id: '__valuation__',
      label: t('vetStockValue') || 'Stock Value',
      value: formatCurrency(metrics.totalValuation),
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      activeRing: '',
      clickable: false
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map(c => {
        const isActive = c.id !== '__valuation__' && activeFilter === c.id && c.id !== null

        return (
          <div
            key={c.label}
            onClick={() => {
              if (!c.clickable) return
              if (c.id === null) {
                onSelectFilter(null)
              } else {
                onSelectFilter(activeFilter === c.id ? null : (c.id as BatchFilterKey))
              }
            }}
            className={`border rounded-2xl p-4 transition-all duration-200 ${
              c.clickable ? 'cursor-pointer select-none' : ''
            } ${
              isActive
                ? `ring-2 ${c.activeRing}`
                : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 ${c.color}`}>
                <c.icon className="w-4 h-4" />
              </div>
              {isActive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full shadow-xs">
                  Active <X className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <p className={`text-xl font-bold tracking-tight ${c.color}`}>{c.value}</p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {c.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}