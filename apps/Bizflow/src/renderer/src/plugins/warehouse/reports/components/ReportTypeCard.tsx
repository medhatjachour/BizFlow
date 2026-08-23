import React from 'react'
import { ReportOptionConfig } from '../constants'

interface Props {
  config: ReportOptionConfig
  isSelected: boolean
  onSelect: () => void
}

export const ReportTypeCard: React.FC<Props> = ({ config, isSelected, onSelect }) => {
  const Icon = config.icon

  return (
    <button
      onClick={onSelect}
      type="button"
      className={`group p-4 rounded-2xl border text-left transition-all duration-200 ${
        isSelected
          ? 'bg-slate-900 text-white dark:bg-indigo-600 border-indigo-500 shadow-lg ring-2 ring-indigo-500/30 scale-[1.01]'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${
          isSelected ? 'bg-white/15 text-white border-white/20' : config.badgeColor
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="font-bold text-xs tracking-tight">{config.label}</div>
      <div
        className={`text-[11px] mt-1 leading-snug ${
          isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {config.description}
      </div>
    </button>
  )
}