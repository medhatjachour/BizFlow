import { FileText, BarChart3 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { ReportFormState, ReportType } from '@renderer/pages/Reports/types'

type GenerateReportPanelProps = {
  reportTypes: ReportType[]
  reportForm: ReportFormState
  generating: boolean
  onReportTypeChange: (id: ReportFormState['reportType']) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onGenerate: () => void
}

export function GenerateReportPanel({
  reportTypes,
  reportForm,
  generating,
  onReportTypeChange,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
}: GenerateReportPanelProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-sm border border-indigo-200 dark:border-slate-600">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <FileText size={18} className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('generateReport')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('reportSelectType')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {reportTypes.map((rt) => {
          const Icon = rt.icon
          const active = reportForm.reportType === rt.id

          return (
            <button
              key={rt.id}
              onClick={() => onReportTypeChange(rt.id as ReportFormState['reportType'])}
              className={`p-4 rounded-xl font-medium transition-all hover:scale-105 ${
                active
                  ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-300/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border border-slate-200 dark:border-slate-600'
              }`}
            >
              <Icon
                size={22}
                className={`mx-auto mb-1.5 ${active ? 'text-white' : rt.color}`}
              />
              <p className="text-sm font-semibold">{rt.title}</p>
            </button>
          )
        })}
      </div>

      {reportForm.reportType && (
        <div className="flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              📅 {t('startDate')}
            </label>
            <input
              type="date"
              value={reportForm.startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-all text-sm"
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              📅 {t('endDate')}
            </label>
            <input
              type="date"
              value={reportForm.endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-all text-sm"
            />
          </div>

          <button
            onClick={onGenerate}
            disabled={generating}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <BarChart3 size={17} />
            {generating ? t('generating') : t('generateReportButton')}
          </button>
        </div>
      )}
    </div>
  )
}