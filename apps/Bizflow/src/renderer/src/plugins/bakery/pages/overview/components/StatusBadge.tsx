import React from 'react'
import { Calendar, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLanguage()

  const config: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    planned: {
      label: t('bakeryStatusPlanned'),
      cls: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      icon: <Calendar className="h-3 w-3" />
    },
    in_progress: {
      label: t('bakeryStatusInProgress'),
      cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: <Loader2 className="h-3 w-3 animate-spin" />
    },
    completed: {
      label: t('bakeryStatusDone'),
      cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 className="h-3 w-3" />
    },
    cancelled: {
      label: t('bakeryStatusCancelled'),
      cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      icon: <XCircle className="h-3 w-3" />
    }
  }

  const s = config[status] ?? config.planned

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.cls} transition-colors`}
    >
      {s.icon}
      <span>{s.label}</span>
    </span>
  )
}