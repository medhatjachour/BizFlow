import React from 'react'
import { Activity, Stethoscope } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import { useClinicReportData } from './hooks/useClinicReportData'
import { usePdfReportGenerator } from './hooks/usePdfReportGenerator'

import { ReportSectionHeader } from './components/ReportSectionHeader'
import { GenerateReportCard } from './components/GenerateReportCard'
import { TodaysActivityKpiGrid } from './components/TodaysActivityKpiGrid'
import { DiagnosisFrequencyChart } from './components/DiagnosisFrequencyChart'
import { UpcomingFollowUpsList } from './components/UpcomingFollowUpsList'

interface Props {
  refreshSignal?: number
}

export const ClinicReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const { t } = useLanguage()

  const { data, loading, diagnosisFreq } = useClinicReportData(refreshSignal)
  const { generating, generateReport } = usePdfReportGenerator()

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. Header Bar */}
      <ReportSectionHeader />

      {/* 2. Generate PDF Report Section */}
      <GenerateReportCard
        generating={generating}
        onGenerate={generateReport}
      />

      {/* 3. Today's Clinic Activity Live Overview */}
      <div className="bg-gradient-to-br from-teal-500/5 to-teal-500/10 dark:from-teal-500/10 dark:to-teal-500/5 p-6 rounded-3xl border border-teal-200/60 dark:border-teal-800/40 space-y-5">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-teal-600 dark:text-teal-400" />
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {t('todaysClinicActivity') || "Today's Clinical Activity"}
          </h3>
          <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-extrabold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            {t('liveIndicator') || 'Live'}
          </span>
        </div>

        {/* 4 Cards Grid */}
        <TodaysActivityKpiGrid data={data} loading={loading} />

        {/* Pathology Chart & Upcoming Follow-ups */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DiagnosisFrequencyChart diagnosisFreq={diagnosisFreq} />
            <UpcomingFollowUpsList followUps={data.followUps} />
          </div>
        )}

        {/* Empty Session State */}
        {!loading && data.todaySessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Stethoscope size={32} className="opacity-30 mb-2 text-teal-600" />
            <p className="text-xs font-semibold">No clinical sessions recorded yet today</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClinicReportSection