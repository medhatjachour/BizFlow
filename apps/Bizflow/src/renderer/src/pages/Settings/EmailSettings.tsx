/**
 * Email Settings Panel
 * Configure automated business email reports with full Arabic (RTL) & English (LTR) support
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Mail,
  Send,
  Eye,
  TestTube,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  TrendingUp,
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  Package
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import logger from '../../../../shared/utils/logger'

interface EmailSettingsData {
  userId?: string
  email: string
  frequency: 'daily' | 'weekly' | 'monthly'
  enabled: boolean
}

interface ReportPreviewData {
  totalSales: number
  totalRevenue: number
  totalProfit: number
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  lowStockAlerts: Array<{ name: string; currentStock: number }>
}

interface EmailSettingsProps {
  onSave?: () => void
}



export default function EmailSettings({ onSave }: Readonly<EmailSettingsProps>) {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'

  // Text dictionary helper for complete English/Arabic localization
  const i18n = {
    title: t('emailReports') || (isAr ? 'تقارير البريد الإلكتروني' : 'Email Reports'),
    subtitle: isAr
      ? 'احصل على تقارير أعمال تلقائية يتم تسليمها مباشرة إلى بريدك الإلكتروني.'
      : 'Get automated business performance reports delivered straight to your inbox.',
    enableTitle: isAr ? 'تفعيل التقارير الآلية' : 'Enable Automated Reports',
    enableDesc: isAr
      ? 'إرسال ملخصات المبيعات والأرباح والتنبيهات تلقائياً'
      : 'Automatically receive sales, revenue, and inventory alert summaries',
    configTitle: isAr ? 'إعدادات البريد والمواعيد' : 'Email & Delivery Configuration',
    emailLabel: isAr ? 'البريد الإلكتروني للمستلم' : 'Recipient Email Address',
    emailPlaceholder: isAr ? 'name@business.com' : 'name@business.com',
    freqLabel: isAr ? 'تكرار إرسال التقرير' : 'Report Frequency',
    freqDaily: isAr ? 'يومياً (موصى به)' : 'Daily (Recommended)',
    freqWeekly: isAr ? 'أسبوعياً' : 'Weekly',
    freqMonthly: isAr ? 'شهرياً' : 'Monthly',
    actionsTitle: isAr ? 'الإجراءات والاختبار' : 'Actions & Testing',
    btnTest: isAr ? 'إرسال بريد تجريبي' : 'Send Test Email',
    btnPreview: isAr ? 'معاينة التقرير' : 'Preview Report',
    btnSendNow: isAr ? 'إرسال التقرير الآن' : 'Send Report Now',
    btnSave: t('saveSettings') || (isAr ? 'حفظ الإعدادات' : 'Save Settings'),
    testing: isAr ? 'جاري الإرسال التجريبي…' : 'Sending test…',
    previewing: isAr ? 'جاري التحميل…' : 'Generating preview…',
    sendingNow: isAr ? 'جاري إرسال التقرير…' : 'Sending report…',
    saving: isAr ? 'جاري الحفظ…' : 'Saving…',
    scheduleTitle: isAr ? 'الجدول الزمني للتقارير' : 'Automated Schedule',
    scheduleDesc: isAr
      ? 'يتم إرسال التقرير اليومي تلقائياً في نهاية اليوم عند الساعة 11:00 مساءً لإبقائك على اطلاع دائم.'
      : 'Reports are automatically scheduled and dispatched at 11:00 PM to summarize the day’s activities.',
    previewTitle: isAr ? 'معاينة التقرير الفعلي' : 'Live Report Preview',
    previewNotice: isAr
      ? 'هذه المعاينة توضح بيانات اليوم الحالية. سيتم إرسال التقرير الفعلي في الموعد المجدول.'
      : 'This preview shows current live data for today. The scheduled report will be generated at delivery time.',
    statSales: isAr ? 'إجمالي المبيعات' : 'Total Sales',
    statRevenue: isAr ? 'إجمالي الإيرادات' : 'Total Revenue',
    statProfit: isAr ? 'صافي الأرباح' : 'Net Profit',
    topProductsTitle: isAr ? 'المنتجات الأكثر مبيعاً' : 'Top Selling Products',
    soldCount: isAr ? 'تم بيع' : 'sold',
    lowStockTitle: isAr ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts',
    remaining: isAr ? 'متبقي' : 'remaining',
    testSuccess: isAr ? 'تم إرسال البريد التجريبي بنجاح! تحقق من صندوق الوارد.' : 'Test email sent successfully! Check your inbox.',
    saveSuccess: isAr ? 'تم حفظ إعدادات البريد بنجاح!' : 'Email settings saved successfully!',
    sendSuccess: isAr ? 'تم إرسال التقرير بنجاح!' : 'Report sent successfully!',
    errorEmailRequired: isAr ? 'يرجى إدخال عنوان بريد إلكتروني صالح أولاً.' : 'Please enter a valid email address first.',
    errorGeneric: isAr ? 'حدث خطأ أثناء تنفيذ العملية.' : 'An error occurred while processing your request.'
  }

  // Component States
  const [settings, setSettings] = useState<EmailSettingsData>({
    userId: 'default-user',
    email: '',
    frequency: 'daily',
    enabled: false
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSendingNow, setIsSendingNow] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<ReportPreviewData | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Safe IPC invoker supporting window.api or window.electron
  const invokeIPC = async (channel: string, ...args: any[]) => {
    
    if (window.electron?.ipcRenderer?.invoke) {
      return await window.electron.ipcRenderer.invoke(channel, ...args)
    }
    throw new Error('Electron IPC bridge is unavailable')
  }

  // Load Settings
  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await invokeIPC('email:getConfig', 'default-user')
      if (result?.success && result.config) {
        setSettings({
          userId: result.config.userId || 'default-user',
          email: result.config.email || '',
          frequency: result.config.frequency || 'daily',
          enabled: Boolean(result.config.enabled)
        })
      }
    } catch (error) {
      logger.error('Failed to load email settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Auto-dismiss alert
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 5000)
    return () => clearTimeout(timer)
  }, [feedback])

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true)
    setFeedback(null)

    try {
      const result = await invokeIPC('email:configure', settings)
      if (result?.success) {
        setFeedback({ type: 'success', text: i18n.saveSuccess })
        onSave?.()
      } else {
        setFeedback({ type: 'error', text: result?.error || i18n.errorGeneric })
      }
    } catch (error: any) {
      logger.error('Failed to save email settings:', error)
      setFeedback({ type: 'error', text: error?.message || i18n.errorGeneric })
    } finally {
      setIsSaving(false)
    }
  }

  // Test Email
  const handleTestEmail = async () => {
    if (!settings.email.trim()) {
      setFeedback({ type: 'error', text: i18n.errorEmailRequired })
      return
    }

    setIsTesting(true)
    setFeedback(null)

    try {
      const result = await invokeIPC('email:testSend', settings.email.trim())
      if (result?.success) {
        setFeedback({ type: 'success', text: i18n.testSuccess })
      } else {
        setFeedback({ type: 'error', text: result?.error || i18n.errorGeneric })
      }
    } catch (error: any) {
      logger.error('Failed to send test email:', error)
      setFeedback({ type: 'error', text: error?.message || i18n.errorGeneric })
    } finally {
      setIsTesting(false)
    }
  }

  // Live Report Preview
  const handlePreview = async () => {
    setIsPreviewLoading(true)
    setFeedback(null)

    try {
      const result = await invokeIPC('email:generatePreview', 'default-user')
      if (result?.success && result.data) {
        setPreview(result.data)
      } else {
        setFeedback({ type: 'error', text: result?.error || i18n.errorGeneric })
      }
    } catch (error: any) {
      logger.error('Failed to generate preview:', error)
      setFeedback({ type: 'error', text: error?.message || i18n.errorGeneric })
    } finally {
      setIsPreviewLoading(false)
    }
  }

  // Send Report Now
  const handleSendNow = async () => {
    if (!settings.email.trim()) {
      setFeedback({ type: 'error', text: i18n.errorEmailRequired })
      return
    }

    setIsSendingNow(true)
    setFeedback(null)

    try {
      const result = await invokeIPC('email:sendReport', 'default-user')
      if (result?.success) {
        setFeedback({ type: 'success', text: i18n.sendSuccess })
      } else {
        setFeedback({ type: 'error', text: result?.error || i18n.errorGeneric })
      }
    } catch (error: any) {
      logger.error('Failed to send report:', error)
      setFeedback({ type: 'error', text: error?.message || i18n.errorGeneric })
    } finally {
      setIsSendingNow(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">{i18n.previewing}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-primary" />
          <span>{i18n.title}</span>
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {i18n.subtitle}
        </p>
      </div>

      {/* Alert / Feedback Notification */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-start gap-3 p-4 rounded-xl border transition-all animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium flex-1">{feedback.text}</span>
        </div>
      )}

      {/* Master Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-5 rounded-2xl border border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.05] transition-colors">
        <div className="flex items-center gap-4 min-w-0 me-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-white text-base">
              {i18n.enableTitle}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {i18n.enableDesc}
            </div>
          </div>
        </div>

        {/* RTL-Aware Master Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label={i18n.enableTitle}
          onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
            settings.enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              settings.enabled ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Email Configuration Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-5">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          {i18n.configTitle}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.emailLabel} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                dir="ltr"
                value={settings.email}
                onChange={(e) => setSettings((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={i18n.emailPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-start"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.freqLabel}
            </label>
            <div className="relative">
              <select
                value={settings.frequency}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="daily">{i18n.freqDaily}</option>
                <option value="weekly">{i18n.freqWeekly}</option>
                <option value="monthly">{i18n.freqMonthly}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-4">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {i18n.actionsTitle}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Test Email */}
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={isTesting || !settings.email.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <TestTube className="w-4 h-4 text-blue-500" />}
            <span>{isTesting ? i18n.testing : i18n.btnTest}</span>
          </button>

          {/* Preview Report */}
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-sm transition-all disabled:opacity-50"
          >
            {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Eye className="w-4 h-4 text-slate-500" />}
            <span>{isPreviewLoading ? i18n.previewing : i18n.btnPreview}</span>
          </button>

          {/* Send Now */}
          <button
            type="button"
            onClick={handleSendNow}
            disabled={isSendingNow || !settings.enabled || !settings.email.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{isSendingNow ? i18n.sendingNow : i18n.btnSendNow}</span>
          </button>

          {/* Save Settings */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? i18n.saving : i18n.btnSave}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      {preview && (
        <div className="p-6 rounded-2xl border border-primary/20 bg-white dark:bg-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <Eye className="w-5 h-5 text-primary" />
              <span>{i18n.previewTitle}</span>
            </h4>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              Live Data
            </span>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-start">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">{i18n.statSales}</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {preview.totalSales || 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-start">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">{i18n.statRevenue}</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                ${(preview.totalRevenue || 0).toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-start">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">{i18n.statProfit}</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${(preview.totalProfit || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Top Products */}
          {Array.isArray(preview.topProducts) && preview.topProducts.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                {i18n.topProductsTitle}
              </h5>
              <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
                {preview.topProducts.slice(0, 3).map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{product.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {product.quantity} {i18n.soldCount} • ${(product.revenue || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Stock Alerts */}
          {Array.isArray(preview.lowStockAlerts) && preview.lowStockAlerts.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {i18n.lowStockTitle}
              </h5>
              <div className="space-y-1.5">
                {preview.lowStockAlerts.slice(0, 3).map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300"
                  >
                    <span className="font-semibold">{alert.name}</span>
                    <span>{alert.currentStock} {i18n.remaining}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
            {i18n.previewNotice}
          </p>
        </div>
      )}

      {/* Schedule Info Card */}
      <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/70">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0 mt-0.5">
          <Clock className="w-5 h-5" />
        </div>
        <div className="text-xs leading-relaxed space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-white text-sm">
            {i18n.scheduleTitle}
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            {i18n.scheduleDesc}
          </p>
        </div>
      </div>
    </div>
  )
}