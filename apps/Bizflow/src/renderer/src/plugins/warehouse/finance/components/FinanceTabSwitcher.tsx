import React from 'react'
import { FinanceTabType } from '../types'
import { FINANCE_TABS } from '../constants'

interface Props {
  activeTab: FinanceTabType
  onChange: (tab: FinanceTabType) => void
}

export const FinanceTabSwitcher: React.FC<Props> = ({ activeTab, onChange }) => {
  return (
    <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
      {FINANCE_TABS.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}