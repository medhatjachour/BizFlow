import React from 'react'
import { Store as StoreIcon, Phone, Clock, User, Power, Edit3, Trash2, MapPin } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Store } from '../types'
import { isStoreActive, getStatusBadgeConfig } from '../utils'

interface StoresTableViewProps {
  stores: Store[]
  onEdit: (store: Store) => void
  onToggleStatus: (store: Store) => void
  onDelete: (id: string, name: string) => void
}

export const StoresTableView: React.FC<StoresTableViewProps> = ({
  stores,
  onEdit,
  onToggleStatus,
  onDelete
}) => {
  const { t } = useLanguage()

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <th className="px-4 py-3 text-start">{t('branchOutlet') || 'Store / Branch'}</th>
              <th className="px-4 py-3 text-start">{t('address') || 'Location Address'}</th>
              <th className="px-4 py-3 text-start">{t('manager') || 'Branch Lead'}</th>
              <th className="px-4 py-3 text-start">{t('phone') || 'Contact Phone'}</th>
              <th className="px-4 py-3 text-start">{t('hours') || 'Operating Schedule'}</th>
              <th className="px-4 py-3 text-center">{t('status') || 'Status'}</th>
              <th className="px-4 py-3 text-end">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {stores.map((store) => {
              const active = isStoreActive(store)
              const badge = getStatusBadgeConfig(store.status)

              return (
                <tr
                  key={store.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Name */}
                  <td className="px-4 py-3 text-start align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                        <StoreIcon className="w-4 h-4" />
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {store.name}
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3 text-start align-middle text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1 max-w-xs truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{store.location || '—'}</span>
                    </div>
                  </td>

                  {/* Manager */}
                  <td className="px-4 py-3 text-start align-middle text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{store.manager || t('unassigned') || 'Unassigned'}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 text-start align-middle font-mono text-slate-600 dark:text-slate-300" dir="ltr">
                    {store.phone || '—'}
                  </td>

                  {/* Hours */}
                  <td className="px-4 py-3 text-start align-middle text-slate-500 dark:text-slate-400 font-medium" dir="ltr">
                    {store.hours || '09:00 AM - 10:00 PM'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                      {badge.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-end align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(store)}
                        className={`p-1.5 rounded-md transition-all ${
                          active
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                        title={active ? 'Deactivate Branch' : 'Activate Branch'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(store)}
                        className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Edit Branch"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(store.id, store.name)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}