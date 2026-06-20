import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export const api = (window as any).api?.vet?.medicines
export const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500'

export const DEFAULT_UNITS = ['tablet', 'capsule', 'ml', 'vial', 'tube', 'bottle', 'sachet', 'other']
const UNITS_KEY = 'vet_medicine_units'

export function loadUnits(): string[] {
  try { const s = localStorage.getItem(UNITS_KEY); if (s) return JSON.parse(s) } catch {}
  return [...DEFAULT_UNITS]
}

export function saveUnits(us: string[]) {
  localStorage.setItem(UNITS_KEY, JSON.stringify(us))
}

export function daysUntil(date: string) {
  return Math.floor((new Date(date).getTime() - Date.now()) / 86400000)
}

export function ExpiryBadge({ date, qty }: { date: string; qty: number }) {
  const { t } = useLanguage()
  if (qty <= 0) return <span className="text-xs text-slate-400">—</span>
  const days = daysUntil(date)
  if (days < 0)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t('vetExpiredBadge')||'Expired'}</span>
  if (days <= 7)  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{days}d</span>
  if (days <= 30) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">{days}d</span>
  return <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(date).toLocaleDateString()}</span>
}

export function StoreHelp() {
  const { t } = useLanguage()
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = { current: null as HTMLSpanElement | null }
  return (
    <span ref={r => { ref.current = r }} className="inline-flex items-center cursor-default"
      onMouseEnter={() => { const r = ref.current?.getBoundingClientRect(); if (r) setPos({ top: r.top, right: window.innerWidth - r.right }) }}
      onMouseLeave={() => setPos(null)}>
      <Info size={13} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors" />
      {pos && createPortal(
        <div style={{ position: 'fixed', top: pos.top, right: pos.right, transform: 'translateY(-100%) translateY(-8px)', zIndex: 9999 }}
          className="w-64 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-2xl">
          <span className="block font-semibold text-violet-400 mb-1.5">{t('vetMedStore')||'Medicine Store'}</span>
          <span className="block mb-0.5">{t('vetMedStoreHelpDesc')||'Add medicines to the catalogue, then receive batches — each with its own expiry date and lot #.'}</span>
          <span className="block text-slate-300 mt-1">{t('vetMedStoreHelpLegend')||'🔴 Expired  🟡 Expiring ≤30d  🟠 Low stock'}</span>
          <span className="absolute top-full right-3 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
        </div>, document.body
      )}
    </span>
  )
}
