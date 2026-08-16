import { CheckCircle2, Sparkles } from 'lucide-react'
import { TodayBatch } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface TodayProductionBannerProps {
  batches: TodayBatch[]
  totalUnits: number
}

export function TodayProductionBanner({ batches, totalUnits }: TodayProductionBannerProps) {
  const { t } = useLanguage()

  if (!batches || batches.length === 0) return null

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 dark:border-emerald-800/50 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              {t('bakeryProducedToday')}
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-3 w-3" />
                {batches.length} {batches.length === 1 ? t('bakeryBatch') : t('bakeryOverviewBatches')}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {totalUnits} {t('bakeryTotalUnits')} fresh baked
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {batches.map(b => (
          <div
            key={b.id}
            className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl px-3 py-1.5 shadow-xs"
          >
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{b.recipeName}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
              {b.quantityProduced} {b.yieldUnit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}