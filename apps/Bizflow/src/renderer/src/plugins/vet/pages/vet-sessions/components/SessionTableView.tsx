
import { Eye, Pencil, Trash2, Wallet } from 'lucide-react'
import { VetSessionRecord } from '../types'
import { formatSessionMoney, formatSessionDate, getVisitTypeLabel } from '../utils'
import { PAYMENT_STATUS_CONFIG } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { speciesEmoji } from '../../components/owners/species'

interface Props {
  sessions: VetSessionRecord[]
  hexColor: (name: string) => string | undefined
  badgeClass: (name: string) => string
  onView: (s: VetSessionRecord) => void
  onEdit: (s: VetSessionRecord) => void
  onDelete: (s: VetSessionRecord) => void
  onPay: (s: VetSessionRecord) => void
}

export function SessionTableView({
  sessions,
  hexColor,
  badgeClass,
  onView,
  onEdit,
  onDelete,
  onPay
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left rtl:text-right">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">{isAr ? 'المريض والمالك' : 'Patient & Owner'}</th>
              <th className="py-3 px-4">{isAr ? 'نوع الزيارة' : 'Visit Type'}</th>
              <th className="py-3 px-4">{isAr ? 'تاريخ الجلسة' : 'Date & Time'}</th>
              <th className="py-3 px-4">{isAr ? 'الطبيب والتشخيص' : 'Doctor & Diagnosis'}</th>
              <th className="py-3 px-4">{isAr ? 'المبلغ' : 'Billed'}</th>
              <th className="py-3 px-4">{isAr ? 'حالة السداد' : 'Payment Status'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {sessions.map((s) => {
              const typeColor = hexColor(s.visitType)
              const payCfg = PAYMENT_STATUS_CONFIG[s.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid
              const charged = Number(s.amountCharged) || 0
              const paid = Number(s.amountPaid) || 0
              const outstanding = Math.max(0, charged - paid)
              const canPay = s.paymentStatus !== 'waived' && outstanding > 0.005

              return (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none shrink-0">
                        {speciesEmoji(s.patient?.species || 'other')}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {s.patient?.name || 'General Visit'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {s.patient?.owner?.name || '—'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        typeColor ? '' : badgeClass(s.visitType)
                      }`}
                      style={typeColor ? { backgroundColor: typeColor + '20', color: typeColor } : undefined}
                    >
                      {getVisitTypeLabel(s.visitType, language)}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                    {formatSessionDate(s.visitDate, language)}
                  </td>

                  <td className="py-3 px-4 max-w-[200px]">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {s.vetName ? `Dr. ${s.vetName}` : (isAr ? 'غير محدد' : 'Unassigned')}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate" title={s.diagnosis || s.chiefComplaint}>
                      {s.diagnosis || s.chiefComplaint || '—'}
                    </p>
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-black text-slate-900 dark:text-white">{formatSessionMoney(charged)}</p>
                    {outstanding > 0.005 && (
                      <p className="text-[10px] font-bold text-rose-500">
                        −{formatSessionMoney(outstanding)} {isAr ? 'مستحق' : 'due'}
                      </p>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${payCfg.bg}`}>
                      {isAr ? payCfg.labelAr : payCfg.labelEn}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      {canPay && (
                        <button
                          type="button"
                          onClick={() => onPay(s)}
                          className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1 transition-all"
                          title={isAr ? 'تحصيل دفعة' : 'Collect Payment'}
                        >
                          <Wallet size={12} />
                          <span>{isAr ? 'تحصيل' : 'Pay'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onView(s)}
                        className="p-1.5 rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50"
                        title={isAr ? 'عرض التفاصيل' : 'View Details'}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(s)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title={isAr ? 'تعديل' : 'Edit'}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(s)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={14} />
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