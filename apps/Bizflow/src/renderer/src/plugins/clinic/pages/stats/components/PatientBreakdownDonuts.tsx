import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VISIT_TYPE_COLORS, PAYMENT_STATUS_COLORS, CHART_TOOLTIP_STYLE } from '../constants'
import type { Breakdowns } from '../types'

interface Props {
  breakdowns: Breakdowns
}

export const PatientBreakdownDonuts: React.FC<Props> = ({ breakdowns }) => {
  const { t } = useLanguage()

  const visitTypeLabels: Record<string, string> = {
    first_visit: t('firstVisitType') || 'First Visit',
    follow_up:   t('followUpVisitType') || 'Follow-up',
    routine:     t('routineVisitType') || 'Routine',
    emergency:   t('emergencyVisitType') || 'Emergency'
  }

  const paymentLabels: Record<string, string> = {
    paid:    t('paidPayment') || 'Paid',
    partial: t('partialPayment') || 'Partial',
    unpaid:  t('unpaidPayment') || 'Unpaid',
    waived:  t('waivedPayment') || 'Waived'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. Visit Type Distribution */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          {t('visitTypeBreakdownTitle') || 'Visit Classification Breakdown'}
        </h3>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdowns.visitTypes}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={4}
              >
                {breakdowns.visitTypes.map((entry) => (
                  <Cell key={entry.type} fill={VISIT_TYPE_COLORS[entry.type] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={((val: number, name: string) => [String(val), visitTypeLabels[name] ?? name]) as any}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {breakdowns.visitTypes.map((e) => {
            const total = breakdowns.visitTypes.reduce((s, x) => s + x.count, 0)
            const pct = total ? Math.round((e.count / total) * 100) : 0
            return (
              <div key={e.type} className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: VISIT_TYPE_COLORS[e.type] ?? '#94a3b8' }} />
                  <span>{visitTypeLabels[e.type] ?? e.type}</span>
                </span>
                <span className="font-extrabold text-slate-700 dark:text-slate-200">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Payment Status Distribution */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          {t('paymentBreakdownTitle') || 'Payment Status Distribution'}
        </h3>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdowns.paymentStatuses}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={4}
              >
                {breakdowns.paymentStatuses.map((entry) => (
                  <Cell key={entry.status} fill={PAYMENT_STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={((val: number, name: string) => [String(val), paymentLabels[name] ?? name]) as any}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          {breakdowns.paymentStatuses.map((e) => {
            const total = breakdowns.paymentStatuses.reduce((s, x) => s + x.count, 0)
            const pct = total ? Math.round((e.count / total) * 100) : 0
            return (
              <div key={e.status} className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PAYMENT_STATUS_COLORS[e.status] ?? '#94a3b8' }} />
                  <span>{paymentLabels[e.status] ?? e.status}</span>
                </span>
                <span className="font-extrabold text-slate-700 dark:text-slate-200">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}