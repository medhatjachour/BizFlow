import React from 'react'
import { Stethoscope, Star } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import type { DoctorPerformance } from '../types'
import { colorForDoctor, displayName, initials } from '../../doctors/utils'

interface Props {
  doctors: DoctorPerformance[]
}

export const DoctorPerformanceTable: React.FC<Props> = ({ doctors }) => {
  const { t } = useLanguage()
  if (doctors.length === 0) return null

  const maxRevenue = Math.max(...doctors.map((x) => x.revenue), 1)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Stethoscope className="h-4 w-4 text-teal-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('byDoctorTitle') || 'Doctor Productivity & Performance (This Month)'}
        </h3>
      </div>

      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full min-w-[650px] text-xs">
          <thead>
            <tr className="text-start border-b border-slate-100 dark:border-slate-700/80 text-slate-400 uppercase font-bold tracking-wider">
              <th className="py-3 text-start">{t('doctorName') || 'Practitioner'}</th>
              <th className="py-3 text-end">{t('clinicSessions') || 'Visits'}</th>
              <th className="py-3 text-end">{t('patientsSeen') || 'Patients'}</th>
              <th className="py-3 text-end">{t('revenue') || 'Billed'}</th>
              <th className="py-3 text-end">{t('commission') || 'Commission'}</th>
              <th className="py-3 text-end">{t('noShowRate') || 'No-Show'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
            {doctors.map((doc) => {
              const revBarWidth = Math.min(100, Math.round((doc.revenue / maxRevenue) * 100))

              return (
                <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors">
                  {/* Doctor Info */}
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-2xs"
                        style={{ backgroundColor: colorForDoctor(doc) }}
                      >
                        {initials(doc.name)}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                          <span>{displayName(doc)}</span>
                          {doc.isDefault && <Star className="h-3 w-3 text-amber-500 fill-current shrink-0" />}
                        </div>
                        {doc.specialty && (
                          <div className="text-[10px] text-slate-400">{doc.specialty}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Sessions */}
                  <td className="py-3 text-end font-extrabold text-slate-700 dark:text-slate-200">
                    {doc.sessions}
                  </td>

                  {/* Patients */}
                  <td className="py-3 text-end text-slate-600 dark:text-slate-300">
                    {doc.patients}
                  </td>

                  {/* Revenue + Progress */}
                  <td className="py-3 text-end">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(doc.revenue)}
                    </span>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden ms-auto max-w-[100px]">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${revBarWidth}%` }} />
                    </div>
                  </td>

                  {/* Commission */}
                  <td className="py-3 text-end font-semibold text-slate-600 dark:text-slate-300">
                    {formatCurrency(doc.commission)}
                  </td>

                  {/* No Show Rate */}
                  <td className="py-3 text-end">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        doc.noShowRate > 15
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {doc.noShowRate}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}