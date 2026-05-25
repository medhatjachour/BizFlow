import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

export default function InfoTooltip({ text, iconClassName = 'h-3.5 w-3.5' }: { text: string; iconClassName?: string }) {
  const tipRef = useRef<HTMLButtonElement>(null)
  const [tipPos, setTipPos] = useState<{ top: number; left: number; isRtl: boolean } | null>(null)

  const openTip = () => {
    if (!tipRef.current) return

    const r = tipRef.current.getBoundingClientRect()
    const tooltipWidth = 224
    const edgePadding = 12
    const centerX = r.left + (r.width / 2)
    const minX = edgePadding + (tooltipWidth / 2)
    const maxX = window.innerWidth - edgePadding - (tooltipWidth / 2)
    const clampedX = Math.min(maxX, Math.max(minX, centerX))
    const dir = document.documentElement.dir || document.body.dir
    setTipPos({ top: r.top, left: clampedX, isRtl: dir === 'rtl' })
  }

  return (
    <button
      type="button"
      ref={tipRef}
      className="inline-flex"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={openTip}
      onMouseLeave={() => setTipPos(null)}
      onFocus={openTip}
      onBlur={() => setTipPos(null)}
      aria-label="More information"
      aria-expanded={!!tipPos}
      aria-haspopup="true"
    >
      <Info className={`${iconClassName} text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help`} />
      {tipPos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tipPos.top,
            left: tipPos.left,
            transform: 'translate(-50%, -100%) translateY(-8px)',
            zIndex: 99999
          }}
          dir={tipPos.isRtl ? 'rtl' : 'ltr'}
          className={`pointer-events-none w-56 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-xs leading-relaxed px-3 py-2 shadow-xl whitespace-normal ${tipPos.isRtl ? 'text-right' : 'text-left'}`}
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
        </div>,
        document.body
      )}
    </button>
  )
}