
import { ShoppingBag } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function EmptySalesState(): JSX.Element {
  const { t } = useLanguage()

  return (
    <div className="min-h-72 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-8 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={22} className="text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          {t('noSalesYet')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          {t('startMakingSalesToSee')}
        </p>
        <button
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent('bizflow:commerce:open-tab', { detail: 'pos' })
            )
          }}
          className="h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-2 text-xs font-bold"
        >
          <ShoppingBag size={14} />
          {t('goToPointOfSale')}
        </button>
      </div>
    </div>
  )
}