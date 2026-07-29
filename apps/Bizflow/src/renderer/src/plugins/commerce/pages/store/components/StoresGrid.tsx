import { Store } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Store as StoreType } from '../types'
import { StoreCard } from './StoreCard'

type StoresGridProps = {
  stores: StoreType[]
  loading: boolean
  onEdit: (store: StoreType) => void
  onToggleStatus: (store: StoreType) => void
  onDelete: (id: string) => void
}

export function StoresGrid({
  stores,
  loading,
  onEdit,
  onToggleStatus,
  onDelete,
}: StoresGridProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-full text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">{t('loadingStores')}</p>
        </div>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-full text-center py-12">
          <Store size={48} className="mx-auto mb-4 text-slate-400 opacity-50" />
          <p className="text-slate-600 dark:text-slate-400">{t('noStoresYet')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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