import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, Info } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function AppointmentHelpTooltip() {
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
              <span>{isAr ? 'دليل إدارة المواعيد' : 'Appointments Workflow'}</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p>
                <strong className="text-violet-300">{isAr ? 'بدء الجلسة:' : 'Start Session:'}</strong>{' '}
                {isAr ? 'عند حضور الحيوان، ينشئ زيارة سريرية ويكمل الموعد تلقائياً.' : 'Converts booking into active clinical visit.'}
              </p>
              <p>
                <strong className="text-teal-300">{isAr ? 'تأكيد الحجز:' : 'Confirm:'}</strong>{' '}
                {isAr ? 'تحويل الموعد من مجدول إلى مؤكد.' : 'Marks slot as confirmed with owner.'}
              </p>
              <p>
                <strong className="text-emerald-300">{isAr ? 'إنهاء / مكتمل:' : 'Complete:'}</strong>{' '}
                {isAr ? 'إغلاق الموعد دون فتح جلسة مفصلة.' : 'Marks done without session record.'}
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}