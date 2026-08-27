import { useState } from 'react'
import { X, Calendar, Loader2, Check } from 'lucide-react'
import { VetFollowUpRecord } from '../types'
import DateField from '@renderer/components/DateField'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  followUp: VetFollowUpRecord | null
  onReschedule: (sessionId: string, newDateIso: string) => Promise<void>
  onClose: () => void
}

function extractDateString(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().slice(0, 10)
  if (typeof rawDate === 'string') return rawDate.slice(0, 10)
  try {
    const d = new Date(rawDate)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch {}
  return new Date().toISOString().slice(0, 10)
}

export function RescheduleFollowUpModal({ followUp, onReschedule, onClose }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!followUp) return null

  const [date, setDate] = useState(() => extractDateString(followUp.followUpDate))
  const [submitting, setSubmitting] = useState(false)

  const addDays = (dCount: number) => {
    const next = new Date()
    next.setDate(next.getDate() + dCount)
    setDate(next.toISOString().slice(0, 10))
  }

  const handleSave = async () => {
    if (!date) return
    setSubmitting(true)
    try {
      const iso = new Date(date + 'T09:00:00.000').toISOString()
      await onReschedule(followUp.id, iso)
      onClose()
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
            <div className="h-10 w-10 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {isAr ? 'تأجيل موعد المتابعة' : 'Reschedule Follow-up'}
              </h3>
              <p className="text-xs text-slate-400">{followUp.patient?.name || 'Patient'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Quick Shortcuts */}
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
            {isAr ? 'خيارات سريعة' : 'Quick Shortcuts'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => addDays(3)}
              className="py-1.5 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-slate-700 dark:text-slate-300 transition-all"
            >
              +3 {isAr ? 'أيام' : 'Days'}
            </button>
            <button
              type="button"
              onClick={() => addDays(7)}
              className="py-1.5 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-slate-700 dark:text-slate-300 transition-all"
            >
              +1 {isAr ? 'أسبوع' : 'Week'}
            </button>
            <button
              type="button"
              onClick={() => addDays(14)}
              className="py-1.5 px-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-slate-700 dark:text-slate-300 transition-all"
            >
              +2 {isAr ? 'أسبوعين' : 'Weeks'}
            </button>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              {isAr ? 'تاريخ المتابعة الجديد' : 'New Date'}
            </label>
            <DateField
              value={date}
              onChange={(v) => setDate(v)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-violet-600/20 active:scale-95"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            <span>{isAr ? 'حفظ الموعد' : 'Save Date'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}