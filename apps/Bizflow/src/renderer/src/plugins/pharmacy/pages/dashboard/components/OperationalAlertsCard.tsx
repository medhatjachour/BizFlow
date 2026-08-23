import React from 'react'
import {
  AlertTriangle,
  PackageX,
  PackageMinus,
  Wallet,
  ChevronRight,
} from 'lucide-react'
import { OperationalAlertItem } from '../types'

interface OperationalAlertsCardProps {
  alerts: OperationalAlertItem[]
  onNavigate?: (tab: string) => void
}

export const OperationalAlertsCard: React.FC<OperationalAlertsCardProps> = ({
  alerts,
  onNavigate,
}) => {
  if (alerts.length === 0) return null

  const getAlertIcon = (iconKey: string) => {
    switch (iconKey) {
      case 'PackageX':
        return <PackageX size={15} className="text-red-500" />
      case 'PackageMinus':
        return <PackageMinus size={15} className="text-amber-500" />
      case 'Wallet':
        return <Wallet size={15} className="text-amber-500" />
      default:
        return <AlertTriangle size={15} className="text-amber-500" />
    }
  }

  const TONE_CLASSES: Record<string, string> = {
    red: 'border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/70',
    amber: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/70',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <AlertTriangle size={13} className="text-amber-500" />
        <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Action Required
        </h2>
        <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 rounded-full">
          {alerts.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {alerts.map(a => (
          <button
            key={a.key}
            type="button"
            onClick={() => onNavigate?.(a.tab)}
            className={`group flex items-center gap-3 text-left rounded-2xl border px-3.5 py-3 transition-all shadow-2xs ${
              TONE_CLASSES[a.tone]
            }`}
          >
            <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
              {getAlertIcon(a.iconKey)}
            </div>

            <div className="min-w-0 flex-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{a.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.2">
                {a.subtitle}
              </p>
            </div>

            <ChevronRight
              size={14}
              className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  )
}