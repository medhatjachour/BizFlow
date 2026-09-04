/**
 * Settings Page
 * Clean, modular architecture with separated settings panels
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Bell,
  Receipt,
  Database,
  Save,
  Monitor,
  Tag,
  Users,
  Archive,
  Mail,
  Puzzle,
  CheckCircle2
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useDisplaySettings as useDisplaySettingsContext } from '../../contexts/DisplaySettingsContext'
import { useModuleEnabled } from '../../hooks/useModuleEnabled'
import { useSettings } from './useSettings'

import GeneralSettings from './GeneralSettings'
import DisplaySettings from './DisplaySettings'
import CategorySettings from './CategorySettings'
import UserManagementSettings from './userMangement'
import RolePermissionsSettings from './RolePermissionsSettings'

import TaxReceiptSettings from './TaxReceiptSettings'
import NotificationsSettings from './NotificationsSettings'
import BackupSettings from './BackupSettings'
import ArchiveManagementSettings from './ArchiveManagementSettings'
import EmailSettings from './EmailSettings'
import ModulesSettings from './ModulesSettings'

import type { SettingsTab } from './types'
import type { PluginId } from '../../../../shared/permissions'
import logger from '../../../../shared/utils/logger'

// Declare compile-time plugin build flags safely
declare const __PLUGIN_COMMERCE__: boolean | undefined
declare const __PLUGIN_BAKERY__: boolean | undefined
declare const __PLUGIN_RESTAURANT__: boolean | undefined
declare const __PLUGIN_WAREHOUSE__: boolean | undefined
declare const __PLUGIN_CLINIC__: boolean | undefined
declare const __PLUGIN_VET__: boolean | undefined
declare const __PLUGIN_GYM__: boolean | undefined
declare const __PLUGIN_PHARMACY__: boolean | undefined
declare const __PLUGIN_COFFEE__: boolean | undefined

const VALID_PLUGINS: PluginId[] = [
  'commerce',
  'bakery',
  'restaurant',
  'warehouse',
  'clinic',
  'vet',
  'gym',
  'pharmacy',
  'coffee'
]

// Tab visibility configuration per plugin
const PLUGIN_TAB_CONFIG: Record<PluginId, SettingsTab[]> = {
    commerce: [
    'general',
    'display',
    'categories',
    'users',
    'payments',
    'tax',
    'notifications',
    'email',
    'backup',
    'archive',
    'modules'
  ],
  clinic: ['general', 'users', 'backup'],
  vet: ['general', 'users', 'backup'],
  gym: ['general', 'users', 'backup'],
  bakery: ['users', 'user', 'backup'],

  restaurant: ['general', 'users', 'tax', 'backup'],
  warehouse: ['general', 'users', 'backup'],
  pharmacy: ['general', 'categories', 'tax', 'backup'],
  coffee: ['general', 'users', 'tax', 'backup']
}

function resolveBundledSinglePlugin(): PluginId | null {
  const flags: [unknown, PluginId][] = [
    [typeof __PLUGIN_COMMERCE__ !== 'undefined' ? __PLUGIN_COMMERCE__ : false, 'commerce'],
    [typeof __PLUGIN_BAKERY__ !== 'undefined' ? __PLUGIN_BAKERY__ : false, 'bakery'],
    [typeof __PLUGIN_RESTAURANT__ !== 'undefined' ? __PLUGIN_RESTAURANT__ : false, 'restaurant'],
    [typeof __PLUGIN_WAREHOUSE__ !== 'undefined' ? __PLUGIN_WAREHOUSE__ : false, 'warehouse'],
    [typeof __PLUGIN_CLINIC__ !== 'undefined' ? __PLUGIN_CLINIC__ : false, 'clinic'],
    [typeof __PLUGIN_VET__ !== 'undefined' ? __PLUGIN_VET__ : false, 'vet'],
    [typeof __PLUGIN_GYM__ !== 'undefined' ? __PLUGIN_GYM__ : false, 'gym'],
    [typeof __PLUGIN_PHARMACY__ !== 'undefined' ? __PLUGIN_PHARMACY__ : false, 'pharmacy'],
    [typeof __PLUGIN_COFFEE__ !== 'undefined' ? __PLUGIN_COFFEE__ : false, 'coffee']
  ]
  const bundled = flags.filter(([flag]) => Boolean(flag)).map(([, id]) => id)
  return bundled.length === 1 ? bundled[0] : null
}

export default function Settings() {
  const [searchParams] = useSearchParams()
  const { theme, setTheme, actualTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { updateSettings: updateDisplaySettingsContext } = useDisplaySettingsContext()

  // Module state checks
  const clinicEnabled = useModuleEnabled('clinic')
  const vetEnabled = useModuleEnabled('vet')
  const bakeryEnabled = useModuleEnabled('bakery')

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const {
    taxReceiptSettings,
    setTaxReceiptSettings,
    notificationSettings,
    setNotificationSettings,

    backupSettings,
    setBackupSettings,
    displaySettings,
    setDisplaySettings,
    saveSettings
  } = useSettings()

  // Sync display settings with DisplaySettingsContext
  const handleDisplaySettingsChange = (newSettings: typeof displaySettings) => {
    setDisplaySettings(newSettings)
    updateDisplaySettingsContext(newSettings)
  }

  // Resolve current active plugin context with priority order
  const pluginContext = useMemo<PluginId | null>(() => {
    const requested = searchParams.get('plugin')
    const active = typeof document !== 'undefined' ? document.body.dataset.plugin : null
    const last =
      typeof localStorage !== 'undefined' ? localStorage.getItem('bizflow:lastPlugin') : null
    const singleBundled = resolveBundledSinglePlugin()

    const candidate = [requested, active, last, singleBundled].find(
      (val): val is PluginId => Boolean(val) && VALID_PLUGINS.includes(val as PluginId)
    )

    return candidate ?? null
  }, [searchParams])

  // Tab definitions
  const allTabs = useMemo(
    () => [
      { id: 'general' as SettingsTab, name: t('general'), icon: SettingsIcon },
      { id: 'display' as SettingsTab, name: t('display'), icon: Monitor },
      { id: 'categories' as SettingsTab, name: t('categories'), icon: Tag },
      { id: 'users' as SettingsTab, name: t('userManagement'), icon: Users },

      { id: 'tax' as SettingsTab, name: t('taxReceipt'), icon: Receipt },
      { id: 'notifications' as SettingsTab, name: t('notifications'), icon: Bell },
      { id: 'email' as SettingsTab, name: 'Email Reports', icon: Mail },
      { id: 'backup' as SettingsTab, name: t('backup'), icon: Database },
      { id: 'archive' as SettingsTab, name: t('archive'), icon: Archive },
      { id: 'modules' as SettingsTab, name: 'Modules', icon: Puzzle }
    ],
    [t]
  )

  // Filter available tabs according to active plugin or module states
  const tabs = useMemo(() => {
    if (pluginContext && PLUGIN_TAB_CONFIG[pluginContext]) {
      const allowed = PLUGIN_TAB_CONFIG[pluginContext]
      return allTabs.filter((tab) => allowed.includes(tab.id))
    }

    if (clinicEnabled) {
      return allTabs.filter((tab) => PLUGIN_TAB_CONFIG.clinic.includes(tab.id))
    }

    if (vetEnabled) {
      return allTabs.filter((tab) => PLUGIN_TAB_CONFIG.vet.includes(tab.id))
    }

    if (bakeryEnabled) {
      return allTabs.filter((tab) => PLUGIN_TAB_CONFIG.bakery.includes(tab.id))
    }

    return allTabs
  }, [pluginContext, clinicEnabled, vetEnabled, bakeryEnabled, allTabs])

  // Ensure activeTab stays in sync when visible tabs change
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? 'general')
    }
  }, [tabs, activeTab])

  const handleSave = () => {
    try {
      const success = saveSettings()
      if (success) {
        setSaveSuccess(true)
        const timer = setTimeout(() => setSaveSuccess(false), 3000)
        return () => clearTimeout(timer)
      }
      return false
    } catch (error) {
      logger.error('Failed to save settings:', error)
      return false
    }
  }

  return (
    <div className="p-6 mx-auto w-full max-w-[1800px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {t('settings')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">{t('manageAppPreferences')}</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm active:scale-95"
        >
          <Save className="w-5 h-5" />
          {t('saveChanges')}
        </button>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">
            {t('settingsSavedSuccess')}
          </p>
        </div>
      )}

      {/* Settings Grid */}
      <div className="flex flex-col md:flex-row gap-6 min-w-0 items-start">
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav
            aria-label="Settings navigation"
            className="sticky top-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-primary text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 lg:p-8">
          <div className="space-y-6">
            {activeTab === 'general' && (
              <GeneralSettings
                theme={theme}
                onThemeChange={(newTheme) => setTheme(newTheme as Parameters<typeof setTheme>[0])}
                actualTheme={actualTheme}
                language={language}
                onLanguageChange={setLanguage}
              />
            )}

            {activeTab === 'display' && (
              <DisplaySettings settings={displaySettings} onChange={handleDisplaySettingsChange} />
            )}

            {activeTab === 'categories' && <CategorySettings />}

            {activeTab === 'users' && (
              <div className="min-w-0 grid grid-cols-1 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 items-start">
                <div className="min-w-0">
                  <UserManagementSettings pluginId={pluginContext} />
                </div>
                <div className="min-w-0">
                  <RolePermissionsSettings pluginId={pluginContext} />
                </div>
              </div>
            )}

            {activeTab === 'tax' && (
              <TaxReceiptSettings settings={taxReceiptSettings} onChange={setTaxReceiptSettings} />
            )}

            {activeTab === 'notifications' && (
              <NotificationsSettings
                settings={notificationSettings}
                onChange={setNotificationSettings}
              />
            )}

            {activeTab === 'email' && <EmailSettings onSave={handleSave} />}

            {activeTab === 'backup' && (
              <BackupSettings settings={backupSettings} onChange={setBackupSettings} />
            )}

            {activeTab === 'archive' && <ArchiveManagementSettings />}

            {activeTab === 'modules' && <ModulesSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}
