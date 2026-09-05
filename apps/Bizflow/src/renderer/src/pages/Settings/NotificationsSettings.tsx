/**
 * Notifications Settings Component
 * Configures application-wide and alert-specific notification preferences (Full LTR/RTL Support)
 */

import {
  Bell,
  Package,
  ShoppingCart,
  Mail,
  Sliders,
  AlertTriangle
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { NotificationSettings } from './types'

interface NotificationsSettingsProps {
  settings: NotificationSettings
  onChange: (settings: NotificationSettings) => void
}

export default function NotificationsSettings({
  settings,
  onChange
}: Readonly<NotificationsSettingsProps>) {
  const { t } = useLanguage()

  const handleToggle = (field: keyof NotificationSettings) => {
    onChange({
      ...settings,
      [field]: !settings[field]
    })
  }

  const handleValueChange = (
    field: keyof NotificationSettings,
    value: number | string
  ) => {
    onChange({
      ...settings,
      [field]: value
    })
  }

  const isMasterEnabled = Boolean(settings.notifications)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Bell className="w-5 h-5 text-primary" />
          {t('notificationsSettings')}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('configureNotificationPreferences')}
        </p>
      </div>

      {/* Master Toggle Card */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.05] transition-colors">
        <div className="flex items-center gap-4 min-w-0 me-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-white text-base">
              {t('enableNotifications')}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t('masterToggleNotifications')}
            </div>
          </div>
        </div>

        {/* Master Toggle Button */}
        <button
          type="button"
          role="switch"
          aria-checked={isMasterEnabled}
          aria-label={t('enableNotifications')}
          onClick={() => handleToggle('notifications')}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            isMasterEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isMasterEnabled
                ? 'ltr:translate-x-5 rtl:-translate-x-5'
                : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Notification Categories List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-primary" />
          <span>{t('notificationTypes')}</span>
        </div>

        <div
          className={`space-y-4 transition-opacity duration-200 ${
            !isMasterEnabled ? 'opacity-40 pointer-events-none select-none' : ''
          }`}
        >
          {/* 1. Low Stock Alert */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 transition-all">
            <div
              onClick={() => isMasterEnabled && handleToggle('lowStockAlert')}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5 min-w-0 me-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                    {t('notificationLowStockAlerts')}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {t('notificationLowStockAlertsDesc')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={Boolean(settings.lowStockAlert)}
                aria-label={t('notificationLowStockAlerts')}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggle('lowStockAlert')
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.lowStockAlert ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.lowStockAlert
                      ? 'ltr:translate-x-5 rtl:-translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Threshold Input Field */}
            {settings.lowStockAlert && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 sm:ms-12 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('notificationLowStockThreshold')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={settings.lowStockThreshold || ''}
                    onChange={(e) =>
                      handleValueChange(
                        'lowStockThreshold',
                        e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1)
                      )
                    }
                    placeholder="10"
                    className="w-32 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t('notificationAlertWhenStockBelow')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Sales Notifications */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 transition-all">
            <div
              onClick={() => isMasterEnabled && handleToggle('salesNotifications')}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5 min-w-0 me-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                    {t('notificationSalesAlerts')}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {t('notificationSalesAlertsDesc')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={Boolean(settings.salesNotifications)}
                aria-label={t('notificationSalesAlerts')}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggle('salesNotifications')
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.salesNotifications ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.salesNotifications
                      ? 'ltr:translate-x-5 rtl:-translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 3. Email Notifications */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 transition-all">
            <div
              onClick={() => isMasterEnabled && handleToggle('emailNotifications')}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-3.5 min-w-0 me-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                    {t('notificationEmailAlerts')}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {t('notificationEmailAlertsDesc')}
                  </div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={Boolean(settings.emailNotifications)}
                aria-label={t('notificationEmailAlerts')}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggle('emailNotifications')
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.emailNotifications ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.emailNotifications
                      ? 'ltr:translate-x-5 rtl:-translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Email Input Field */}
            {settings.emailNotifications && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 sm:ms-12 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('notificationEmailAddress')}
                </label>
                <input
                  type="email"
                  value={settings.emailAddress || ''}
                  onChange={(e) => handleValueChange('emailAddress', e.target.value)}
                  placeholder={t('notificationEmailPlaceholder') || 'admin@business.com'}
                  className="w-full max-w-md px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Tip when notifications are turned off */}
      {!isMasterEnabled && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            {t('notificationsDisabledNotice') ||
              'All system notifications and automated background alerts are currently paused. Switch on notifications above to re-enable alerts.'}
          </div>
        </div>
      )}
    </div>
  )
}