import React from 'react'
import {
  Package,
  Boxes,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { categoryBadgeCls, expiryStatus, formatDate } from '../utils'
import type { Material, Category } from '../types'

interface Props {
  materials: Material[]
  categories: Category[]
  loading: boolean
  onManageBatches: (m: Material) => void
  onEdit: (m: Material) => void
  onDelete: (id: string) => void
  onAddNew: () => void
}

export const MaterialTable: React.FC<Props> = ({
  materials,
  categories,
  loading,
  onManageBatches,
  onEdit,
  onDelete,
  onAddNew
}) => {
  const { t } = useLanguage()

  if (loading) {
    return <TableSkeleton />
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mb-3 shadow-xs">
          <Package className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {t('noMaterials') || 'No inventory materials found'}
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Keep track of dental & medical stock, expiry dates, and lot numbers in one unified inventory.
        </p>
        <button
          onClick={onAddNew}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t('newMaterial') || 'Add First Material'}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full min-w-[780px] text-start text-xs">
          <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/80 text-slate-400 uppercase tracking-wider font-bold">
            <tr>
              <th className="px-5 py-3.5 text-start">{t('materialName') || 'Material Name'}</th>
              <th className="px-4 py-3.5 text-start">{t('materialCategory') || 'Category'}</th>
              <th className="px-4 py-3.5 text-center">{t('materialQuantity') || 'Quantity'}</th>
              <th className="px-4 py-3.5 text-center">{t('materialExpiryDate') || 'Expiry Health'}</th>
              <th className="px-4 py-3.5 text-center">{t('status') || 'Status'}</th>
              <th className="px-5 py-3.5 text-end">{t('actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
            {materials.map((m) => {
              const expStatus = expiryStatus(m.expiryDate)
              const isLow = m.minQuantity > 0 && m.quantity <= m.minQuantity
              const catColor = categories.find((c) => c.name === m.category)?.color ?? 'slate'

              return (
                <tr
                  key={m.id}
                  className={`group hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors ${
                    !m.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{m.name}</div>
                    {m.supplier && (
                      <div className="text-[11px] text-slate-400 mt-0.5 font-normal">{m.supplier}</div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {m.category ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${categoryBadgeCls(
                          catColor
                        )}`}
                      >
                        {m.category}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    <span
                      className={`font-extrabold text-sm ${
                        m.quantity <= 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : isLow
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {m.quantity}
                    </span>
                    <span className="text-slate-400 text-xs font-normal"> {m.unit}</span>
                    {m.quantity <= 0 && (
                      <span className="ms-1 text-rose-500 font-bold" title="Out of stock">●</span>
                    )}
                    {m.quantity > 0 && isLow && (
                      <span className="ms-1 text-amber-500 font-bold" title="Low stock threshold reached">⚠</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    {expStatus === 'expired' && (
                      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-3 w-3" />
                        {formatDate(m.expiryDate)}
                      </span>
                    )}
                    {expStatus === 'soon' && (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3" />
                        {formatDate(m.expiryDate)}
                      </span>
                    )}
                    {expStatus === 'ok' && (
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {formatDate(m.expiryDate)}
                      </span>
                    )}
                    {expStatus === 'none' && <span className="text-slate-400">—</span>}
                  </td>

                  <td className="px-4 py-3.5 text-center whitespace-nowrap">
                    {m.isActive ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('active') || 'Active'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-[11px]">
                        <X className="h-3.5 w-3.5" />
                        {t('inactive') || 'Inactive'}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-end whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onManageBatches(m)}
                        title={t('manageBatches') || 'Batches & Lots'}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
                      >
                        <Boxes className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(m)}
                        title={t('edit') || 'Edit'}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(m.id)}
                        title={t('delete') || 'Delete'}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
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

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 animate-pulse bg-white dark:bg-slate-800 p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-2xl w-full" />
      ))}
    </div>
  )
}