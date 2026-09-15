import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { followPluginTarget } from '@renderer/utils/pluginTabs'
import { QUICK_ACTIONS } from '../constants'

export const QuickActionsBar: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.id}
            onClick={() => followPluginTarget('gym', action, navigate)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-95 ${action.className}`}
          >
            <Icon size={13} />
            <span>{t(action.labelKey) ?? action.id}</span>
          </button>
        )
      })}
    </div>
  )
}