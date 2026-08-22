import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Phone } from 'lucide-react'
import { AtRiskMember } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface AtRiskBannerProps {
  members: AtRiskMember[]
}

export function AtRiskBanner({ members }: AtRiskBannerProps) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  if (members.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-300/80 dark:border-amber-600/30 bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 backdrop-blur-md overflow-hidden shadow-sm transition-all duration-300">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-3.5 text-left focus:outline-none"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={17} />
          </div>
          <div>
            <span className="text-sm font-bold text-amber-900 dark:text-amber-300">
              {members.length} {t('gymAtRiskBanner') || 'Members are at risk of churning'}
            </span>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
              No visits registered in the past 14+ days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2 py-1 rounded-lg bg-amber-200/50 dark:bg-amber-800/30">
          <span>{expanded ? 'Hide' : 'Review'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-amber-200/60 dark:border-amber-800/40 divide-y divide-amber-100/80 dark:divide-amber-800/20 max-h-64 overflow-y-auto">
          {members.map(m => (
            <div
              key={m.traineeId}
              className="flex items-center justify-between px-5 py-3 hover:bg-amber-100/40 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-bold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {m.planName ?? 'Subscription'} · Last visit:{' '}
                    {m.lastVisit ? new Date(m.lastVisit).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40">
                  {m.daysSince === 999 ? 'Never' : `${m.daysSince}d ago`}
                </span>
                {m.phone && (
                  <a
                    href={`tel:${m.phone}`}
                    className="p-2 rounded-xl bg-amber-200/60 dark:bg-amber-800/30 text-amber-800 dark:text-amber-200 hover:bg-amber-300/80 dark:hover:bg-amber-700/50 transition-all hover:scale-105 active:scale-95"
                    title={`Call ${m.phone}`}
                  >
                    <Phone size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}