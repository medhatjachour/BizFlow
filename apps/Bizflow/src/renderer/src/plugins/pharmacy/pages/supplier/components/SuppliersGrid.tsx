import React from 'react'
import { Truck, Pencil, Trash2, Phone, Mail, MapPin, Loader2, Boxes, Layers } from 'lucide-react'
import { PharmacySupplierItem } from '../types'

interface SuppliersGridProps {
  suppliers: PharmacySupplierItem[]
  loading: boolean
  onEdit: (s: PharmacySupplierItem) => void
  onDelete: (s: PharmacySupplierItem) => void
  t: (k: string) => string
}

export const SuppliersGrid: React.FC<SuppliersGridProps> = ({
  suppliers,
  loading,
  onEdit,
  onDelete,
  t,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-500 mb-2" />
        <p className="text-xs">Loading supplier records...</p>
      </div>
    )
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Truck size={36} className="mb-2 opacity-30" />
        <p className="text-sm font-medium">{t('phNoSuppliers') || 'No suppliers registered yet'}</p>
        <p className="text-xs mt-0.5">Click "Add Supplier" above to record medicine distributors & pharmaceutical vendors.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {suppliers.map(s => (
        <div
          key={s.id}
          className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50">
                  <Truck size={17} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                    {s.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.2">
                    {s.orderCount || 0} orders · {s.batchCount || 0} batches
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(s)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800"
                  title="Edit supplier"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(s)}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Delete supplier"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Sourced Metrics Counter */}
            <div className="mt-3 grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                <Layers size={11} className="text-slate-400" />
                <span>{s.orderCount || 0}</span>
                <span className="text-[9px] font-normal text-slate-400">POs</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                <Boxes size={11} className="text-emerald-500" />
                <span>{s.batchCount || 0}</span>
                <span className="text-[9px] font-normal text-slate-400">Batches</span>
              </div>
            </div>

            {/* Contact Details */}
            {(s.phone || s.email || s.address) && (
              <div className="mt-2.5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                {s.phone && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Phone size={10} className="shrink-0 text-slate-400" /> {s.phone}
                  </p>
                )}
                {s.email && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail size={10} className="shrink-0 text-slate-400" /> {s.email}
                  </p>
                )}
                {s.address && (
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin size={10} className="shrink-0 text-slate-400" /> {s.address}
                  </p>
                )}
              </div>
            )}
          </div>

          {s.notes && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 italic line-clamp-1">
              "{s.notes}"
            </div>
          )}
        </div>
      ))}
    </div>
  )
}