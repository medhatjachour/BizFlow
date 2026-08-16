import { Phone, Calendar, Activity, DollarSign, AlertCircle, Eye, Pencil, Trash2, CalendarClock, Plus } from 'lucide-react'
import { Patient } from '../types'
import { calcAge, getInitials, formatCurrency, formatDate } from '../utils'
import { BLOOD_TYPE_COLORS, VISIT_TYPE_MAP, AVATAR_GRADIENTS } from '../constants'

interface Props {
  patient: Patient
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onNewSession: () => void
  onBookAppt: () => void
}

export default function PatientCard({
  patient,
  onView,
  onEdit,
  onDelete,
  onNewSession,
  onBookAppt
}: Props) {
  const lastVisit = patient.sessions?.[0]
  const outstanding = patient.finance?.outstanding ?? 0
  const hasOutstanding = outstanding > 0

  const colorIdx = Math.abs(patient.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % AVATAR_GRADIENTS.length
  const bloodStyle = patient.bloodType ? BLOOD_TYPE_COLORS[patient.bloodType] : null

  return (
    <div
      onClick={onView}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between"
    >
      {/* Outstanding badge */}
      {hasOutstanding && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-rose-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm z-10 animate-pulse">
          <AlertCircle className="h-3 w-3" />
          {formatCurrency(outstanding)}
        </div>
      )}

      {/* Card Header & Avatar */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[colorIdx]} flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold text-base`}>
            {getInitials(patient.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-tight truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {patient.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                {calcAge(patient.dateOfBirth)}
              </span>
              {patient.folderNumber && (
                <span className="text-[11px] font-mono bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800/60">
                  #{patient.folderNumber}
                </span>
              )}
              {bloodStyle && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${bloodStyle.badge}`}>
                  {patient.bloodType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata info */}
        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{patient.phone || 'No phone'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            {lastVisit ? (
              <span className="flex items-center gap-1.5">
                <span>{formatDate(lastVisit.visitDate)}</span>
                {lastVisit.visitType && VISIT_TYPE_MAP[lastVisit.visitType] && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${VISIT_TYPE_MAP[lastVisit.visitType].cls}`}>
                    {VISIT_TYPE_MAP[lastVisit.visitType].label}
                  </span>
                )}
              </span>
            ) : (
              <span className="italic text-slate-400">No visits recorded</span>
            )}
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span>{patient._count?.sessions ?? patient.sessions?.length ?? 0} visits</span>
            </div>
            {patient.finance && (
              <span className={`font-semibold flex items-center gap-0.5 ${hasOutstanding ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                <DollarSign className="h-3 w-3" />
                {hasOutstanding ? 'Unpaid balance' : 'Settled'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions toolbar */}
      <div
        className="p-2.5 bg-slate-50 dark:bg-slate-700/40 border-t border-slate-100 dark:border-slate-700/80 space-y-1.5"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onBookAppt}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all shadow-sm shadow-teal-600/20"
        >
          <CalendarClock className="h-3.5 w-3.5" /> Book Appointment
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onNewSession}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Start a walk-in visit session"
          >
            <Plus className="h-3 w-3" /> Walk-in
          </button>
          <button
            onClick={onView}
            className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
            title="View full medical profile"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            title="Edit info"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Delete patient"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}