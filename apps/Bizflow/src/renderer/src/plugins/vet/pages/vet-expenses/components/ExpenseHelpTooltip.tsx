import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, Info } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function ExpenseHelpTooltip() {
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
              <span>{isAr ? 'دليل إدارة المصاريف' : 'Expenses & Profit Guide'}</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p>
                <strong className="text-emerald-400">{isAr ? 'الإيرادات:' : 'Revenue:'}</strong>{' '}
                {isAr ? 'إجمالي المبالغ المحصلة والمفوترة للعيادة والصيدلية.' : 'Total gross billed value across sessions and store.'}
              </p>
              <p>
                <strong className="text-rose-400">{isAr ? 'المصاريف:' : 'Expenses:'}</strong>{' '}
                {isAr ? 'التكاليف التشغيلية (إيجار، أدوية، رواتب، صيانة).' : 'Operational overheads, supplier invoices, salaries.'}
              </p>
              <p>
                <strong className="text-teal-400">{isAr ? 'صافي الدخل:' : 'Net Income:'}</strong>{' '}
                {isAr ? 'الفارق بين الإيرادات والمصاريف التشغيلية.' : 'Revenue minus all recorded expenses.'}
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}