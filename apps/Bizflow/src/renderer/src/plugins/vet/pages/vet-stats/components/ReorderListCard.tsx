import { PackageMinus } from 'lucide-react'
import { MedicineItem } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface ReorderListCardProps {
  outOfStock: MedicineItem[]
  lowStock: MedicineItem[]
  onNavigate?: (tab: string) => void
}

export function ReorderListCard({ outOfStock, lowStock, onNavigate }: ReorderListCardProps) {
  const { t } = useLanguage()
  const combined = [...outOfStock, ...lowStock]

  if (combined.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <PackageMinus size={16} className="text-amber-500" /> {t('vetReorderList') || 'Reorder Inventory Checklist'}
        </h3>
        <div className="flex items-center gap-1.5">
          {outOfStock.length > 0 && (
            <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
              {outOfStock.length} Out of Stock
            </span>
          )}
          {lowStock.length > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60">
              {lowStock.length} Low
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {combined.slice(0, 18).map((m) => {
          const stock = Number(m.totalStock) || 0
          const min = Number(m.minimumStock) || 0
          const isOut = stock <= 0

          return (
            <button
              key={m.id}
              type="button"
              disabled={!onNavigate}
              onClick={() => onNavigate?.('medicines')}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                isOut
                  ? 'border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20'
              } ${onNavigate ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'}`}
            >
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{m.name}</span>
              <span className={`text-[11px] font-bold shrink-0 ${isOut ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isOut ? 'OUT' : `${stock}/${min} ${m.unit || ''}`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}