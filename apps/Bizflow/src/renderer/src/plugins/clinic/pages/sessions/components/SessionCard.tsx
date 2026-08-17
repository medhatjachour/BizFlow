import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Printer,
  Pencil,
  Trash2,
  Calendar,
  Activity,
  Package,
  AlertCircle
} from 'lucide-react'
import DentalChart from '../../../components/DentalChart'
import PrescriptionPrintModal from '../../../components/PrescriptionPrintModal'
import SessionStatusDropdown from './SessionStatusDropdown'
import { Session, SessionStatus } from '../types'
import { VISIT_TYPE_CONFIG, PAYMENT_STATUS_CONFIG, PAYMENT_METHOD_ICONS, VITAL_LABELS } from '../constants'
import { parseVitals, formatCurrency, formatVisitDate } from '../utils'

interface Props {
  session: Session
  onEdit: (s: Session) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: SessionStatus) => void
  statusUpdating: boolean
}

export default function SessionCard({ session, onEdit, onDelete, onStatusChange, statusUpdating }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showRxPrint, setShowRxPrint] = useState(false)

  const vitals = parseVitals(session.vitals)
  const vitalEntries = Object.entries(vitals).filter(([, v]) => v)

  const visitCfg = VISIT_TYPE_CONFIG[session.visitType] || VISIT_TYPE_CONFIG.routine
  const paymentCfg = PAYMENT_STATUS_CONFIG[session.paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid
  const PayIcon = paymentCfg.icon
  const MethodIcon = session.paymentMethod ? (PAYMENT_METHOD_ICONS[session.paymentMethod] || AlertCircle) : null
  const balance = Math.max(0, (session.amountCharged ?? 0) - (session.amountPaid ?? 0))

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:border-teal-500/40 transition-all">
      {/* Header bar */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors select-none"
        onClick={() => setExpanded(prev => !prev)}
      >
        {/* Avatar */}
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0">
          {session.patient.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Core Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{session.patient.name}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${visitCfg.badgeCls}`}>
              {visitCfg.label}
            </span>
            <SessionStatusDropdown
              status={session.status}
              onChange={s => onStatusChange(session.id, s)}
              disabled={statusUpdating}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
            <span className="font-medium">{formatVisitDate(session.visitDate)}</span>
            {session.doctorName && <span>· Dr. {session.doctorName}</span>}
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
              « {session.chiefComplaint} »
            </span>
          </div>
        </div>

        {/* Financial info summary */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
          <div className={`flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold border ${paymentCfg.badgeCls}`}>
            <PayIcon className="h-3 w-3" />
            {paymentCfg.label}
          </div>
          {session.amountCharged != null && session.amountCharged > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {MethodIcon && <MethodIcon className="h-3.5 w-3.5" />}
              <span>
                {formatCurrency(session.amountPaid)} / {formatCurrency(session.amountCharged)}
              </span>
              {balance > 0 && <span className="text-rose-600 dark:text-rose-400 font-bold">(-{formatCurrency(balance)})</span>}
            </div>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {session.prescriptions?.length > 0 && (
            <button
              onClick={() => setShowRxPrint(true)}
              className="p-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-xl transition-colors"
              title="Print Prescription"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(session)}
            className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Edit Visit Details"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Delete Session"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded visit breakdown */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/80 p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/40">
          {/* Vitals */}
          {vitalEntries.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-teal-500" /> Recorded Vitals
              </p>
              <div className="flex flex-wrap gap-2">
                {vitalEntries.map(([k, v]) => (
                  <div key={k} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">{VITAL_LABELS[k]?.label || k}</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {v as string} <small className="text-[10px] font-normal text-slate-400">{VITAL_LABELS[k]?.unit}</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Findings & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {session.diagnosis && (
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Diagnosis</p>
                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{session.diagnosis}</p>
              </div>
            )}
            {session.notes && (
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor's Clinical Notes</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{session.notes}</p>
              </div>
            )}
          </div>

          {/* Prescriptions */}
          {session.prescriptions?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prescriptions Issued</p>
                <button
                  onClick={() => setShowRxPrint(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  <Printer className="h-3 w-3" /> Print Rx Slip
                </button>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Medicine</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {session.prescriptions.map((rx, i) => (
                      <tr key={rx.id || i} className={rx.isActive ? '' : 'opacity-60 bg-slate-50/50'}>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">{rx.medicineName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{rx.dosage || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{rx.frequency || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{rx.duration || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{rx.quantity || '—'}</td>
                        <td className="py-2.5 px-4">
                          {rx.isActive ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              Discontinued
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dental Odontogram */}
          {session.dentalChart && session.dentalChart !== '{}' && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Odontogram Record</p>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-teal-900/60 p-4">
                <DentalChart value={JSON.parse(session.dentalChart)} readOnly />
              </div>
            </div>
          )}

          {/* Lab Orders */}
          {session.labOrders && (
            <div>
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Lab Investigations</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {JSON.parse(session.labOrders).map((lab: any, i: number) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
                    <p className="font-bold text-indigo-950 dark:text-indigo-200">{lab.testName}</p>
                    {lab.notes && <p className="text-slate-400 mt-0.5">{lab.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {session.sessionMaterials && session.sessionMaterials.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Package className="h-3.5 w-3.5" /> Consumed Inventory Materials
              </p>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Quantity</th>
                      <th className="py-2 px-3">Batch #</th>
                      <th className="py-2 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {session.sessionMaterials.map((sm, i) => (
                      <tr key={sm.id || i}>
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

          {/* Follow-up Note */}
          {session.followUpDate && (
            <div className="flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-900/60 text-xs font-semibold text-teal-800 dark:text-teal-300">
              <Calendar className="h-4 w-4 text-teal-600" />
              <span>Recommended Follow-up Date: {formatVisitDate(session.followUpDate)}</span>
            </div>
          )}
        </div>
      )}

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