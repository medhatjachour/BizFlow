import React from 'react'
import type { ProfileTab } from '../hooks/useEmployeeProfile'
import { User, Calendar, Clock, DollarSign, Activity, FileText, AlarmClock } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  tab: ProfileTab
  onChange: (t: ProfileTab) => void
  counts?: Partial<Record<ProfileTab, number>>
}

export default function TabBar({ tab, onChange, counts = {} }: Props) {
  const { t } = useLanguage()

  const TABS: { key: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',   label: t('tabOverview'),    icon: <User size={16} /> },
    { key: 'attendance', label: t('tabAttendance'),  icon: <Calendar size={16} /> },
    { key: 'shifts',     label: t('tabShifts'),      icon: <Clock size={16} /> },
    { key: 'overtime',   label: t('tabOvertime'),    icon: <AlarmClock size={16} /> },
    { key: 'payroll',    label: t('tabPayroll'),     icon: <DollarSign size={16} /> },
    { key: 'activity',   label: t('tabActivity'),    icon: <Activity size={16} /> },
    { key: 'documents',  label: t('tabDocuments'),   icon: <FileText size={16} /> },
  ]

  return (
    <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
      {TABS.map(tb => (
        <button
          key={tb.key}
          onClick={() => onChange(tb.key)}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab === tb.key
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {tb.icon} {tb.label}
          {(counts[tb.key] ?? 0) > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold leading-none ${
              tab === tb.key
                ? 'bg-primary/15 text-primary'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              {counts[tb.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
