import { useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export type PeriodPreset = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
export interface PeriodRange { from?: string; to?: string }

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * Compute an ISO `{ from, to }` range for a named preset.
 * `all` returns an empty range (no date bounds).
 */
export function rangeForPreset(p: PeriodPreset): PeriodRange {
  const now = new Date()
  const today = fmt(now)
  switch (p) {
    case 'today': return { from: today, to: today }
    case 'week': {
      const w = new Date(now); w.setDate(now.getDate() - 6)
      return { from: fmt(w), to: today }
    }
    case 'month': {
      const m = new Date(now); m.setDate(now.getDate() - 29)
      return { from: fmt(m), to: today }
    }
    case 'year': {
      const y = new Date(now); y.setFullYear(now.getFullYear() - 1); y.setDate(now.getDate() + 1)
      return { from: fmt(y), to: today }
    }
    default: return {}
  }
}

/**
 * Shared period picker used across the vet tabs. Presents quick presets plus an
 * optional custom from/to range and reports the resolved ISO range via onChange.
 * Self-contained — keeps its own preset/custom state.
 */
export default function VetPeriodFilter({
  onChange, defaultPreset = 'all', presets, compact = false,
}: {
  onChange: (range: PeriodRange & { preset: PeriodPreset }) => void
  defaultPreset?: PeriodPreset
  presets?: PeriodPreset[]
  compact?: boolean
}) {
  const { t } = useLanguage()
  const [preset, setPreset] = useState<PeriodPreset>(defaultPreset)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const list: PeriodPreset[] = presets ?? ['all', 'today', 'week', 'month', 'year', 'custom']

  const label: Record<PeriodPreset, string> = {
    all:    t('vetPeriodAll')   || 'All time',
    today:  t('vetToday')       || 'Today',
    week:   t('vetThisWeek')    || 'Week',
    month:  t('vetThisMonth')   || 'Month',
    year:   t('vetThisYear')    || 'Year',
    custom: t('vetCustomRange') || 'Custom',
  }

  function pick(p: PeriodPreset) {
    setPreset(p)
    if (p === 'custom') { onChange({ from: from || undefined, to: to || undefined, preset: p }); return }
    const r = rangeForPreset(p)
    setFrom(r.from ?? ''); setTo(r.to ?? '')
    onChange({ ...r, preset: p })
  }

  function changeFrom(v: string) { setFrom(v); setPreset('custom'); onChange({ from: v || undefined, to: to || undefined, preset: 'custom' }) }
  function changeTo(v: string)   { setTo(v);   setPreset('custom'); onChange({ from: from || undefined, to: v || undefined, preset: 'custom' }) }

  const btn = (active: boolean) =>
    `px-2.5 py-1.5 ${compact ? 'text-[11px]' : 'text-xs'} font-semibold rounded-lg capitalize transition-colors ` +
    (active
      ? 'bg-violet-600 text-white'
      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-600')

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 flex-wrap">
        {list.map(p => (
          <button key={p} type="button" onClick={() => pick(p)} className={btn(preset === p)}>
            {label[p]}
          </button>
        ))}
      </div>

      {(preset === 'custom' || list.length === 1) && (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input type="date" value={from} onChange={e => changeFrom(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <span className="text-slate-400 text-xs">–</span>
          <input type="date" value={to} onChange={e => changeTo(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          {(from || to) && (
            <button type="button" onClick={() => { setFrom(''); setTo(''); pick('all') }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title={t('vetClearFilter') || 'Clear'}>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
