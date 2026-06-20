/**
 * Notifications Settings Panel
 */

import { Bell, Package, ShoppingCart, Mail } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { NotificationSettings } from './types'

type Props = {
  settings: NotificationSettings
  onChange: (settings: NotificationSettings) => void
}

export default function NotificationsSettings({ settings, onChange }: Props) {
  const { t } = useLanguage()
  const handleChange = (field: keyof NotificationSettings, value: boolean | number | string) => {
    onChange({ ...settings, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('notificationsSettings')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t('configureNotificationPreferences')}
        </p>
      </div>

      {/* Master Toggle */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
            <Bell size={24} />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{t('enableNotifications')}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{t('masterToggleNotifications')}</div>
          </div>
        </div>
        <button
          onClick={() => handleChange('notifications', !settings.notifications)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.notifications ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.notifications ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('notificationTypes')}
        </h4>

        {/* Low Stock Alert */}
        <div className="glass-card p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-accent/20 text-accent rounded-lg flex items-center justify-center">
                <Package size={20} />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{t('notificationLowStockAlerts')}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('notificationLowStockAlertsDesc')}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.lowStockAlert}
              onChange={(e) => handleChange('lowStockAlert', e.target.checked)}
              disabled={!settings.notifications}
            />
          </label>

          {settings.lowStockAlert && (
            <div className="mt-4 pl-14 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('notificationLowStockThreshold')}
              </label>
              <input
                type="number"
                className="input-field max-w-xs"
                value={settings.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value) || 10)}
                placeholder="10"
                min="1"
                disabled={!settings.notifications}
              />
              <p className="text-xs text-slate-500">
                {t('notificationAlertWhenStockBelow')}
              </p>
            </div>
          )}
        </div>

        {/* Sales Notifications */}
        <div className="glass-card p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-success/20 text-success rounded-lg flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{t('notificationSalesAlerts')}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('notificationSalesAlertsDesc')}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.salesNotifications}
              onChange={(e) => handleChange('salesNotifications', e.target.checked)}
              disabled={!settings.notifications}
            />
          </label>
        </div>

        {/* Email Notifications */}
        <div className="glass-card p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/20 text-blue-500 rounded-lg flex items-center justify-center">
                <Mail size={20} />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{t('notificationEmailAlerts')}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('notificationEmailAlertsDesc')}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.emailNotifications}
              onChange={(e) => handleChange('emailNotifications', e.target.checked)}
              disabled={!settings.notifications}
            />
          </label>

          {settings.emailNotifications && (
            <div className="mt-4 pl-14 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('notificationEmailAddress')}
              </label>
              <input
                type="email"
                className="input-field"
                value={settings.emailAddress || ''}
                onChange={(e) => handleChange('emailAddress', e.target.value)}
                placeholder={t('notificationEmailPlaceholder')}
                disabled={!settings.notifications}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
