import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info, HelpCircle } from 'lucide-react'

export function StatsHelpTooltip() {
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
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Metrics help guide"
      >
        <HelpCircle size={15} />
      </button>

      {pos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              zIndex: 99999
            }}
            className="w-72 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs leading-relaxed p-4 shadow-2xl border border-slate-700/50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-1.5 font-semibold text-violet-400 mb-2.5 pb-2 border-b border-slate-700/60">
              <Info size={14} />
              <span>Veterinary Intelligence &amp; Stats</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p><strong className="text-violet-300">Total Patients:</strong> All pets ever registered in the system.</p>
              <p><strong className="text-blue-300">New Patients:</strong> First-time registrations within selected period.</p>
              <p><strong className="text-teal-300">Sessions:</strong> Completed clinical sessions.</p>
              <p><strong className="text-emerald-300">Revenue:</strong> Gross invoiced clinical &amp; medicine value.</p>
              <p><strong className="text-amber-300">Outstanding:</strong> Uncollected patient balances.</p>
              <p><strong className="text-sky-300">Upcoming:</strong> Scheduled upcoming appointments.</p>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}