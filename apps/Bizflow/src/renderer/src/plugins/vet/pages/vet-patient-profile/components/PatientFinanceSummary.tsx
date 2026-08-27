import { CreditCard, Banknote, DollarSign } from 'lucide-react'
import { formatOwnerMoney } from '../../vet-owners/utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function PatientFinanceSummary({ finance }: { finance: any }) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const charged = finance?.totalCharged || 0
  const paid = finance?.totalPaid || 0
  const outstanding = finance?.outstanding || 0

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 text-center shadow-sm">
        <CreditCard size={18} className="mx-auto mb-1 text-slate-400" />
        <p className="text-lg font-black text-slate-900 dark:text-white">{formatOwnerMoney(charged)}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
          {isAr ? 'إجمالي المفوتر' : 'Total Charged'}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 text-center shadow-sm">
        <Banknote size={18} className="mx-auto mb-1 text-emerald-500" />
        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatOwnerMoney(paid)}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
          {isAr ? 'المدفوع' : 'Total Paid'}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 text-center shadow-sm">
        <DollarSign size={18} className={`mx-auto mb-1 ${outstanding > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
        <p className={`text-lg font-black ${outstanding > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
          {formatOwnerMoney(outstanding)}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
          {isAr ? 'المتبقي' : 'Outstanding'}
        </p>
      </div>
    </div>
  )
}