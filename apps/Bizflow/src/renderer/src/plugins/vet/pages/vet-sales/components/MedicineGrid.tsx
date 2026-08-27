import React from 'react'
import { Package, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { MedicineLite, CartItem } from '../types'
import { MedicineCard } from './MedicineCard'

interface Props {
  medicines: MedicineLite[]
  cart: CartItem[]
  loading: boolean
  onSelectMedicine: (med: MedicineLite) => void
}

export const MedicineGrid: React.FC<Props> = ({
  medicines,
  cart,
  loading,
  onSelectMedicine
}) => {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 text-violet-500 animate-spin stroke-[2.5]" />
      </div>
    )
  }

  if (medicines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <Package className="h-12 w-12 stroke-1 opacity-40 mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t('vetNoMedicinesFound') || 'No items matched your search'}
        </p>
        <p className="text-xs text-slate-400 mt-1">Try searching by active ingredient or brand</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-3">
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