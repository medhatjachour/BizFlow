/**
 * Email Settings Panel
 * Configure daily email reports
 */

import { useState, useEffect } from 'react'
import { Mail, Send, Eye, TestTube, Clock, CheckCircle, XCircle } from 'lucide-react'
import logger from '../../../../shared/utils/logger'

interface EmailSettingsData {
  userId: string
  email: string
  frequency: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
}

type Props = {
  onSave?: () => void
}

export default function EmailSettings({ onSave }: Props) {
  const [settings, setSettings] = useState<EmailSettingsData>({
    userId: '',
    email: '',
    frequency: 'daily',
    enabled: false
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load current settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('email:getConfig', 'default-user')
      if (result.success && result.config) {
        setSettings(result.config)
      }
    } catch (error) {
      logger.error('Failed to load email settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const result = await window.electron.ipcRenderer.invoke('email:configure', settings)
      if (result.success) {
        setMessage({ type: 'success', text: 'Email settings saved successfully!' })
        onSave?.()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save settings' })
      }
    } catch (error) {
      logger.error('Failed to save email settings:', error)
      setMessage({ type: 'error', text: 'Failed to save email settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!settings.email) {
      setMessage({ type: 'error', text: 'Please enter an email address first' })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      const result = await window.electron.ipcRenderer.invoke('email:testSend', settings.email)
      if (result.success) {
        setMessage({ type: 'success', text: 'Test email sent successfully! Check your inbox.' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send test email' })
      }
    } catch (error) {
      logger.error('Failed to send test email:', error)
      setMessage({ type: 'error', text: 'Failed to send test email' })
    } finally {
      setTesting(false)
    }
  }

  const handlePreview = async () => {
    setLoading(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('email:generatePreview', 'default-user')
      if (result.success) {
        setPreview(result.data)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to generate preview' })
      }
    } catch (error) {
      logger.error('Failed to generate preview:', error)
      setMessage({ type: 'error', text: 'Failed to generate preview' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendNow = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const result = await window.electron.ipcRenderer.invoke('email:sendReport', 'default-user')
      if (result.success) {
        setMessage({ type: 'success', text: 'Daily report sent successfully!' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send report' })
      }
    } catch (error) {
      logger.error('Failed to send report:', error)
      setMessage({ type: 'error', text: 'Failed to send report' })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !settings.userId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Daily Email Reports
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Get automated daily business reports delivered to your email every morning at 11 PM.
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
            <Mail size={24} />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Enable Daily Reports</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Receive automated business reports via email
            </div>
          </div>
        </div>
        <button
          onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Email Configuration */}
      <div className="glass-card p-6 space-y-4">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Email Configuration</h4>

        {/* Email Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={settings.email}
            onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="your-email@example.com"
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Report Frequency
          </label>
          <select
            value={settings.frequency}
            onChange={(e) => setSettings(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="daily">Daily (Recommended)</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="glass-card p-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleTestEmail}
            disabled={testing || !settings.email}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <TestTube size={18} />
            {testing ? 'Sending...' : 'Send Test Email'}
          </button>

          <button
            onClick={handlePreview}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Eye size={18} />
            {loading ? 'Loading...' : 'Preview Report'}
          </button>

          <button
            onClick={handleSendNow}
            disabled={loading || !settings.enabled}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
            {loading ? 'Sending...' : 'Send Report Now'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {preview && (
        <div className="glass-card p-6">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Eye size={18} />
            Report Preview
          </h4>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{preview.totalSales}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Sales</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">${preview.totalRevenue.toFixed(2)}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Revenue</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">${preview.totalProfit.toFixed(2)}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Profit</div>
              </div>
            </div>

            {preview.topProducts.length > 0 && (
              <div>
                <h5 className="font-medium text-slate-900 dark:text-white mb-2">Top Products</h5>
                <div className="space-y-2">
                  {preview.topProducts.slice(0, 3).map((product: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{product.name}</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {product.quantity} sold • ${product.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.lowStockAlerts.length > 0 && (
              <div>
                <h5 className="font-medium text-amber-600 dark:text-amber-400 mb-2">⚠️ Low Stock Alerts</h5>
                <div className="space-y-1">
                  {preview.lowStockAlerts.slice(0, 3).map((alert: any, index: number) => (
                    <div key={index} className="text-sm text-amber-700 dark:text-amber-300">
                      {alert.name}: {alert.currentStock} remaining
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t">
              This preview shows today's data. The actual report will be sent at 11:00 PM daily.
            </div>
          </div>
        </div>
      )}

      {/* Schedule Info */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center">
          <Clock size={20} />
        </div>
        <div className="flex-1">
          <div className="font-medium text-slate-900 dark:text-white">Daily Schedule</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Reports are automatically sent at 11:00 PM every day to keep you informed overnight.
          </div>
        </div>
      </div>
    </div>
  )
}