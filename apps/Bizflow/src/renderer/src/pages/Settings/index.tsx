/**
 * Settings Page - Refactored
 * Clean, modular architecture with separated settings panels
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Bell,
  CreditCard,
  Receipt,
  Database,
  Save,
  Monitor,
  Tag,
  Users,
  Archive,
  Mail,
  Puzzle
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
import PaymentMethodsSettings from './PaymentMethodsSettings'
import TaxReceiptSettings from './TaxReceiptSettings'
import NotificationsSettings from './NotificationsSettings'
import BackupSettings from './BackupSettings'
import ArchiveManagementSettings from './ArchiveManagementSettings'
import EmailSettings from './EmailSettings'
import ModulesSettings from './ModulesSettings'
import type { SettingsTab } from './types'
import type { PluginId } from '../../../../shared/permissions'
import logger from '../../../../shared/utils/logger'

export default function Settings() {
  const [searchParams] = useSearchParams()
  const { theme, setTheme, actualTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { updateSettings: updateDisplaySettingsContext } = useDisplaySettingsContext()
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
    paymentMethods,
    setPaymentMethods,
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

  const allTabs = [
    { id: 'general' as SettingsTab, name: t('general'), icon: SettingsIcon },
    { id: 'display' as SettingsTab, name: t('display'), icon: Monitor },
    { id: 'categories' as SettingsTab, name: t('categories'), icon: Tag },
    { id: 'users' as SettingsTab, name: t('userManagement'), icon: Users },
    { id: 'payments' as SettingsTab, name: t('payments'), icon: CreditCard },
    { id: 'tax' as SettingsTab, name: t('taxReceipt'), icon: Receipt },
    { id: 'notifications' as SettingsTab, name: t('notifications'), icon: Bell },
    { id: 'email' as SettingsTab, name: 'Email Reports', icon: Mail },
    { id: 'backup' as SettingsTab, name: t('backup'), icon: Database },
    { id: 'archive' as SettingsTab, name: t('archive'), icon: Archive },
    { id: 'modules' as SettingsTab, name: 'Modules', icon: Puzzle }
  ]

  const CLINIC_TABS: SettingsTab[] = ['general', 'users', 'backup']
  const VET_TABS: SettingsTab[] = ['general', 'users', 'backup']
  const BAKERY_TABS: SettingsTab[] = ['general', 'users', 'backup']

  const pluginRoutes: PluginId[] = ['commerce', 'bakery', 'restaurant', 'warehouse', 'clinic', 'vet', 'gym', 'pharmacy', 'coffee']
  const bundledPlugins: PluginId[] = [
    __PLUGIN_COMMERCE__ ? 'commerce' : null,
    __PLUGIN_BAKERY__ ? 'bakery' : null,
    __PLUGIN_RESTAURANT__ ? 'restaurant' : null,
    __PLUGIN_WAREHOUSE__ ? 'warehouse' : null,
    __PLUGIN_CLINIC__ ? 'clinic' : null,
    __PLUGIN_VET__ ? 'vet' : null,
    __PLUGIN_GYM__ ? 'gym' : null,
    __PLUGIN_PHARMACY__ ? 'pharmacy' : null,
    __PLUGIN_COFFEE__ ? 'coffee' : null,
  ].filter((value): value is PluginId => Boolean(value))
  const requestedPlugin = searchParams.get('plugin')
  const activePlugin = document.body.dataset.plugin
  const lastPlugin = localStorage.getItem('bizflow:lastPlugin')
  const singleBundledPlugin = bundledPlugins.length === 1 ? bundledPlugins[0] : null
  const pluginContext = ([requestedPlugin, activePlugin, lastPlugin, singleBundledPlugin]
    .find((value): value is PluginId => !!value && pluginRoutes.includes(value as PluginId)) ?? null)
  const pluginTabs: SettingsTab[] = ['general', 'users', 'backup']
  const tabs = pluginContext
    ? allTabs.filter(tab => pluginTabs.includes(tab.id))
    : clinicEnabled || vetEnabled || bakeryEnabled
      ? allTabs.filter((tab) =>
          (clinicEnabled ? CLINIC_TABS : vetEnabled ? VET_TABS : BAKERY_TABS).includes(tab.id)
        )
      : allTabs

  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTab)) setActiveTab(tabs[0]?.id ?? 'general')
  }, [activeTab, tabs])

  const handleSave = () => {
    try {
      const success = saveSettings()
      if (success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      logger.error('Failed to save settings:', error)
      // Could show toast here if needed
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
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Save className="w-5 h-5" />
          {t('saveChanges')}
        </button>
      </div>

      {/* Save Success Message */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">
            {t('settingsSavedSuccess')}
          </p>
        </div>
      )}

      {/* Tabs and Content */}
      <div className="flex gap-6 min-w-0 items-start">
        {/* Sidebar Tabs */}
        <div className="w-64 flex-shrink-0">
          <div className="sticky top-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 lg:p-8">
          <div className="space-y-6">
            {activeTab === 'general' && (
              <GeneralSettings
                theme={theme}
                onThemeChange={(theme: 'light' | 'dark' | 'system') => setTheme(theme as any)}
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

            {activeTab === 'payments' && (
              <PaymentMethodsSettings settings={paymentMethods} onChange={setPaymentMethods} />
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
        </div>
      </div>
    </div>
  )
}
