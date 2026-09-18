interface ProgressBarProps {
  /** 0-100 (values above 100 are clamped for the fill, kept for the label). */
  percent: number
  label?: string
  level?: string
  className?: string
}

const LEVEL_FILL: Record<string, string> = {
  clear: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  blocked: 'bg-slate-400',
  off: 'bg-slate-300 dark:bg-slate-600'
}

export default function ProgressBar({
  percent,
  label,
  level = 'clear',
  className = ''
}: ProgressBarProps) {
  const safe = Number.isFinite(percent) ? percent : 0
  const filled = Math.min(100, Math.max(0, safe))
  const fill = LEVEL_FILL[level] ?? LEVEL_FILL.clear

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">{label}</span>
          <span className="tabular-nums">{Math.round(safe)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${fill}`}
          style={{ width: `${filled}%` }}
        />
      </div>
    </div>
  )
}
