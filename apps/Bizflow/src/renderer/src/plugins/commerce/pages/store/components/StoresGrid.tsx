import React from 'react'
import { Store as StoreIcon } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Store as StoreType, ViewMode } from '../types'
import { StoreCard } from './StoreCard'
import { StoresTableView } from './StoresTableView'

interface StoresGridProps {
  stores: StoreType[]
  loading: boolean
  viewMode: ViewMode
  onEdit: (store: StoreType) => void
  onToggleStatus: (store: StoreType) => void
  onDelete: (id: string, name: string) => void
  onAddStore: () => void
}

export const StoresGrid: React.FC<StoresGridProps> = ({
  stores,
  loading,
  viewMode,
  onEdit,
  onToggleStatus,
  onDelete,
  onAddStore
}) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t('loadingStores') || 'Loading branch registries & active cash drawers...'}
        </span>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
          <StoreIcon className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {t('noStoresYet') || 'No Stores or Branches Found'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          {t('noStoresDesc') ||
            'Create your first physical branch location to bind inventory stock points and cash register terminals.'}
        </p>
        <button
          type="button"
          onClick={onAddStore}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs shadow-emerald-600/20 transition-all active:scale-95"
        >
          <span>{t('createFirstStore') || 'Register Main Branch'}</span>
        </button>
      </div>
    )
  }

  if (viewMode === 'table') {
    return (
      <StoresTableView
        stores={stores}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stores.map((store) => (
        <StoreCard
          key={store.id}
          store={store}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}