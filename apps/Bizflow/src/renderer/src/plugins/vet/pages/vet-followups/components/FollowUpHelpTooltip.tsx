import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, Info } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function FollowUpHelpTooltip() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLButtonElement>(null)

  const handleMouseEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <HelpCircle size={15} />
      </button>

      {pos &&
        createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 99999 }}
            className="w-72 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs leading-relaxed p-4 shadow-2xl border border-slate-700/60 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-1.5 font-bold text-violet-400 mb-2 pb-2 border-b border-slate-700/60">
              <Info size={14} />
              <span>{isAr ? 'دليل نظام المتابعات' : 'Follow-up System Guide'}</span>
            </div>
            <div className="space-y-2 text-[11px] text-slate-300">
              <p>
                <strong className="text-violet-300">{isAr ? 'حجز موعد:' : 'Book Appt:'}</strong>{' '}
                {isAr ? 'ينشئ موعداً رسمياً في التقويم ويزيل التنبيه تلقائياً.' : 'Converts this follow-up into a formal calendar appointment.'}
              </p>
              <p>
                <strong className="text-teal-300">{isAr ? 'بدء كشف:' : 'Walk-in Visit:'}</strong>{' '}
                {isAr ? 'يفتح جلسة علاجية فورية للحيوان مباشرة.' : 'Opens an immediate clinical session form.'}
              </p>
              <p>
                <strong className="text-emerald-300">{isAr ? 'تم / إنهاء:' : 'Mark Done:'}</strong>{' '}
                {isAr ? 'إغلاق التنبيه وإخفائه بدون جدولة موعد.' : 'Dismisses the reminder when follow-up is no longer needed.'}
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}