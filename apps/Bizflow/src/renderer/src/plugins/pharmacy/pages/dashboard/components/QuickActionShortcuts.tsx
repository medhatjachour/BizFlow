import React from 'react'
import { ShoppingCart, PackagePlus, Truck, FileBarChart, RefreshCw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface QuickActionShortcutsProps {
  onNavigate?: (tab: string) => void
  onRefresh: () => void
  loading: boolean
}

export const QuickActionShortcuts: React.FC<QuickActionShortcutsProps> = ({
  onNavigate,
  onRefresh,
  loading,
}) => {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onNavigate?.('pos')}
        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs transition-colors"
      >
        <ShoppingCart size={13} /> {t('phQaOpenPos')}
      </button>
      <button
        onClick={() => onNavigate?.('products')}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
      >
        <PackagePlus size={13} /> {t('phAddProduct')}
      </button>
      <button
        onClick={() => onNavigate?.('orders')}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
      >
        <Truck size={13} /> {t('phQaCreatePo')}
      </button>
      <button
        onClick={() => onNavigate?.('reports')}
        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
      >
        <FileBarChart size={13} /> {t('phQaAnalytics')}
      </button>
      <div className="flex-1" />
      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        title={t('phRefreshDashboard')}
      >
        <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-500' : ''} />
      </button>
    </div>
  )
}