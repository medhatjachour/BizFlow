import React from 'react'
import { Trash2, Loader2, PackageX, FileText } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { WasteLog } from '../types'
import { formatCurrency, formatDate, formatQuantity, getWasteTypeMeta } from '../utils'

interface Props {
  logs: WasteLog[]
  loading: boolean
  onDelete: (id: string) => void
}

export const WasteTable: React.FC<Props> = ({ logs, loading, onDelete }) => {
  const { t } = useLanguage()

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden backdrop-blur-sm">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-2" />
          <p className="text-xs text-slate-400">{t('bakeryLoadingLogs') || 'Loading waste history…'}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <PackageX className="h-6 w-6 opacity-40 text-slate-600 dark:text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t('bakeryNoWasteLogs') || 'No waste logs found'}
          </p>
          <p className="text-xs mt-1 text-slate-400">
            {t('bakeryNoWasteDesc') || 'No waste events recorded matching your current filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">{t('bakeryWasteDate') || 'Date'}</th>
                <th className="px-5 py-3.5">{t('bakeryWasteColType') || 'Type'}</th>
                <th className="px-5 py-3.5">{t('bakeryWasteItemName') || 'Item / Recipe'}</th>
                <th className="px-5 py-3.5 text-right">{t('bakeryWasteQuantity') || 'Loss Qty'}</th>
                <th className="px-5 py-3.5 text-right">{t('bakeryWasteCost') || 'Loss Value'}</th>
                <th className="px-5 py-3.5">{t('bakeryWasteReason') || 'Reason'}</th>
                <th className="px-5 py-3.5">{t('bakeryWasteColLinked') || 'Origin / Link'}</th>
                <th className="px-5 py-3.5 text-right">{t('bakeryActions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {logs.map(log => {
                const meta = getWasteTypeMeta(log.wasteType)
                const Icon = meta.icon

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-700/20 transition-colors group"
                  >
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                      {formatDate(log.wasteDate)}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.badge}`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{t(meta.labelKey) || meta.defaultLabel}</span>
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-900 dark:text-white font-medium max-w-xs">
                      <div className="flex flex-col">
                        <span className="truncate">{log.itemName}</span>
                        {log.notes && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <FileText className="h-3 w-3" />
                            <span className="truncate">{log.notes}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatQuantity(log.quantity, log.unit)}
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      −{formatCurrency(log.cost)}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium">
                        {log.reason ?? '—'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {log.pantryIngredient ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          Pantry: {log.pantryIngredient.name}
                        </span>
                      ) : log.recipe ? (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          Recipe: {log.recipe.name}
                        </span>
                      ) : log.product ? (
                        <span className="font-medium text-rose-600 dark:text-rose-400">
                          Product: {log.product.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onDelete(log.id)}
                        title="Delete log"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}