import { useState } from 'react'
import {
  Pencil,
  ChevronDown,
  ChevronUp,
  Printer,
  Package,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import DentalChart from '../../../components/DentalChart'
import PrescriptionPrintModal from '../../../components/PrescriptionPrintModal'
import { Session } from '../types'
import {
  VISIT_TYPE_CONFIG,
  PAYMENT_STATUS_CONFIG,
  STATUS_CONFIG,
  VITAL_LABELS,
  PAYMENT_METHOD_ICONS,
} from '../constants'
import { parseVitals, formatCurrency, formatVisitDate } from '../utils'

interface Props {
  session: Session
  isLast: boolean
  onEdit: (s: Session) => void
}

export default function TimelineSession({ session, isLast, onEdit }: Props) {
  const [open, setOpen] = useState(false)
  const [showRxPrint, setShowRxPrint] = useState(false)

  const vitals = parseVitals(session.vitals)
  const vitalList = Object.entries(vitals).filter(([, v]) => v)
  const visitCfg = VISIT_TYPE_CONFIG[session.visitType] || VISIT_TYPE_CONFIG.routine
  const paymentCfg = PAYMENT_STATUS_CONFIG[session.paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid
  const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.completed
  const MethodIcon = session.paymentMethod ? (PAYMENT_METHOD_ICONS[session.paymentMethod] || AlertCircle) : null
  const balance = Math.max(0, (session.amountCharged ?? 0) - (session.amountPaid ?? 0))
  const date = new Date(session.visitDate)

  let parsedLabOrders: Array<{ testName?: string; notes?: string }> = []
  try {
    parsedLabOrders = session.labOrders ? JSON.parse(session.labOrders) : []
  } catch {
    parsedLabOrders = []
  }

  let parsedDentalChart: Record<string, any> = {}
  try {
    parsedDentalChart = session.dentalChart && session.dentalChart !== '{}' ? JSON.parse(session.dentalChart) : {}
  } catch {
    parsedDentalChart = {}
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center w-12 flex-shrink-0">
        <div className={`w-4 h-4 rounded-full ring-4 ${visitCfg.dotCls} mt-4 z-10`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1 min-h-[3rem]" />}
      </div>

      <div className="flex-1 mb-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:border-teal-500/50 transition-all">
        <div
          className="flex items-start gap-3.5 p-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
          onClick={() => setOpen(prev => !prev)}
        >
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

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${paymentCfg.badgeCls}`}>
              {paymentCfg.label}
            </span>
            {session.amountCharged != null && session.amountCharged > 0 && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {formatCurrency(session.amountPaid)} / {formatCurrency(session.amountCharged)}
              </span>
            )}
            <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
              {session.prescriptions?.length > 0 && (
                <button
                  onClick={() => setShowRxPrint(true)}
                  className="p-1 text-teal-600 hover:text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
                  title="Print Prescription"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
              )}
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

        {open && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
            <div className="flex flex-wrap gap-3">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {session.diagnosis && (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diagnosis</p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{session.diagnosis}</p>
                </div>
              )}
              {session.notes && (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Notes</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{session.notes}</p>
                </div>
              )}
            </div>

            {session.prescriptions && session.prescriptions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prescriptions</p>
                  <button
                    onClick={() => setShowRxPrint(true)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    <Printer className="h-3 w-3" /> Print Rx
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-2 px-3">Medicine</th>
                        <th className="py-2 px-3">Dosage</th>
                        <th className="py-2 px-3">Frequency</th>
                        <th className="py-2 px-3">Duration</th>
                        <th className="py-2 px-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {session.prescriptions.map((rx, idx) => (
                        <tr key={rx.id || idx} className={rx.isActive ? '' : 'opacity-60 bg-slate-50/50'}>
                          <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100">{rx.medicineName}</td>
                          <td className="py-2 px-3 text-slate-500">{rx.dosage || '—'}</td>
                          <td className="py-2 px-3 text-slate-500">{rx.frequency || '—'}</td>
                          <td className="py-2 px-3 text-slate-500">{rx.duration || '—'}</td>
                          <td className="py-2 px-3 text-slate-500">{rx.quantity ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {parsedLabOrders.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Lab Orders</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsedLabOrders.map((lab, index) => (
                    <div key={`${lab.testName || 'lab'}-${index}`} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
                      <p className="font-bold text-indigo-950 dark:text-indigo-200">{lab.testName || 'Lab order'}</p>
                      {lab.notes && <p className="text-slate-400 mt-0.5">{lab.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session.sessionMaterials && session.sessionMaterials.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> Inventory Used
                </p>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3">Batch</th>
                        <th className="py-2 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {session.sessionMaterials.map((sm, idx) => (
                        <tr key={sm.id || idx}>
                          <td className="py-2 px-3 font-semibold">{sm.material?.name || sm.materialName}</td>
                          <td className="py-2 px-3">{sm.quantityUsed} {sm.material?.unit || sm.unit}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{sm.batch?.batchNumber ? `#${sm.batch.batchNumber}` : '—'}</td>
                          <td className="py-2 px-3 text-slate-400">{sm.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {Object.keys(parsedDentalChart).length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-2">Dental Chart</p>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-teal-900/60 p-4">
                  <DentalChart value={parsedDentalChart} readOnly />
                </div>
              </div>
            )}

            {session.followUpDate && (
              <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-900/60 text-xs font-semibold text-teal-800 dark:text-teal-300">
                <Calendar className="h-4 w-4 text-teal-600" />
                <span>Follow-up: {formatVisitDate(session.followUpDate)}</span>
              </div>
            )}

            {(session.amountCharged != null || session.amountPaid != null || session.paymentMethod) && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 font-semibold">
                  {MethodIcon && <MethodIcon className="h-3 w-3" />}
                  {session.paymentMethod || 'Not set'}
                </span>
                {session.amountCharged != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 font-semibold">
                    Charged {formatCurrency(session.amountCharged)}
                  </span>
                )}
                {session.amountPaid != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 font-semibold">
                    Paid {formatCurrency(session.amountPaid)}
                  </span>
                )}
                {balance > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-2 py-1 font-semibold">
                    Due {formatCurrency(balance)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showRxPrint && (
        <PrescriptionPrintModal
          session={session as any}
          patient={session.patient as any}
          onClose={() => setShowRxPrint(false)}
        />
      )}
    </div>
  )
}