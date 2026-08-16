import { AlertCircle, ArrowRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface PantryGuidanceBannerProps {
  show: boolean
}

export function PantryGuidanceBanner({ show }: PantryGuidanceBannerProps) {
  const { t } = useLanguage()

  if (!show) return null

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-300/80 dark:border-amber-800/60 bg-amber-500/10 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
            {t('bakeryPantryNotSetup')}
          </h4>
          <p className="text-xs text-amber-700/90 dark:text-amber-300/90 mt-1 max-w-2xl leading-relaxed">
            {t('bakeryPantryNotSetupDesc')}
          </p>
        </div>
      </div>
      <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 shrink-0">
        Configure Pantry <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  )
}