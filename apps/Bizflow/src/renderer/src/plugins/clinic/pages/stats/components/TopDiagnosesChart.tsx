import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { CHART_TOOLTIP_STYLE, AXIS_TICK_STYLE } from '../constants'
import type { DiagnosisEntry } from '../types'

interface Props {
  data: DiagnosisEntry[]
}

export const TopDiagnosesChart: React.FC<Props> = ({ data }) => {
  const { t } = useLanguage()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        {t('topDiagnoses') || 'Pathology & Diagnosis Distribution'}
      </h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-xs font-semibold text-slate-400">
          No clinical diagnoses recorded yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-100 dark:stroke-slate-700/60" />
            <XAxis type="number" tick={AXIS_TICK_STYLE} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="diagnosis"
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              width={100}
            />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Bar
              dataKey="count"
              fill="#0d9488"
              radius={[0, 6, 6, 0]}
              maxBarSize={16}
              label={{ position: 'right', fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}