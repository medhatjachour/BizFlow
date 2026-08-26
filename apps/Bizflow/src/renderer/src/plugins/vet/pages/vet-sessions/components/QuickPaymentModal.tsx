import { useState } from 'react'
import { X, Loader2, Wallet, Check } from 'lucide-react'
import { VetSessionRecord } from '../types'
import { formatSessionMoney } from '../utils'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  session: VetSessionRecord | null
  onSuccess: (updated: VetSessionRecord) => void
  onClose: () => void
}

export function QuickPaymentModal({ session, onSuccess, onClose }: Props) {
  const toast = useToast()
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!session) return null

  const charged = Number(session.amountCharged) || 0
  const paid = Number(session.amountPaid) || 0
  const outstanding = Math.max(0, charged - paid)

  const [amount, setAmount] = useState(outstanding.toString())
  const [submitting, setSubmitting] = useState(false)

  const handleSettle = async (full: boolean) => {
    const payVal = full ? undefined : parseFloat(amount)
    if (!full && (isNaN(payVal as number) || (payVal as number) <= 0)) {
      toast.error(isAr ? 'يرجى إدخال مبلغ صحيح' : 'Enter a valid payment amount')
      return
    }

    setSubmitting(true)
    try {
      const updated = await window.api.vet?.sessions.settlePayment(session.id, full ? { payFull: true } : { amount: payVal })
      toast.success(isAr ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully')
      if (updated) onSuccess(updated)
      onClose()
    } catch (e: any) {
      toast.error(e?.message ?? (isAr ? 'فشل تسجيل الدفعة' : 'Failed to record payment'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Wallet size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {isAr ? 'تحصيل وتسوية الدفعة' : 'Settle Session Payment'}
              </h3>
              <p className="text-xs text-slate-400">{session.patient?.name || 'Patient'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
            <span className="text-slate-500">{isAr ? 'المبلغ المتبقي:' : 'Outstanding Balance:'}</span>
            <span className="font-black text-rose-600 dark:text-rose-400 text-sm">{formatSessionMoney(outstanding)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المبلغ المراد تحصيله' : 'Amount to Collect'}
            </label>
            <div className="relative">
              <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                min="0"
                max={outstanding}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSettle(false)}
            disabled={submitting}
            className="flex-1 px-3 py-2.5 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 rounded-xl hover:bg-violet-100 disabled:opacity-50 transition-all"
          >
            {isAr ? 'تحصيل المبلغ' : 'Pay Amount'}
          </button>
          <button
            type="button"
            onClick={() => handleSettle(true)}
            disabled={submitting}
            className="flex-1 px-3 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            <span>{isAr ? 'دفع الكل (تسوية)' : 'Pay Full'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}