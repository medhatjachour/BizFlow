import { Eye, Pencil, Trash2,BadgeCheck, Stethoscope } from 'lucide-react'
import { VetStaff } from '../types'
import { getStaffInitials, formatStaffMoney, formatStaffDate } from '../utils'
import { STATUS_COLORS, EMP_TYPES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface StaffTableViewProps {
  staffList: VetStaff[]
  onViewProfile: (s: VetStaff) => void
  onEdit: (s: VetStaff) => void
  onDelete: (s: VetStaff) => void
}

export function StaffTableView({ staffList, onViewProfile, onEdit, onDelete }: StaffTableViewProps) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left rtl:text-right">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{isAr ? 'الطبيب البيطري' : 'Veterinarian'}</th>
              <th className="py-3 px-4">{isAr ? 'بيانات التواصل' : 'Contact'}</th>
              <th className="py-3 px-4">{isAr ? 'نوع العمل' : 'Employment'}</th>
              <th className="py-3 px-4">{isAr ? 'تاريخ التعيين' : 'Hire Date'}</th>
              <th className="py-3 px-4">{isAr ? 'الراتب' : 'Compensation'}</th>
              <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {staffList.map((staff) => {
              const initials = getStaffInitials(staff.name)
              const statusCfg = STATUS_COLORS[staff.status] ?? STATUS_COLORS.active
              const emp = EMP_TYPES.find((e) => e.value === staff.employmentType)
              const empLabel = isAr ? emp?.ar || staff.employmentType : emp?.fallback || staff.employmentType

              return (
                <tr key={staff.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{staff.name}</p>
                        <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium flex items-center gap-1">
                          <Stethoscope size={10} /> {isAr ? 'طبيب بيطري' : 'Veterinarian'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-700 dark:text-slate-300" dir="ltr">{staff.phone}</p>
                    {staff.email && <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{staff.email}</p>}
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 capitalize">
                    {empLabel}
                  </td>

                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">
                    {formatStaffDate(staff.hireDate, language)}
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                    {formatStaffMoney(staff.baseSalary)}
                    <span className="text-[10px] font-normal text-slate-400">/{staff.salaryType === 'hourly' ? (isAr ? 'ساعة' : 'hr') : (isAr ? 'شهر' : 'mo')}</span>
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text}`}>
                      {staff.status === 'active' && <BadgeCheck size={11} />}
                      {isAr ? statusCfg.labelAr : statusCfg.labelEn}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewProfile(staff)}
                        className="p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50"
                        title={isAr ? 'الملف السريري' : 'Clinical Profile'}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(staff)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title={isAr ? 'تعديل' : 'Edit'}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(staff)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title={isAr ? 'حذف' : 'Remove'}
                      >
                        <Trash2 size={15} />
                      </button>
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