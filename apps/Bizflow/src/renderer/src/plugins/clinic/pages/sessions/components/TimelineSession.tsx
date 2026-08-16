import { useState } from 'react'
import { Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { Session } from '../types'
import { VISIT_TYPE_CONFIG, PAYMENT_STATUS_CONFIG, STATUS_CONFIG, VITAL_LABELS } from '../constants'
import { parseVitals, formatCurrency} from '../utils'

interface Props {
  session: Session
  isLast: boolean
  onEdit: (s: Session) => void
}

export default function TimelineSession({ session, isLast, onEdit }: Props) {
  const [open, setOpen] = useState(false)

  const vitals = parseVitals(session.vitals)
  const vitalList = Object.entries(vitals).filter(([, v]) => v)
  const visitCfg = VISIT_TYPE_CONFIG[session.visitType] || VISIT_TYPE_CONFIG.routine
  const paymentCfg = PAYMENT_STATUS_CONFIG[session.paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid
  const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.completed

  const date = new Date(session.visitDate)
//   const balance = Math.max(0, (session.amountCharged ?? 0) - (session.amountPaid ?? 0))

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center w-12 flex-shrink-0">
        <div className={`w-4 h-4 rounded-full ring-4 ${visitCfg.dotCls} mt-4 z-10`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1 min-h-[3rem]" />}
      </div>

      {/* Card Body */}
      <div className="flex-1 mb-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:border-teal-500/50 transition-all">
        <div
          className="flex items-start gap-3.5 p-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
          onClick={() => setOpen(prev => !prev)}
        >
          {/* Date Tag */}
          <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-xl text-center flex-shrink-0">
            <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400">
              {date.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none my-0.5">
              {date.getDate()}
            </span>
            <span className="text-[10px] text-slate-400">{date.getFullYear()}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${visitCfg.badgeCls}`}>
                {visitCfg.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.badgeCls}`}>
                {statusCfg.label}
              </span>
              {session.doctorName && <span className="text-xs text-slate-400">Dr. {session.doctorName}</span>}
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
              {session.chiefComplaint}
            </p>
            {session.diagnosis && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Dx: {session.diagnosis}</p>
            )}
          </div>

          {/* Trailing financial pill */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${paymentCfg.badgeCls}`}>
              {paymentCfg.label}
            </span>
            {session.amountCharged != null && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {formatCurrency(session.amountPaid)}
              </span>
            )}
            <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => onEdit(session)}
                className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setOpen(prev => !prev)} className="p-1 text-slate-400">
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded View */}
        {open && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            {vitalList.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {vitalList.map(([k, v]) => (
                  <div key={k} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-xs">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">{VITAL_LABELS[k]?.label || k}</span>
                    <span className="font-bold">{v as string}</span>
                  </div>
                ))}
              </div>
            )}
            {session.notes && <p className="text-xs text-slate-600 dark:text-slate-300">{session.notes}</p>}
          </div>
        )}
      </div>
    </div>
  )
}