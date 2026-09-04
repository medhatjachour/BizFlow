/**
 * Display Settings Component
 * Controls image display preferences for products and POS (Full LTR/RTL Support)
 */

import React from 'react'
import { Image, ShoppingCart, Package } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

interface DisplaySettingsData {
  showImagesInProductCards: boolean
  showImagesInPOSCards: boolean
  showImagesInInventory: boolean
}

interface DisplaySettingsProps {
  settings: DisplaySettingsData
  onChange: (settings: DisplaySettingsData) => void
}

export default function DisplaySettings({ settings, onChange }: Readonly<DisplaySettingsProps>) {
  const { t } = useLanguage()

  const handleToggle = (field: keyof DisplaySettingsData) => {
    onChange({
      ...settings,
      [field]: !settings[field]
    })
  }

  const items = [
    {
      id: 'showImagesInProductCards' as const,
      icon: Package,
      iconColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      title: t('showImagesInProductCards'),
      description: t('showImagesInProductCardsDesc'),
      checked: settings.showImagesInProductCards
    },
    {
      id: 'showImagesInPOSCards' as const,
      icon: ShoppingCart,
      iconColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      title: t('showImagesInPOSCards'),
      description: t('showImagesInPOSCardsDesc'),
      checked: settings.showImagesInPOSCards
    },
    {
      id: 'showImagesInInventory' as const,
      icon: Package,
      iconColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      title: t('showImagesInInventory'),
      description: t('showImagesInInventoryDesc'),
      checked: settings.showImagesInInventory
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {t('imageDisplay')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t('imageDisplayDesc')}
        </p>
      </div>

      {/* Settings Toggles List */}
      <div className="space-y-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              onClick={() => handleToggle(item.id)}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-900/80 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0 me-4">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${item.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Accessible RTL-Aware Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={item.checked}
                aria-label={item.title}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggle(item.id)
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  item.checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    item.checked
                      ? 'ltr:translate-x-5 rtl:-translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Performance Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <Image className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
            {t('performanceTip')}
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm leading-relaxed">
            {t('performanceTipDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}