import React from 'react'
import { Plus, RefreshCw, Layers } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  loading: boolean
  onRefresh: () => void
  onNewOrder: () => void
}

export const OperationsHero: React.FC<Props> = ({ loading, onRefresh, onNewOrder }) => {
  const { t } = useLanguage()

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-md">
      <div className="absolute top-0 right-1/3 -mt-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Layers className="w-3 h-3" />
              Fulfillment Command
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {t('warehouseOperationsControlTowerTitle') || 'Operations Control Tower'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            {t('warehouseOperationsControlTowerSubtitle') ||
              'Real-time inbound dock intake, quality control, picking waves, and outbound dispatch.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('warehouseRefresh') || 'Refresh'}
          </button>
          <button
            onClick={onNewOrder}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('warehouseNewJourneyOrder') || 'New Order'}
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono bg-indigo-700/80 rounded border border-indigo-400/40">
              ⌘N
            </kbd>
          </button>
        </div>
      </div>
    </div>
  )
}