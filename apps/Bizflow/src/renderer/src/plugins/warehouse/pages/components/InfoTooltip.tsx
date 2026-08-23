import React, { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  iconClassName?: string
}

export default function InfoTooltip({ text, iconClassName = 'h-3.5 w-3.5' }: InfoTooltipProps) {
  const tipRef = useRef<HTMLSpanElement>(null)
  const [tipPos, setTipPos] = useState<{ top: number; left: number; isRtl: boolean } | null>(null)

  const updatePosition = useCallback(() => {
    if (!tipRef.current) return

    const r = tipRef.current.getBoundingClientRect()
    const tooltipWidth = 224
    const edgePadding = 12

    const centerX = r.left + r.width / 2
    const minX = edgePadding + tooltipWidth / 2
    const maxX = window.innerWidth - edgePadding - tooltipWidth / 2
    const clampedX = Math.min(maxX, Math.max(minX, centerX))
    const dir = document.documentElement.dir || document.body.dir

    setTipPos({
      top: r.top,
      left: clampedX,
      isRtl: dir === 'rtl'
    })
  }, [])

  const openTip = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation()
    updatePosition()
  }

  const closeTip = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation()
    setTipPos(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      tipPos ? closeTip(e) : openTip(e)
    } else if (e.key === 'Escape' && tipPos) {
      e.preventDefault()
      e.stopPropagation()
      closeTip(e)
    }
  }

  useEffect(() => {
    if (!tipPos) return

    const handleScrollOrResize = () => {
      closeTip()
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [tipPos])

  return (
    <span
      ref={tipRef}
      role="button"
      tabIndex={0}
      className="inline-flex items-center justify-center p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-help select-none"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={openTip}
      onMouseLeave={closeTip}
      onFocus={openTip}
      onBlur={closeTip}
      aria-label="More information"
      aria-expanded={!!tipPos}
      aria-haspopup="true"
    >
      <Info className={`${iconClassName} text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pointer-events-none`} />

      {tipPos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: tipPos.top,
              left: tipPos.left,
              transform: 'translate(-50%, -100%) translateY(-8px)',
              zIndex: 99999
            }}
            dir={tipPos.isRtl ? 'rtl' : 'ltr'}
            className={`pointer-events-none w-56 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs leading-relaxed px-3 py-2 shadow-2xl border border-slate-700/60 whitespace-normal animate-in fade-in zoom-in-95 duration-100 ${
              tipPos.isRtl ? 'text-right' : 'text-left'
            }`}
          >
            {text}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95" />
          </div>,
          document.body
        )}
    </span>
  )
}