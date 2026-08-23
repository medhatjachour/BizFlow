import React from 'react'
import { AlertOctagon, RotateCw } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  message?: string
  onRetry: () => void
}

export const OverviewError: React.FC<Props> = ({ message, onRetry }) => {
  const { t } = useLanguage()

  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center flex flex-col items-center justify-center space-y-3.5 my-6">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('warehouseErrorLoadingOverview') || 'Failed to load warehouse data'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {message || t('warehouseErrorGenericDescription') || 'An unexpected error occurred while fetching real-time stats.'}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-sm transition-all active:scale-95"
      >
        <RotateCw className="w-3.5 h-3.5" />
        {t('retry') || 'Retry'}
      </button>
    </div>
  )
}