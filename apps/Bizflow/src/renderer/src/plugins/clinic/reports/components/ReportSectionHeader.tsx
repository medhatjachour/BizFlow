import React from 'react'
import { Stethoscope } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export const ReportSectionHeader: React.FC = () => {
  const { t } = useLanguage()

  return (
    <div className="flex items-center gap-3.5 px-1">
      <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-sm shadow-teal-500/30 text-white shrink-0">
        <Stethoscope size={22} />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
          {t('clinicReportsTitle') || 'Clinical Reporting & Auditing'}
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          {t('clinicReportsSubtitle') || 'Export filtered PDF logs and inspect live daily operational throughput'}
        </p>
      </div>
    </div>
  )
}