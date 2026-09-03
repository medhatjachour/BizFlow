import React from 'react'
import { Store as StoreIcon, MapPin, Phone, Clock, User, Power, Edit3, Trash2, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Store as StoreType } from '../types'
import { isStoreActive, getStatusBadgeConfig } from '../utils'

interface StoreCardProps {
  store: StoreType
  onEdit: (store: StoreType) => void
  onToggleStatus: (store: StoreType) => void
  onDelete: (id: string, name: string) => void
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onEdit,
  onToggleStatus,
  onDelete
}) => {
  const { t } = useLanguage()
  const active = isStoreActive(store)
  const badgeConfig = getStatusBadgeConfig(store.status)

  return (
    <div className="relative group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Header Accent Glow */}
      <div className={`absolute top-0 start-0 end-0 h-1 ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />

      <div>
        {/* Top Info Badge */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {store.name}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[180px]">{store.location || t('noLocationSet') || 'Location not set'}</span>
              </div>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.8 rounded-full text-[10px] font-semibold border ${badgeConfig.badgeClass} shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badgeConfig.dotClass}`} />
            {badgeConfig.label}
          </span>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Phone */}
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Phone className="w-3.5 h-3.5" />
              <span>{t('phone') || 'Contact'}:</span>
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-medium" dir="ltr">
              {store.phone || '—'}
            </span>
          </div>

          {/* Hours */}
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('hours') || 'Business Hours'}:</span>
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300" dir="ltr">
              {store.hours || '09:00 AM - 10:00 PM'}
            </span>
          </div>

          {/* Manager */}
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <User className="w-3.5 h-3.5" />
              <span>{t('manager') || 'Branch Lead'}:</span>
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {store.manager || t('unassigned') || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-4 pt-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>POS Register Link</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleStatus(store)}
            className={`p-1.5 rounded-lg border transition-all ${
              active
                ? 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
            title={active ? t('deactivateStore') || 'Deactivate Store' : t('activateStore') || 'Activate Store'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(store)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title={t('editStore') || 'Edit Branch Details'}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(store.id, store.name)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
            title={t('deleteStore') || 'Delete Store Record'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}