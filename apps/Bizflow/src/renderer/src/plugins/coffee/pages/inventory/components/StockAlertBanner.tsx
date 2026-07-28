import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  lowCount: number
  outCount: number
}

export function StockAlertBanner({ lowCount, outCount }: Props) {
  if (lowCount === 0 && outCount === 0) return null
  const { t } = useLanguage()
  const hasOut = outCount > 0
  const hasLow = lowCount > 0

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      hasOut
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    }`}>
      <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${hasOut ? 'text-red-500' : 'text-amber-500'}`} />
      <div className="text-sm text-slate-700 dark:text-slate-300">
        {hasOut && <span className="font-medium">{outCount} {t('cfProduct', { count: outCount })} {t('cfOutOfStock')}</span>}
        {hasOut && hasLow && ' '}
        {hasLow && <span>{lowCount} {t('cfRunningLow')}</span>}
      </div>
    </div>
  )
}
