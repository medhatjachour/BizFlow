import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export const StoreHelp: React.FC = () => {
  const { t } = useLanguage()
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = { current: null as HTMLSpanElement | null }

  return (
    <span
      ref={r => { ref.current = r }}
      className="inline-flex items-center cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      onMouseEnter={() => {
        const r = ref.current?.getBoundingClientRect()
        if (r) setPos({ top: r.top, right: window.innerWidth - r.right })
      }}
      onMouseLeave={() => setPos(null)}
    >
      <Info size={15} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
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
            className="w-64 rounded-2xl bg-slate-900 text-white text-[11px] leading-relaxed p-3.5 shadow-2xl border border-slate-800 pointer-events-none"
          >
            <span className="block font-bold text-violet-400 mb-1">
              {t('vetMedStore') || 'Medicine Store'}
            </span>
            <span className="block text-slate-300 mb-1.5">
              {t('vetMedStoreHelpDesc') ||
                'Add medicines to the catalogue, then receive batches — each with its own expiry date and lot #.'}
            </span>
            <span className="block text-slate-400 font-mono">
              {t('vetMedStoreHelpLegend') || '🔴 Expired  🟡 Expiring ≤30d  🟠 Low stock'}
            </span>
          </div>,
          document.body
        )}
    </span>
  )
}