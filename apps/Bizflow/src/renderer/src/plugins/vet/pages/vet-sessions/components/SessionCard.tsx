
import { Eye, Pencil, Trash2, Wallet, Calendar, Stethoscope } from 'lucide-react'
import { VetSessionRecord } from '../types'
import { formatSessionMoney, formatSessionDate, getVisitTypeLabel } from '../utils'
import { PAYMENT_STATUS_CONFIG } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { speciesEmoji } from '../../vet-owners/species'

interface Props {
  session: VetSessionRecord
  hexColor: (name: string) => string | undefined
  badgeClass: (name: string) => string
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onPay: () => void
}

export function SessionCard({
  session,
  hexColor,
  badgeClass,
  onView,
  onEdit,
  onDelete,
  onPay
}: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const typeColor = hexColor(session.visitType)
  const payCfg = PAYMENT_STATUS_CONFIG[session.paymentStatus] ?? PAYMENT_STATUS_CONFIG.unpaid
  const charged = Number(session.amountCharged) || 0
  const paid = Number(session.amountPaid) || 0
  const outstanding = Math.max(0, charged - paid)
  const canPay = session.paymentStatus !== 'waived' && outstanding > 0.005

  return (
    <div className="group relative bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all flex flex-col justify-between overflow-hidden">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-xl flex items-center justify-center shrink-0 border border-violet-100 dark:border-violet-900/50">
              {speciesEmoji(session.patient?.species || 'other')}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                {session.patient?.name || 'General Visit'}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">
                {session.patient?.owner?.name || '—'} {session.patient?.owner?.phone ? `• ${session.patient?.owner?.phone}` : ''}
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              typeColor ? '' : badgeClass(session.visitType)
            }`}
            style={typeColor ? { backgroundColor: typeColor + '20', color: typeColor } : undefined}
          >
            {getVisitTypeLabel(session.visitType, language)}
          </span>
        </div>

        {/* Diagnosis & Complaints */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 my-2 space-y-1 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
            {session.diagnosis || session.chiefComplaint || (isAr ? 'جلسة فحص واستشارة' : 'Consultation Session')}
          </p>
          {session.vetName && (
            <p className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
              <Stethoscope size={12} /> Dr. {session.vetName}
            </p>
          )}
        </div>

        {/* Date & Financial Row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <Calendar size={12} /> {formatSessionDate(session.visitDate, language)}
          </span>

          <div className="text-right rtl:text-left">
            <span className="font-black text-slate-900 dark:text-white text-sm">
              {formatSessionMoney(charged)}
            </span>
            {outstanding > 0.005 && (
              <p className="text-[10px] font-bold text-rose-500">
                −{formatSessionMoney(outstanding)} {isAr ? 'مستحق' : 'due'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${payCfg.bg}`}>
          {isAr ? payCfg.labelAr : payCfg.labelEn}
        </span>

        <div className="flex items-center gap-1">
          {canPay && (
            <button
              type="button"
              onClick={onPay}
              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1 transition-all"
            >
              <Wallet size={12} />
              <span>{isAr ? 'تحصيل' : 'Pay'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onView}
            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40"
            title={isAr ? 'عرض' : 'View'}
          >
            <Eye size={13} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            title={isAr ? 'تعديل' : 'Edit'}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            title={isAr ? 'حذف' : 'Delete'}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}