import { AlertTriangle, Clock, Package, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { ExpiringBatch, PantryItem } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { getHoursRemaining } from '../utils'

interface AlertsPanelProps {
  expiring: ExpiringBatch[]
  lowStock: PantryItem[]
  reorderNeeded: PantryItem[]
}

export function AlertsPanel({ expiring, lowStock, reorderNeeded }: AlertsPanelProps) {
  const { t } = useLanguage()
  const uniqueReorder = reorderNeeded.filter(p => !lowStock.some(ls => ls.id === p.id))
  const totalCount = expiring.length + lowStock.length + uniqueReorder.length

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {t('bakeryOverviewAlerts')}
            </h3>
          </div>
          {totalCount > 0 && (
            <span className="bg-rose-500 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>

        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-emerald-500 gap-2">
            <CheckCircle2 className="h-12 w-12" />
            <p className="text-sm font-semibold">{t('bakeryAllGoodNoAlerts')}</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {expiring.map(batch => {
              const hours = getHoursRemaining(batch.expiresAt)
              return (
                <div
                  key={batch.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-500/10"
                >
                  <Clock className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {batch.recipe.name}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      {hours > 0
                        ? `${t('bakeryOverviewExpiresIn')} ${hours}${t('bakeryHours')}`
                        : t('bakeryExpiringSoon')}
                    </p>
                  </div>
                </div>
              )
            })}

            {lowStock.map(item => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-500/10"
              >
                <Package className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    {item.currentStock} {item.unit} {t('bakeryRemaining')}
                  </p>
                </div>
              </div>
            ))}

            {uniqueReorder.map(item => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-500/10"
              >
                <ShoppingCart className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {t('bakeryNeedsReorder')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}