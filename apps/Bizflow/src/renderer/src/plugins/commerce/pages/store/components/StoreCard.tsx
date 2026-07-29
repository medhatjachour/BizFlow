import { Store, MapPin, Phone, Clock, ArrowRightLeft, Edit2, Trash2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Store as StoreType } from '../types'
import { isStoreActive, getStatusBadgeClass } from '../utils'

type StoreCardProps = {
  store: StoreType
  onEdit: (store: StoreType) => void
  onToggleStatus: (store: StoreType) => void
  onDelete: (id: string) => void
}

export function StoreCard({ store, onEdit, onToggleStatus, onDelete }: StoreCardProps) {
  const { t } = useLanguage()
  const active = isStoreActive(store)

  return (
    <div className="glass-card glass-card-hover p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Store className="text-primary" size={24} />
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(store.status)}`}
        >
          {store.status}
        </span>
      </div>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
        {store.name}
      </h3>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
          <MapPin size={16} />
          {store.location}
        </div>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
          <Phone size={16} />
          {store.phone}
        </div>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
          <Clock size={16} />
          {store.hours}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {t('manager')}: {store.manager}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(store)}
            className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
            title={t('editStore')}
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onToggleStatus(store)}
            className={`p-2 rounded-lg transition-colors ${
              active
                ? 'hover:bg-error/10 text-error'
                : 'hover:bg-success/10 text-success'
            }`}
            title={active ? t('deactivateStore') : t('activateStore')}
          >
            <ArrowRightLeft size={18} />
          </button>
          <button
            onClick={() => onDelete(store.id)}
            className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors"
            title={t('deleteStore')}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}