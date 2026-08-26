import {
  Phone, Mail, Stethoscope, BadgeCheck, Eye,
  Pencil, Trash2, Calendar,  MessageCircle
} from 'lucide-react'
import { VetStaff } from '../types'
import { getStaffInitials, formatStaffMoney, formatStaffDate } from '../utils'
import { STATUS_COLORS, EMP_TYPES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface StaffCardProps {
  staff: VetStaff
  onViewProfile: () => void
  onEdit: () => void
  onDelete: () => void
}

export function StaffCard({ staff, onViewProfile, onEdit, onDelete }: StaffCardProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const initials = getStaffInitials(staff.name)
  const statusCfg = STATUS_COLORS[staff.status] ?? STATUS_COLORS.active
  const emp = EMP_TYPES.find((e) => e.value === staff.employmentType)
  const empLabel = isAr ? emp?.ar || staff.employmentType : emp?.fallback || staff.employmentType

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const cleanPhone = staff.phone.replace(/[^0-9]/g, '')
    if (cleanPhone) window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  return (
    <div className="group relative bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-xl hover:border-violet-300 dark:hover:border-violet-600/60 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      
      {/* Top Background Subtle Glow */}
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-80" />

      <div>
        {/* Doctor Header info */}
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <div className="h-13 w-13 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
              {initials}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 ${statusCfg.dot}`}
              title={isAr ? statusCfg.labelAr : statusCfg.labelEn}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {staff.name}
              </h3>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text}`}>
                {staff.status === 'active' && <BadgeCheck size={11} />}
                {isAr ? statusCfg.labelAr : statusCfg.labelEn}
              </span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-lg border border-violet-200/80 dark:border-violet-800">
                <Stethoscope size={11} /> {isAr ? 'طبيب بيطري' : 'Veterinarian'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-lg">
                {empLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Contact info list */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
              <Phone size={13} className="text-slate-400 shrink-0" />
              <span dir="ltr">{staff.phone}</span>
            </span>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <MessageCircle size={11} /> WhatsApp
            </button>
          </div>

          {staff.email && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
              <Mail size={13} className="text-slate-400 shrink-0" />
              <span className="truncate" title={staff.email}>{staff.email}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {isAr ? 'التعيين:' : 'Hired:'} {formatStaffDate(staff.hireDate, language)}
            </span>
            {staff.baseSalary > 0 && (
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatStaffMoney(staff.baseSalary)}
                <span className="text-[10px] font-normal text-slate-400">/{staff.salaryType === 'hourly' ? (isAr ? 'ساعة' : 'hr') : (isAr ? 'شهر' : 'mo')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
        <button
          type="button"
          onClick={onViewProfile}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/60 rounded-xl transition-all"
        >
          <Eye size={14} />
          <span>{isAr ? 'الملف السريري' : 'Clinical Profile'}</span>
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title={isAr ? 'تعديل' : 'Edit'}
        >
          <Pencil size={14} />
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          title={isAr ? 'حذف الطبيب' : 'Remove Doctor'}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}