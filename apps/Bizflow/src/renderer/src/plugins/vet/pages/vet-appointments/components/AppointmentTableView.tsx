import {
  PlayCircle, Check,  Pencil, Trash2,
  Loader2
} from 'lucide-react'
import { VetAppointmentRecord } from '../types'
import { formatApptTime, getApptTypeLabel } from '../utils'
import {  STATUS_CONFIG } from '../constants'
import { speciesEmoji } from '../../vet-owners/species'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  appointments: VetAppointmentRecord[]
  updatingId: string | null
  onStartSession: (a: VetAppointmentRecord) => void
  onStatusChange: (a: VetAppointmentRecord, status: string) => void
  onEdit: (a: VetAppointmentRecord) => void
  onDelete: (a: VetAppointmentRecord) => void
  onViewPatient: (a: VetAppointmentRecord) => void
}

export function AppointmentTableView({
  appointments,
  updatingId,
  onStartSession,
  onStatusChange,
  onEdit,
  onDelete,
  onViewPatient
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left rtl:text-right">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{isAr ? 'الموعد والوقت' : 'Time & Date'}</th>
              <th className="py-3 px-4">{isAr ? 'المريض' : 'Patient'}</th>
              <th className="py-3 px-4">{isAr ? 'المالك والهاتف' : 'Owner & Phone'}</th>
              <th className="py-3 px-4">{isAr ? 'النوع' : 'Type'}</th>
              <th className="py-3 px-4">{isAr ? 'الطبيب' : 'Doctor'}</th>
              <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {appointments.map((a) => {
              const isPending = ['scheduled', 'confirmed'].includes(a.status)
              const statusCfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.scheduled
              const isUpdating = updatingId === a.id

              return (
                <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    <span className="text-violet-600 dark:text-violet-400">{formatApptTime(a.appointmentDate)}</span>
                    <span className="text-slate-400 text-[10px] font-normal block">{a.duration} mins</span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{speciesEmoji(a.patient?.species || 'other')}</span>
                      <button
                        type="button"
                        onClick={() => onViewPatient(a)}
                        className="font-bold text-slate-900 dark:text-white hover:text-violet-600 hover:underline truncate"
                      >
                        {a.patient?.name || 'Patient'}
                      </button>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{a.patient?.owner?.name || '—'}</p>
                    {a.patient?.owner?.phone && (
                      <p className="text-[11px] text-slate-400 font-mono" dir="ltr">{a.patient.owner.phone}</p>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {getApptTypeLabel(a.type, language)}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    {a.vetName ? `Dr. ${a.vetName}` : '—'}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
                      {isAr ? statusCfg.labelAr : statusCfg.labelEn}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      {isUpdating ? (
                        <Loader2 size={14} className="animate-spin text-violet-500" />
                      ) : (
                        <>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => onStartSession(a)}
                              className="px-2 py-1 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-1 shadow-sm"
                              title={isAr ? 'بدء الجلسة' : 'Start Session'}
                            >
                              <PlayCircle size={12} />
                              <span>{isAr ? 'بدء' : 'Start'}</span>
                            </button>
                          )}
                          {a.status === 'scheduled' && (
                            <button
                              type="button"
                              onClick={() => onStatusChange(a, 'confirmed')}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"
                              title={isAr ? 'تأكيد' : 'Confirm'}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEdit(a)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                            title={isAr ? 'تعديل' : 'Edit'}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(a)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
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