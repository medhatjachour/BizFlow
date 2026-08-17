import React from 'react'
import { TAB_DEFINITIONS } from '../constants'
import type { MainTab } from '../types'

interface Props {
  activeTab: MainTab
  onSelectTab: (tab: MainTab) => void
}

export const FinanceTabNav: React.FC<Props> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 gap-1">
      {TAB_DEFINITIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => onSelectTab(key)}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all -mb-px ${
            activeTab === key
              ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}