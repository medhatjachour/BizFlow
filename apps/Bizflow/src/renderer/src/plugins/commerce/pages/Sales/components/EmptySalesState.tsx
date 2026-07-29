
import { ShoppingBag } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function EmptySalesState(): JSX.Element {
  const { t } = useLanguage()

  return (
    <div className="glass-card p-12 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={40} className="text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t('noSalesYet')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {t('startMakingSalesToSee')}
        </p>
        <button
          onClick={() => {
            window.location.href = '/pos'
          }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <ShoppingBag size={20} />
          {t('goToPointOfSale')}
        </button>
      </div>
    </div>
  )
}