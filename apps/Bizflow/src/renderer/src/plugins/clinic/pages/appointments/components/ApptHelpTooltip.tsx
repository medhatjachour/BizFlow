import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

export const ApptHelpTooltip: React.FC = () => {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.top, right: window.innerWidth - r.right })
  }

  return (
    <span
      ref={ref}
      className="inline-flex items-center cursor-default"
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onClick={(e) => e.stopPropagation()}
    >
      <Info className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              transform: 'translateY(-100%) translateY(-8px)',
              zIndex: 9999
            }}
            className="w-64 rounded-xl bg-slate-900/95 backdrop-blur-sm dark:bg-slate-800 text-white text-[11px] leading-relaxed p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <span className="block font-bold text-teal-400 mb-1.5 uppercase tracking-wider text-[10px]">Button Guide</span>
            <div className="space-y-1 text-slate-200">
              <p><strong className="text-teal-300">▶ Start Session:</strong> Creates formal visit & completes appointment.</p>
              <p><strong className="text-sky-300">✓ Check:</strong> Confirm booking status.</p>
              <p><strong className="text-emerald-300">✓ Complete:</strong> Mark as done directly.</p>
              <p><strong className="text-rose-300">× Cancel:</strong> Mark appointment cancelled.</p>
              <p><strong className="text-blue-300">✏ Edit:</strong> Adjust time, doctor or notes.</p>
              <p><strong className="text-red-400">🗑 Delete:</strong> Permanent removal.</p>
            </div>
            <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
          </div>,
          document.body
        )}
    </span>
  )
}