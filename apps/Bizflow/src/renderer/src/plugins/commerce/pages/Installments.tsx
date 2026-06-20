import { useEffect, useState } from 'react'
import { InstallmentManager } from '@renderer/components/InstallmentManager'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export default function Installments(): JSX.Element {
  const [showManager, setShowManager] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    // Auto-open the installment manager when the page loads
    setShowManager(true)
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('installmentManagement')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {t('manageInstallments')}
        </p>
      </div>

      {/* Empty state - the modal will open automatically */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {t('installmentManagement')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t('installmentManagerWillOpen')}
          </p>
        </div>
      </div>

      {/* Installment Manager Modal */}
      <InstallmentManager
        isOpen={showManager}
        onClose={() => setShowManager(false)}
      />
    </div>
  )
}