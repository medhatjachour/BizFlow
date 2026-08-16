import { X, Loader2, AlertTriangle, Sunset, CheckCircle2 } from 'lucide-react'
import { useEndOfDay } from '../hooks/useEndOfDay'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface EndOfDayModalProps {
  onClose: () => void
  onWasteLogged: () => void
}

export function EndOfDayModal({ onClose, onWasteLogged }: EndOfDayModalProps) {
  const { entries, unsoldEdits, setRecipeWaste, totalWaste, loading, saving, done, error, logAllWaste } =
    useEndOfDay(onWasteLogged, onClose)

  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <Sunset className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('bakeryEODTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('bakeryEODSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500 mb-2" />
              <p className="text-xs text-slate-400">Calculating today's reconciliation...</p>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              <p className="font-bold text-base text-slate-900 dark:text-white">{t('bakeryEODSuccess')}</p>
              <button
                onClick={onClose}
                className="mt-3 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all"
              >
                Done
              </button>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 text-rose-600 text-sm flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Sunset className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">{t('bakeryEODNoData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map(entry => {
                const waste = unsoldEdits[entry.recipeId] ?? entry.estimatedWaste
                return (
                  <div
                    key={entry.recipeId}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <p className="font-bold text-sm text-slate-900 dark:text-white mb-2">{entry.recipeName}</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-slate-400 block mb-0.5">{t('bakeryEODProduced')}</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">{entry.unitsProduced}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-slate-400 block mb-0.5">{t('bakeryEODSold')}</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{entry.unitsSold}</span>
                      </div>
                      <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-xl border border-rose-200/60 dark:border-rose-800/40">
                        <span className="text-rose-500 font-semibold block mb-0.5">{t('bakeryEODUnsold')}</span>
                        <input
                          type="number"
                          min="0"
                          value={waste}
                          onChange={e => setRecipeWaste(entry.recipeId, Number(e.target.value))}
                          className="w-full text-center font-extrabold text-rose-600 dark:text-rose-400 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-200 dark:border-rose-800/50 text-xs font-bold text-rose-700 dark:text-rose-300 text-center">
                {t('bakeryEODEstWaste')}: {totalWaste} total units to log
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!done && !loading && entries.length > 0 && (
          <div className="shrink-0 flex justify-end gap-2.5 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all"
            >
              {t('bakeryCancel')}
            </button>
            <button
              onClick={logAllWaste}
              disabled={saving || totalWaste <= 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{t('bakeryEODLogWaste')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}