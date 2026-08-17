import React, { useState } from 'react'
import { FileText, BarChart3, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { REPORT_OPTIONS_CONFIG } from '../constants'
import { getDefaultStartDate, getTodayDate } from '../utils'
import type { ReportType } from '../types'

interface Props {
  generating: boolean
  onGenerate: (type: ReportType, start: string, end: string) => Promise<void>
}

export const GenerateReportCard: React.FC<Props> = ({ generating, onGenerate }) => {
  const { t } = useLanguage()

  const [selectedType, setSelectedType] = useState<ReportType | null>(null)
  const [startDate, setStartDate] = useState(getDefaultStartDate())
  const [endDate, setEndDate] = useState(getTodayDate())

  return (
    <div className="bg-gradient-to-br from-teal-50/70 via-cyan-50/50 to-white dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 rounded-3xl p-6 shadow-xs border border-teal-200/80 dark:border-slate-700/80">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-teal-600 text-white rounded-2xl shadow-xs">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {t('generateReport') || 'Generate PDF Audit Report'}
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            {t('selectReportDateRange') || 'Select report archetype and date interval'}
          </p>
        </div>
      </div>

      {/* 3 Report Type Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        {REPORT_OPTIONS_CONFIG.map((r) => {
          const Icon = r.icon
          const isActive = selectedType === r.id
          const label = t(r.labelKey) || r.id
          const desc = t(r.descKey) || `Export ${r.id} records`

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedType(r.id)}
              className={`p-4 rounded-2xl text-start transition-all shadow-2xs ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md ring-4 ring-teal-300/40 dark:ring-teal-700/40 scale-[1.01]'
                  : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:border-teal-300 dark:hover:border-slate-600 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <Icon size={22} className={`mb-2 ${isActive ? 'text-white' : r.color}`} />
              <p className="text-xs sm:text-sm font-extrabold">{label}</p>
              <p className={`text-[11px] mt-0.5 leading-relaxed ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                {desc}
              </p>
            </button>
          )
        })}
      </div>

      {/* Date Interval & Export Action */}
      {selectedType && (
        <div className="flex flex-wrap items-end gap-3.5 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              📅 {t('reportStartDate') || 'Start Date'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              📅 {t('reportEndDate') || 'End Date'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => onGenerate(selectedType, startDate, endDate)}
            disabled={generating}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm shadow-teal-500/20 transition-all active:scale-95 ms-auto"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            <span>{generating ? t('generatingReport') || 'Generating...' : t('generatePdfReport') || 'Download PDF Report'}</span>
          </button>
        </div>
      )}
    </div>
  )
}