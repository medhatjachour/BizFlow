import React from 'react'
import { Package, Loader2, Plus, Check } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { MedicineLite, CartItem, CatalogViewMode } from '../types'
import { MedicineCard } from './MedicineCard'
import { remainingDisplay, getFefoBatch } from '../utils'

interface Props {
  medicines: MedicineLite[]
  cart: CartItem[]
  loading: boolean
  viewMode: CatalogViewMode
  onSelectMedicine: (med: MedicineLite) => void
}

export const MedicineGrid: React.FC<Props> = ({
  medicines,
  cart,
  loading,
  viewMode,
  onSelectMedicine
}) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin stroke-[2.5] mb-2" />
        <p className="text-xs font-semibold">Loading medical pharmacy catalog…</p>
      </div>
    )
  }

  if (medicines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <Package className="h-12 w-12 stroke-1 opacity-30 mb-3" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {t('vetNoMedicinesFound') || 'No items matched your search'}
        </p>
        <p className="text-xs text-slate-400 mt-1">Try refining search query or category filter</p>
      </div>
    )
  }

  // ── Dense List View ────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="px-4 py-2.5">Medicine</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Stock</th>
                <th className="px-4 py-2.5">FEFO Lot</th>
                <th className="px-4 py-2.5">Price</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {medicines.map(med => {
                const isInCart = cart.some(ci => ci.medicine.id === med.id)
                const fefoBatch = getFefoBatch(med.batches)
                const isOutOfStock = med.totalStock <= 0 || !fefoBatch
                const stock = remainingDisplay(
                  med.totalStock,
                  med.unit,
                  med.subUnit,
                  med.subUnitsPerContainer
                )
                const price = fefoBatch?.sellingPrice ?? fefoBatch?.costPerUnit ?? 0

                return (
                  <tr
                    key={med.id}
                    onClick={() => !isOutOfStock && onSelectMedicine(med)}
                    className={`transition-colors cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-40 bg-slate-50/50 cursor-not-allowed'
                        : isInCart
                        ? 'bg-violet-50/70 dark:bg-violet-950/20 hover:bg-violet-100/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                      {med.name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 capitalize">{med.category}</td>
                    <td className="px-4 py-2.5 font-bold tabular-nums">
                      <span
                        className={
                          med.isLowStock
                            ? 'text-amber-600'
                            : isOutOfStock
                            ? 'text-slate-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }
                      >
                        {stock.value} {stock.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">
                      {fefoBatch?.batchNumber || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-black text-violet-600 dark:text-violet-400">
                      ${price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        className={`p-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 ${
                          isInCart
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-violet-600 hover:text-white'
                        }`}
                      >
                        {isInCart ? <Check size={12} /> : <Plus size={12} />}
                      </button>
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

  // ── Compact POS Grid View ──────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
        {medicines.map(med => (
          <MedicineCard
            key={med.id}
            medicine={med}
            isInCart={cart.some(ci => ci.medicine.id === med.id)}
            onClick={() => onSelectMedicine(med)}
          />
        ))}
      </div>
    </div>
  )
}