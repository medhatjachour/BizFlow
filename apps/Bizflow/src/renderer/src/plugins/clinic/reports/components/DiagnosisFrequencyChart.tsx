import React from 'react'
import { ClipboardList } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { DiagnosisFreqResult } from '@renderer/hooks/useDashboardWorker'
import { DIAGNOSIS_PALETTE } from '../constants'

interface Props {
  diagnosisFreq: DiagnosisFreqResult | null
}

export const DiagnosisFrequencyChart: React.FC<Props> = ({ diagnosisFreq }) => {
  const { t } = useLanguage()

  const chartData = (diagnosisFreq?.ranked ?? [])
    .slice(0, 8)
    .map((d) => ({
      name: d.name.length > 14 ? d.name.slice(0, 12) + '…' : d.name,
      fullName: d.name,
      count: d.count
    }))

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center text-slate-400 py-10">
        <ClipboardList size={32} className="opacity-30 mb-2" />
        <p className="text-xs font-semibold">{t('noDiagnosesToday') || 'No clinical diagnoses logged today'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
        {t('todaysDiagnosisFreq') || "Today's Clinical Pathology Distribution"}
      </h4>

      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={85}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '12px'
            }}
            formatter={(val: any) => [`${val} patients`, 'Diagnosis Count']}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={DIAGNOSIS_PALETTE[i % DIAGNOSIS_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {diagnosisFreq && (
        <p className="text-[11px] text-slate-400 mt-2 font-medium">
          {diagnosisFreq.total} {t('totalDiagnosesNote') || 'total diagnoses'} • {diagnosisFreq.unique}{' '}
          {t('uniqueDiagnosesNote') || 'unique cases'} • {t('mostCommonNote') || 'Leading'}:{' '}
          <span className="font-bold text-teal-600 dark:text-teal-400">
            {diagnosisFreq.ranked[0]?.name}
          </span>
        </p>
      )}
    </div>
  )
}