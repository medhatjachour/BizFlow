import React from 'react'
import { Package, AlertTriangle, AlertCircle, Layers } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { MaterialStats, StockFilter, ExpiryFilter } from '../types'

interface Props {
  stats: MaterialStats | null
  stockFilter: StockFilter
  expiryFilter: ExpiryFilter
  onSelectTotal: () => void
  onSelectLowStock: () => void
  onSelectExpired: () => void
  onSelectExpiringSoon: () => void
}

export const MaterialStatCards: React.FC<Props> = ({
  stats,
  stockFilter,
  expiryFilter,
  onSelectTotal,
  onSelectLowStock,
  onSelectExpired,
  onSelectExpiringSoon
}) => {
  const { t } = useLanguage()
  if (!stats) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      <StatCard
        icon={<Package className="h-5 w-5" />}
        label={t('materialStatsTotal') || 'Total Inventory'}
        value={stats.total}
        color="teal"
        active={stockFilter === 'all' && expiryFilter === 'all'}
        onClick={onSelectTotal}
      />
      <StatCard
        icon={<AlertTriangle className="h-5 w-5" />}
        label={t('materialStatsLowStock') || 'Low Stock Threshold'}
        value={stats.lowStock}
        color={stats.lowStock > 0 ? 'amber' : 'teal'}
        active={stockFilter === 'low_stock'}
        onClick={onSelectLowStock}
      />
      <StatCard
        icon={<AlertCircle className="h-5 w-5" />}
        label={t('materialStatsExpired') || 'Expired Batches'}
        value={stats.expired}
        color={stats.expired > 0 ? 'rose' : 'teal'}
        active={expiryFilter === 'expired'}
        onClick={onSelectExpired}
      />
      <StatCard
        icon={<Layers className="h-5 w-5" />}
        label={t('materialStatsExpiringSoon') || 'Expiring in 30 Days'}
        value={stats.expiringSoon}
        color={stats.expiringSoon > 0 ? 'orange' : 'teal'}
        active={expiryFilter === 'expiring_soon'}
        onClick={onSelectExpiringSoon}
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
  active,
  onClick
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'teal' | 'amber' | 'rose' | 'orange'
  active?: boolean
  onClick?: () => void
}) {
  const theme = {
    teal:   'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
    amber:  'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    rose:   'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    orange: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start rounded-3xl border bg-white dark:bg-slate-800 p-4 sm:p-5 flex items-start gap-4 transition-all shadow-xs ${
        active
          ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
          : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${theme[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate mb-0.5">{label}</p>
        <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">{value}</p>
      </div>
    </button>
  )
}