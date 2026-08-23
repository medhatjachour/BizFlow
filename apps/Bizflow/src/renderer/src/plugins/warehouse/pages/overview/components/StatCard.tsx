import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import InfoTooltip from '../../components/InfoTooltip'
import { STAT_COLOR_VARIANTS } from '../constants'
import { StatItemConfig } from '../types'

interface StatCardProps {
  config: StatItemConfig
  onSelect: () => void
}

export const StatCard: React.FC<StatCardProps> = ({ config, onSelect }) => {
  const Icon = config.icon
  const colorStyle = STAT_COLOR_VARIANTS[config.color] || STAT_COLOR_VARIANTS.slate

  return (
    <button
      onClick={onSelect}
      type="button"
      className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left shadow-sm transition-all duration-200 ${colorStyle.hoverBorder} ${colorStyle.activeGlow} hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
    >
      <div className="flex items-center justify-between w-full mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${colorStyle.iconBg} ${colorStyle.iconColor}`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex items-center gap-1">
          {config.badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
              {config.badge}
            </span>
          )}
          <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {config.value.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="truncate">{config.labelKey}</span>
          <InfoTooltip text={config.hintKey} />
        </div>
      </div>
    </button>
  )
}