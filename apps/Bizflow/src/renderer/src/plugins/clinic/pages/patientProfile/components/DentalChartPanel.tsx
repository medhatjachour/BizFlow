import React from 'react'
import { Stethoscope } from 'lucide-react'
import type { DentalChartData } from '@renderer/plugins/clinic/components/DentalChart'
import type { Session } from '../types'
import DentalChart from '@renderer/plugins/clinic/components/DentalChart'

interface Props {
  sessions: Session[]
}

export const DentalChartPanel: React.FC<Props> = ({ sessions }) => {
  const latestDental = sessions.find((s) => s.dentalChart)
  let chartData: DentalChartData = {}

  if (latestDental?.dentalChart) {
    try {
      chartData = JSON.parse(latestDental.dentalChart)
    } catch {
      chartData = {}
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-teal-100 dark:border-teal-900/30 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between px-5 py-3 border-b border-teal-100/60 dark:border-teal-900/20 bg-teal-50/50 dark:bg-teal-950/10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Dental Chart Overview</span>
          {latestDental && (
            <span className="text-xs text-slate-400">
              — Recorded on {new Date(latestDental.visitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      {!latestDental ? (
        <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-center px-4">
          <Stethoscope className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No dental chart recorded yet</p>
          <p className="text-xs text-slate-400">You can create one when recording or editing a clinical session</p>
        </div>
      ) : (
        <div className="p-5 overflow-x-auto">
          <DentalChart value={chartData} readOnly />
        </div>
      )}
    </div>
  )
}