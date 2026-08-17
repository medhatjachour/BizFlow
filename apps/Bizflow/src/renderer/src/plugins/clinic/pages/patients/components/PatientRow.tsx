import { Phone, CalendarClock, Plus, Eye, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { Patient } from '../types'
import { calcAge, getInitials, formatCurrency, formatDate } from '../utils'
import { BLOOD_TYPE_COLORS, AVATAR_GRADIENTS } from '../constants'

interface Props {
  patient: Patient
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onNewSession: () => void
  onBookAppt: () => void
}

export default function PatientRow({
  patient,
  onView,
  onEdit,
  onDelete,
  onNewSession,
  onBookAppt
}: Props) {
  const outstanding = patient.finance?.outstanding ?? 0
  const hasOutstanding = outstanding > 0
  const colorIdx = Math.abs(patient.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % AVATAR_GRADIENTS.length
  const bloodStyle = patient.bloodType ? BLOOD_TYPE_COLORS[patient.bloodType] : null

  return (
    <tr
      onClick={onView}
      className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700/60"
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${AVATAR_GRADIENTS[colorIdx]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
            {getInitials(patient.name)}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
              {patient.name}
            </p>
            {patient.folderNumber && (
              <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
                #{patient.folderNumber}
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          {patient.phone}
        </div>
      </td>

      <td className="py-3 px-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>{calcAge(patient.dateOfBirth)}</span>
          {bloodStyle && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bloodStyle.badge}`}>
              {patient.bloodType}
            </span>
          )}
        </div>
      </td>

      <td className="py-3 px-3 text-xs text-slate-500">
        {patient.sessions?.[0] ? formatDate(patient.sessions[0].visitDate) : '—'}
      </td>

      <td className="py-3 px-3 text-xs">
        {hasOutstanding ? (
          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
            <AlertCircle className="h-3 w-3" />
            {formatCurrency(outstanding)}
          </span>
        ) : (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Settled</span>
        )}
      </td>

      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={onBookAppt}
            className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-teal-200 dark:border-teal-800"
          >
            <CalendarClock className="h-3 w-3" /> Book
          </button>
          <button
            onClick={onNewSession}
            className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-medium"
            title="Walk-in Visit"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={onView}
            className="p-1 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}