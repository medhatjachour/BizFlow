import React from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { daysUntil } from '../utils'

interface ExpiryBadgeProps {
  date?: string | null
  qty: number
}

export const ExpiryBadge: React.FC<ExpiryBadgeProps> = ({ date, qty }) => {
  const { t } = useLanguage()

  if (!date || qty <= 0) {
    return <span className="text-xs text-slate-400 font-mono">—</span>
  }

  const days = daysUntil(date)

  if (days < 0) {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 ring-1 ring-inset ring-rose-600/20">
        {t('vetExpiredBadge') || 'Expired'}
      </span>
    )
  }

  if (days <= 7) {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 ring-1 ring-inset ring-rose-600/20 animate-pulse">
        {days}d
      </span>
    )
  }

  if (days <= 30) {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
        {days}d
      </span>
    )
  }

  return (
    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
      {new Date(date).toLocaleDateString()}
    </span>
  )
}