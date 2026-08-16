import { ChevronDown, ChevronUp, AlertCircle, Info, Zap } from 'lucide-react'
import { CapacityEntry } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { calculateFillPercentage, formatNumber } from '../utils'

interface RecipeCapacityCardProps {
  entry: CapacityEntry
  expanded: boolean
  onToggle: () => void
}

export function RecipeCapacityCard({ entry, expanded, onToggle }: RecipeCapacityCardProps) {
  const { t } = useLanguage()
  const batches = entry.availableBatches
  const isUnlinked = batches === null
  const isBlocked = !isUnlinked && batches === 0
  const isLow = !isUnlinked && !isBlocked && batches! < 5

  const statusColor = isUnlinked ? 'gray' : isBlocked ? 'red' : isLow ? 'amber' : 'emerald'

  const styles = {
    emerald: {
      badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      bar: 'bg-emerald-500',
      border: 'border-emerald-200/80 dark:border-emerald-800/40 hover:border-emerald-400'
    },
    amber: {
      badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      bar: 'bg-amber-500',
      border: 'border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400'
    },
    red: {
      badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      bar: 'bg-rose-500',
      border: 'border-rose-200/80 dark:border-rose-800/40 hover:border-rose-400'
    },
    gray: {
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      bar: 'bg-slate-300 dark:bg-slate-600',
      border: 'border-slate-200 dark:border-slate-800'
    }
  }[statusColor]

  const barPct = isUnlinked ? 0 : Math.min(100, (batches! / 10) * 100)
  const linkedIng = entry.ingredientBreakdown.filter(i => i.linked)
  const unlinkedIng = entry.ingredientBreakdown.filter(i => !i.linked)

  return (
    <div
      className={`rounded-2xl border ${styles.border} bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden`}
    >
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              {entry.recipeName}
            </h4>
            <span
              className={`shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full border ${styles.badge}`}
            >
              {isUnlinked
                ? t('bakeryNoPantryLink')
                : isBlocked
                ? t('bakeryBlocked')
                : `${batches} ${batches === 1 ? t('bakeryBatch') : t('bakeryOverviewBatches')}`}
            </span>
          </div>

          {!isUnlinked ? (
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {entry.expectedUnits !== null ? formatNumber(entry.expectedUnits) : '—'}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {entry.yieldUnit}
                </span>
              </div>

              {/* Progress meter */}
              <div className="mt-2.5 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${styles.bar}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>

              {entry.limitedBy ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>
                    {t('bakeryBottleneck')}:{' '}
                    <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                      {entry.limitedBy}
                    </strong>
                  </span>
                </p>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  <span>Stock optimal for high production</span>
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{t('bakeryLinkToPantry')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Toggle */}
      {linkedIng.length > 0 && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          <span>
            {t('bakeryConfirmIngredient')} ({linkedIng.length} {t('bakeryTracked')}
            {unlinkedIng.length > 0 ? `, ${unlinkedIng.length} ${t('bakeryUnlinkedLabel')}` : ''})
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )}

      {/* Ingredient Table */}
      {expanded && linkedIng.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-2 text-left font-semibold">{t('bakeryConfirmIngredient')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('bakeryIngColPerBatch')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('bakeryIngColInStock')}</th>
                <th className="px-2 py-2 text-right font-semibold">{t('bakeryIngColBatches')}</th>
                <th className="px-3.5 py-2 text-center font-semibold">{t('bakeryIngColFill')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {linkedIng.map((ing, idx) => {
                const isBottleneck = entry.limitedBy === ing.name
                const fillPct = calculateFillPercentage(ing.inStock, ing.neededPerBatch, (entry.availableBatches ?? 0) + 3)

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isBottleneck
                        ? 'bg-amber-500/10 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-3.5 py-2 text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{ing.name}</span>
                        {isBottleneck && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded font-bold">
                            ⚡ {t('bakeryIngLimit')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">
                      {ing.neededPerBatch} {ing.unit}
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-semibold ${
                        ing.inStock === null
                          ? 'text-slate-400'
                          : ing.inStock < ing.neededPerBatch
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {ing.inStock !== null ? `${ing.inStock}` : '—'}
                    </td>
                    <td className="px-2 py-2 text-right font-bold">
                      <span
                        className={
                          (ing.canMakeBatches ?? 0) === 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : (ing.canMakeBatches ?? 0) < 5
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {ing.canMakeBatches ?? '—'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2">
                      <div className="w-14 mx-auto h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            fillPct === 0
                              ? 'bg-rose-500'
                              : fillPct < 35
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      {ing.shortfall > 0 && (
                        <p className="text-[10px] text-rose-500 text-center mt-0.5">
                          +{ing.shortfall} {ing.unit}
                        </p>
                      )}
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