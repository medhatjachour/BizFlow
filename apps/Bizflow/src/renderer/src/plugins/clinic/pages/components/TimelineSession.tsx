import { useState } from 'react'
import { User, Pencil, ChevronDown, ChevronUp, Calendar, DollarSign } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DentalChart from '../../components/DentalChart'
import type { DentalChartData } from '../../components/DentalChart'
import type { Session } from '../patientProfile.types'
import { parseVitals } from '../patientProfile.shared'
import {
  visitTypeConfig, defaultDotCls, paymentStatusConfig, paymentMethodIcons,
  statusColors, vitalLabels
} from '../patientProfile.config'

export default function TimelineSession({
  session,
  isLast,
  onEdit
}: {
  session: Session
  isLast: boolean
  onEdit: (s: Session) => void
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const vitals = parseVitals(session.vitals)
  const vitalList = Object.entries(vitals).filter(([, v]) => v)

  const visitCfg = visitTypeConfig[session.visitType] ?? { label: session.visitType, cls: 'bg-slate-100 text-slate-600', dotCls: defaultDotCls }
  const paymentCfg = paymentStatusConfig[session.paymentStatus] ?? paymentStatusConfig.unpaid
  const PayIcon = paymentCfg.icon
  const MethodIcon = session.paymentMethod ? (paymentMethodIcons[session.paymentMethod] ?? DollarSign) : null
  const balance = (session.amountCharged ?? 0) - (session.amountPaid ?? 0)

  const date = new Date(session.visitDate)

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center w-14 flex-shrink-0">
        {/* Dot */}
        <div className={`w-4 h-4 rounded-full ring-4 ${visitCfg.dotCls} flex-shrink-0 mt-4 z-10`} />
        {/* Connector line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700 mt-1 min-h-[2rem]" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 mb-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700/60 hover:shadow-md transition-all overflow-hidden">
        {/* Header row – clickable to expand */}
        <div
          className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
          onClick={() => setOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
        >
          {/* Date block */}
          <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-700 rounded-xl px-2.5 py-1.5 flex-shrink-0 min-w-[44px] text-center">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase">
              {date.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
              {date.getDate()}
            </span>
            <span className="text-[10px] text-slate-400">{date.getFullYear()}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visitCfg.cls}`}>
                {t(session.visitType as any) ?? visitCfg.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status] ?? ''}`}>
                {t(session.status as any)}
              </span>
              {session.doctorName && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="h-3 w-3" />Dr. {session.doctorName}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{session.chiefComplaint}</p>
            {session.diagnosis && (
              <p className="text-xs text-slate-400 truncate mt-0.5">Dx: {session.diagnosis}</p>
            )}
          </div>

          {/* Payment summary + expand */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${paymentCfg.cls}`}>
              <PayIcon className="h-3 w-3" />
              {t(session.paymentStatus as any) ?? paymentCfg.label}
            </div>
            {session.amountCharged != null && session.amountCharged > 0 && (
              <div className="text-xs text-slate-400 flex items-center gap-1">
                {MethodIcon && <MethodIcon className="h-3 w-3" />}
                <span>{(session.amountPaid ?? 0).toFixed(0)}/{session.amountCharged.toFixed(0)}</span>
                {balance > 0 && <span className="text-red-500 font-semibold">-{balance.toFixed(0)}</span>}
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(session) }}
                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Edit session"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {open
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />
              }
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {open && (
          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4 space-y-4 bg-slate-50/60 dark:bg-slate-800/40">
            {/* Vitals row */}
            {vitalList.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vitals</p>
                <div className="flex flex-wrap gap-2">
                  {vitalList.map(([k, v]) => (
                    <div key={k} className="flex flex-col items-center bg-white dark:bg-slate-700 rounded-xl px-3 py-1.5 border border-slate-100 dark:border-slate-600 min-w-[56px] text-center">
                      <span className="text-[10px] text-slate-400 uppercase">{vitalLabels[k] ?? k}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {session.diagnosis && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('diagnosis')}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{session.diagnosis}</p>
                </div>
              )}
              {session.notes && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('notes')}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{session.notes}</p>
                </div>
              )}
            </div>

            {/* Prescriptions table */}
            {session.prescriptions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('prescriptions')}</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        {[t('medicine'), t('dosage'), t('frequency'), t('duration'), t('qty'), 'Status'].map((h) => (
                          <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {session.prescriptions.map((rx) => (
                        <tr key={rx.id} className={(rx.isActive ?? true) ? '' : 'opacity-60'}>
                          <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{rx.medicineName}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.dosage ?? '–'}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.frequency ?? '–'}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.duration ?? '–'}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.quantity ?? '–'}</td>
                          <td className="px-3 py-1.5">
                            {(rx.isActive ?? true)
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
                              : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full" title={rx.stoppedAt ? `Stopped ${new Date(rx.stoppedAt).toLocaleDateString()}` : undefined}><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Stopped</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dental Chart */}
            {session.dentalChart && session.dentalChart !== '{}' && (() => {
              let chartData: DentalChartData = {}
              try { chartData = JSON.parse(session.dentalChart!) } catch { chartData = {} }
              if (Object.keys(chartData).length === 0) return null
              return (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dental Chart</p>
                  <div className="rounded-xl border border-teal-200 dark:border-teal-800 overflow-hidden bg-white dark:bg-slate-800">
                    <div className="px-4 py-3">
                      <DentalChart value={chartData} readOnly />
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Payment detail + follow-up */}
            <div className="flex flex-wrap gap-4 pt-1">
              {session.amountCharged != null && session.amountCharged > 0 && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-xl px-4 py-2 border border-slate-100 dark:border-slate-600">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Charged</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{session.amountCharged.toFixed(2)}</div>
                  </div>
                  <div className="text-slate-300 dark:text-slate-600">→</div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Paid</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{(session.amountPaid ?? 0).toFixed(2)}</div>
                  </div>
                  {balance > 0 && (
                    <>
                      <div className="text-slate-300 dark:text-slate-600">=</div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Due</div>
                        <div className="text-sm font-bold text-red-500 dark:text-red-400">{balance.toFixed(2)}</div>
                      </div>
                    </>
                  )}
                  {session.paymentMethod && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${paymentCfg.cls}`}>
                      {MethodIcon && <MethodIcon className="h-3 w-3" />}
                      <span className="capitalize">{session.paymentMethod}</span>
                    </div>
                  )}
                </div>
              )}
              {session.followUpDate && (
                <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-2 border border-teal-100 dark:border-teal-800/40">
                  <Calendar className="h-4 w-4 text-teal-500" />
                  <div>
                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">{t('followUpDate')}</div>
                    <div className="text-sm font-medium text-teal-700 dark:text-teal-300">
                      {new Date(session.followUpDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
