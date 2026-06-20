/**
 * Display Settings Component
 * Controls image display preferences for products and POS
 */

import { Image, ShoppingCart, Package } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

interface DisplaySettingsProps {
  settings: {
    showImagesInProductCards: boolean
    showImagesInPOSCards: boolean
    showImagesInInventory: boolean
  }
  onChange: (settings: { showImagesInProductCards: boolean; showImagesInPOSCards: boolean; showImagesInInventory: boolean }) => void
}

export default function DisplaySettings({ settings, onChange }: Readonly<DisplaySettingsProps>) {
  const { t } = useLanguage()
  
  const handleToggle = (field: keyof typeof settings) => {
    onChange({
      ...settings,
      [field]: !settings[field]
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {t('imageDisplay')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t('imageDisplayDesc')}
        </p>
      </div>

      {/* Product Cards Setting */}
      <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <Package className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
              {t('showImagesInProductCards')}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('showImagesInProductCardsDesc')}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleToggle('showImagesInProductCards')}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ml-4 ${
            settings.showImagesInProductCards ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.showImagesInProductCards ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* POS Cards Setting */}
      <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
              {t('showImagesInPOSCards')}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('showImagesInPOSCardsDesc')}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleToggle('showImagesInPOSCards')}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ml-4 ${
            settings.showImagesInPOSCards ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.showImagesInPOSCards ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Inventory Table Setting */}
      <div className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
            <Package className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
              {t('showImagesInInventory')}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('showImagesInInventoryDesc')}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleToggle('showImagesInInventory')}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ml-4 ${
            settings.showImagesInInventory ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.showImagesInInventory ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Performance Note */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <Image className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
            {t('performanceTip')}
          </p>
          <p className="text-amber-700 dark:text-amber-300">
            {t('performanceTipDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}
