import { SpeciesStat } from '../types'
import { SPECIES_EMOJI } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function SpeciesMixCard({ species }: { species: SpeciesStat[] }) {
  const { t } = useLanguage()
  const total = species.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('vetSpeciesMix') || 'Species Breakdown'}</h3>
        <span className="text-xs text-slate-400 font-medium">{total} total</span>
      </div>

      <div className="space-y-3">
        {species.map((s) => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
          return (
            <div key={s.species} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="text-base">{SPECIES_EMOJI[s.species] || '🐾'}</span>
                  <span className="capitalize">{s.species.replace('_', ' ')}</span>
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  {s.count} <span className="text-[10px] text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}

        {species.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">{t('vetNoDataYet') || 'No records in this period'}</p>
        )}
      </div>
    </div>
  )
}