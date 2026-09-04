/**
 * Tax & Receipt Settings Panel
 * Comprehensive POS hardware, receipt template, tax, and discount configuration
 */

import { useState } from 'react'
import {
  Store,
  Printer,
  FileText,
  Percent,
  Tag,
  QrCode,
  Barcode,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { TaxReceiptSettings } from './types'
import logger from '../../../../shared/utils/logger'

interface TaxReceiptSettingsProps {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
}


export default function TaxReceiptSettings({
  settings,
  onChange
}: Readonly<TaxReceiptSettingsProps>) {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'

  // Local Action States
  const [detectingPrinters, setDetectingPrinters] = useState(false)
  const [testingPrint, setTestingPrint] = useState(false)
  const [printerFeedback, setPrinterFeedback] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  const handleChange = (
    field: keyof TaxReceiptSettings,
    value: string | number | boolean | null | undefined
  ) => {
    onChange({ ...settings, [field]: value })
  }

  // Bilingual UI dictionary
  const i18n = {
    title: t('taxReceiptSettings') || (isAr ? 'إعدادات الضرائب والإيصالات' : 'Tax & Receipt Settings'),
    subtitle: t('configureTaxReceipt') || (isAr ? 'تخصيص بيانات المتجر، الطابعات الحرارية، الضرائب والخصومات' : 'Configure store details, POS thermal printers, sales tax, and discount rules'),
    
    // Store Section
    storeSectionTitle: t('storeInformationReceipt') || (isAr ? 'بيانات المتجر على الإيصال' : 'Store Receipt Identity'),
    storeSectionDesc: t('receiptInformation') || (isAr ? 'تظهر هذه المعلومات في رأس الإيصالات المطبوعة والفواتير الضريبية.' : 'This information appears at the header of all printed receipts and tax invoices.'),
    storeName: t('storeNameLabel') || (isAr ? 'اسم المتجر' : 'Store Name'),
    storePhone: t('storePhoneLabel') || (isAr ? 'رقم الهاتف' : 'Phone Number'),
    storeEmail: t('storeEmailLabel') || (isAr ? 'البريد الإلكتروني' : 'Email Address'),
    taxNumber: t('taxNumberLabel') || (isAr ? 'الرقم الضريبي' : 'Tax / VAT Number'),
    storeAddress: t('storeAddressLabel') || (isAr ? 'عنوان المتجر' : 'Store Address'),
    commRegister: t('commercialRegisterNumber') || (isAr ? 'السجل التجاري' : 'Commercial Register No.'),

    // Printer Section
    printerSectionTitle: t('thermalPrinterSettings') || (isAr ? 'إعدادات الطابعة الحرارية' : 'Thermal & POS Printer'),
    printerSectionDesc: t('configureThermalPrinter') || (isAr ? 'إعداد طابعة الإيصالات USB أو الشبكية واختبار الاتصال.' : 'Setup USB or Network thermal receipt printers with test utilities.'),
    printerType: t('printerType') || (isAr ? 'نوع الطابعة' : 'Printer Type'),
    printerNone: t('noPrinter') || (isAr ? 'بدون طابعة حرارية' : 'No Hardware Printer (Disabled)'),
    printerUSB: t('usbThermalPrinter') || (isAr ? 'طابعة حرارية USB' : 'Direct USB Thermal Printer (ESC/POS)'),
    printerNetwork: t('networkThermalPrinter') || (isAr ? 'طابعة شبكية Ethernet / Wi-Fi' : 'Network Thermal Printer (IP)'),
    printerSystem: t('systemPrinter') || (isAr ? 'طابعة النظام الافتراضية (HTML)' : 'System Default Print Dialog (HTML)'),
    usbHelp: t('usbPrinterHelp') || (isAr ? 'يدعم طابعات ESC/POS المتوافقة مثل Epson وXprinter.' : 'Supports standard ESC/POS USB printers (e.g. Epson, Xprinter).'),
    usbPrinterName: t('usbPrinterName') || (isAr ? 'مسار / اسم طابعة USB' : 'USB Printer Port / Name'),
    autoDetect: t('autoDetect') || (isAr ? 'كشف تلقائي' : 'Auto Detect'),
    autoDetectHelp: t('autoDetectHelp') || (isAr ? 'البحث التلقائي عن طابعات USB الموصولة بالجهاز.' : 'Scan for connected USB thermal receipt printers.'),
    ipAddress: t('printerIPAddress') || (isAr ? 'عنوان IP للطابعة' : 'Printer IP Address'),
    printerOptionalName: t('printerNameOptional') || (isAr ? 'اسم وصفي للطابعة (اختياري)' : 'Printer Friendly Name (Optional)'),
    paperWidth: t('paperWidth') || (isAr ? 'عرض ورق الطباعة' : 'Receipt Paper Width'),
    paperSmall: t('paperSmall') || '58mm (Small)',
    paperStandard: t('paperStandard') || '80mm (Standard)',
    bottomSpacing: t('receiptBottomSpacing') || (isAr ? 'أسطر التغذية السفلية بعد الطباعة' : 'Bottom Feed Lines (Cut Spacing)'),
    testPrintBtn: isAr ? 'طباعة إيصال تجريبي' : 'Print Test Receipt',

    // Language & Layout Section
    layoutTitle: isAr ? 'تخصيص لغة وتصميم الإيصال' : 'Receipt Content & Layout',
    layoutDesc: isAr ? 'التحكم في الشعار، الباركود، رمز QR واللغة المستخدمة في الطباعة.' : 'Control barcodes, QR codes, logos, and printed language templates.',
    receiptLang: isAr ? 'لغة الإيصال المطبوع' : 'Receipt Language',
    printLogo: t('printStoreLogo') || (isAr ? 'طباعة شعار المتجر' : 'Print Store Logo'),
    printQR: t('printQRCode') || (isAr ? 'طباعة رمز QR الضريبي' : 'Print Tax QR Code'),
    printBarcode: t('printReceiptBarcode') || (isAr ? 'طباعة باركود الفاتورة' : 'Print Invoice Barcode'),
    openCashDrawer: isAr ? 'فتح درج النقدية تلقائياً بعد الطباعة' : 'Kick Cash Drawer Open After Print',
    autoPrintReceipts: t('autoPrintReceipts') || (isAr ? 'طباعة الإيصال تلقائياً فور إتمام البيع' : 'Auto-Print Receipt Upon Checkout'),
    autoPrintDesc: t('autoPrintReceiptsDesc') || (isAr ? 'تخطي نافذة المعاينة والطباعة مباشرة' : 'Skip print preview and dispatch directly to printer'),
    headerText: t('receiptHeader') || (isAr ? 'النص الترحيبي أعلى الإيصال' : 'Receipt Header Note'),
    footerText: t('receiptFooter') || (isAr ? 'النص الختامي أسفل الإيصال' : 'Receipt Footer Note'),

    // Tax & COGS Section
    taxSectionTitle: isAr ? 'الضرائب وتكاليف البضاعة (COGS)' : 'Sales Tax & COGS Accounting',
    taxRate: t('salesTaxRate') || (isAr ? 'نسبة ضريبة المبيعات / القيمة المضافة' : 'Sales Tax / VAT Rate'),
    taxExample: isAr ? 'مثال: على بيع بقيمة 100 ستكون الضريبة' : 'Example: On a sale of 100.00, tax applied will be',
    cogsDesc: t('includeCOGSDescription') || (isAr ? 'عند التفعيل، يتم خصم تكلفة شراء المنتجات تلقائياً لحساب صافي الأرباح.' : 'Deducts purchase costs from total revenue when calculating net profit metrics.'),

    // Policies & Discounts
    policiesTitle: isAr ? 'سياسات الإرجاع والخصومات' : 'Return Policy & POS Discounts',
    refundDays: t('refundReturnPeriod') || (isAr ? 'مهلة قبول المرتجعات (بالأيام)' : 'Allowed Return Period (Days)'),
    refundNotice: isAr ? 'يُسمح باسترجاع أو استبدال المنتجات خلال' : 'Customer returns accepted within',
    refundNoticeSuffix: isAr ? 'يوماً من تاريخ الشراء. (0 لتعطيل الإرجاع)' : 'days from purchase date. (0 to disable returns)',
    allowDiscounts: t('allowDiscounts') || (isAr ? 'السماح بمنح خصومات عند نقاط البيع (POS)' : 'Enable Manual POS Cashier Discounts'),
    maxPercent: t('maximumDiscountPercent') || (isAr ? 'الحد الأقصى للخصم كنسبة مئوية' : 'Max Allowed Discount Percentage'),
    maxAmount: t('maximumDiscountAmount') || (isAr ? 'الحد الأقصى للخصم كمبلغ ثابت' : 'Max Allowed Discount Fixed Amount'),
    discountReasonRequired: t('discountReasonRequired') || (isAr ? 'سبب الخصم إلزامي دائماً' : 'Discount Reason Mandatory'),
    discountReasonDesc: t('discountReasonRequiredDesc') || (isAr ? 'يلتزم الكاشير بتحديد سبب عند تطبيق أي خصم للمساءلة والمراجعة.' : 'Cashiers must provide an audit reason when applying manual discounts.')
  }

  // Handle Auto Detect USB Printers
  const handleAutoDetect = async () => {
    setDetectingPrinters(true)
    setPrinterFeedback(null)
    try {
      if (!window.api?.thermalReceipts?.detectPrinters) {
        throw new Error('Thermal printer API is unavailable')
      }
      const result = await window.api.thermalReceipts.detectPrinters()
      if (result.success && result.printers.length > 0) {
        handleChange('printerName', result.printers[0].path)
        setPrinterFeedback({
          type: 'success',
          message: isAr
            ? `تم العثور على الطابعة: ${result.printers.map((p) => p.name).join(', ')}`
            : `Detected: ${result.printers.map((p) => p.name).join(', ')}`
        })
      } else {
        setPrinterFeedback({
          type: 'info',
          message: isAr ? 'لم يتم العثور على طابعات USB موصولة.' : 'No USB thermal printers detected.'
        })
      }
    } catch (err: any) {
      logger.error('Detection error:', err)
      setPrinterFeedback({
        type: 'error',
        message: err?.message || (isAr ? 'فشل كشف الطابعات' : 'Failed to scan printers')
      })
    } finally {
      setDetectingPrinters(false)
    }
  }

  // Handle Test Print
  const handleTestPrint = async () => {
    setTestingPrint(true)
    setPrinterFeedback(null)
    try {
      if (!window.api?.thermalReceipts?.testPrint) {
        throw new Error('Thermal test print API is unavailable')
      }
      const result = await window.api.thermalReceipts.testPrint(settings)
      if (result.success) {
        setPrinterFeedback({
          type: 'success',
          message: isAr ? 'تمت طباعة الإيصال التجريبي بنجاح!' : 'Test receipt printed successfully!'
        })
      } else {
        setPrinterFeedback({
          type: 'error',
          message: result.message || (isAr ? 'فشلت الطباعة التجريبية' : 'Test print failed')
        })
      }
    } catch (err: any) {
      setPrinterFeedback({
        type: 'error',
        message: err?.message || (isAr ? 'خطأ أثناء الطباعة التجريبية' : 'Test print error')
      })
    } finally {
      setTestingPrint(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-primary" />
          <span>{i18n.title}</span>
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {i18n.subtitle}
        </p>
      </div>

      {/* 1. Store Identity Section */}
      <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-base">
              {i18n.storeSectionTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {i18n.storeSectionDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.storeName} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={settings.storeName || ''}
              onChange={(e) => handleChange('storeName', e.target.value)}
              placeholder={isAr ? 'مثال: متجر الزهور' : 'e.g., BizFlow Store'}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.storePhone} <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              dir="ltr"
              value={settings.storePhone || ''}
              onChange={(e) => handleChange('storePhone', e.target.value)}
              placeholder="+20 100 123 4567"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-start"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.taxNumber} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={settings.taxNumber || ''}
              onChange={(e) => handleChange('taxNumber', e.target.value)}
              placeholder="300-123-456-00003"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-start"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.commRegister}
            </label>
            <input
              type="text"
              dir="ltr"
              value={settings.commercialRegister || ''}
              onChange={(e) => handleChange('commercialRegister', e.target.value)}
              placeholder="123456"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-start"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.storeAddress} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={settings.storeAddress || ''}
              onChange={(e) => handleChange('storeAddress', e.target.value)}
              placeholder={isAr ? 'شارع النصر، القاهرة، مصر' : '123 Main Street, Suite 100'}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
            />
          </div>
        </div>
      </section>

      {/* 2. Printer Hardware Section */}
      <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-base">
              {i18n.printerSectionTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {i18n.printerSectionDesc}
            </p>
          </div>
        </div>

        {/* Feedback Alert for Hardware */}
        {printerFeedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-in fade-in ${
              printerFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                : printerFeedback.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-800 dark:text-blue-300'
            }`}
          >
            {printerFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {printerFeedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {printerFeedback.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{printerFeedback.message}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.printerType}
            </label>
            <select
              value={settings.printerType || 'none'}
              onChange={(e) => handleChange('printerType', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="none">{i18n.printerNone}</option>
              <option value="usb">{i18n.printerUSB}</option>
              <option value="network">{i18n.printerNetwork}</option>
              <option value="html">{i18n.printerSystem}</option>
            </select>
          </div>

          {/* USB Configuration */}
          {settings.printerType === 'usb' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80 space-y-3 animate-in fade-in">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {i18n.usbPrinterName}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={settings.printerName || ''}
                  onChange={(e) => handleChange('printerName', e.target.value)}
                  placeholder="e.g., POS-80 / COM3 / /dev/usb/lp0"
                  className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-start"
                />
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  disabled={detectingPrinters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${detectingPrinters ? 'animate-spin' : ''}`} />
                  <span>{i18n.autoDetect}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400">{i18n.autoDetectHelp}</p>
            </div>
          )}

          {/* Network IP Configuration */}
          {settings.printerType === 'network' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {i18n.ipAddress} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={settings.printerIP || ''}
                  onChange={(e) => handleChange('printerIP', e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-start"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {i18n.printerOptionalName}
                </label>
                <input
                  type="text"
                  value={settings.printerName || ''}
                  onChange={(e) => handleChange('printerName', e.target.value)}
                  placeholder="e.g., Kitchen Thermal"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Paper Width & Feed Spacing */}
          {settings.printerType !== 'none' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {i18n.paperWidth}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="paperWidth"
                      value="58mm"
                      checked={settings.paperWidth === '58mm'}
                      onChange={(e) => handleChange('paperWidth', e.target.value)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span>{i18n.paperSmall}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="paperWidth"
                      value="80mm"
                      checked={(settings.paperWidth || '80mm') === '80mm'}
                      onChange={(e) => handleChange('paperWidth', e.target.value)}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span>{i18n.paperStandard}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {i18n.bottomSpacing}
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={settings.receiptBottomSpacing ?? 4}
                  onChange={(e) =>
                    handleChange('receiptBottomSpacing', parseInt(e.target.value, 10) || 0)
                  }
                  className="w-28 px-3.5 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Test Print Action Button */}
          {settings.printerType !== 'none' && settings.printerType !== 'html' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={testingPrint}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {testingPrint ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Printer className="w-4 h-4 text-emerald-400" />
                )}
                <span>{testingPrint ? (isAr ? 'جاري الاختبار…' : 'Printing…') : i18n.testPrintBtn}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Receipt Template & Branding */}
      <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-base">
              {i18n.layoutTitle}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {i18n.layoutDesc}
            </p>
          </div>
        </div>

        {/* Receipt Language Switch */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {i18n.receiptLang}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="receiptLanguage"
                value="ar"
                checked={settings.receiptLanguage === 'ar'}
                onChange={(e) => handleChange('receiptLanguage', e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span>العربية (Arabic)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="receiptLanguage"
                value="en"
                checked={(settings.receiptLanguage || 'en') === 'en'}
                onChange={(e) => handleChange('receiptLanguage', e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span>English (الإنجليزية)</span>
            </label>
          </div>
        </div>

        {/* Branding & Barcode Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={Boolean(settings.printLogo ?? settings.includeLogo)}
              onChange={(e) => {
                handleChange('printLogo', e.target.checked)
                handleChange('includeLogo', e.target.checked)
              }}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <ImageIcon className="w-4 h-4 text-blue-500" />
            <span>{i18n.printLogo}</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={Boolean(settings.printQRCode)}
              onChange={(e) => handleChange('printQRCode', e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <QrCode className="w-4 h-4 text-indigo-500" />
            <span>{i18n.printQR}</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={Boolean(settings.printBarcode)}
              onChange={(e) => handleChange('printBarcode', e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <Barcode className="w-4 h-4 text-amber-500" />
            <span>{i18n.printBarcode}</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={Boolean(settings.openCashDrawer)}
              onChange={(e) => handleChange('openCashDrawer', e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>{i18n.openCashDrawer}</span>
          </label>
        </div>

        {/* Auto Print Master Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
              {i18n.autoPrintReceipts}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {i18n.autoPrintDesc}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(settings.autoPrint)}
            onClick={() => handleChange('autoPrint', !settings.autoPrint)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.autoPrint ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                settings.autoPrint ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Header & Footer Custom Texts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.headerText}
            </label>
            <textarea
              rows={2}
              maxLength={200}
              value={settings.receiptHeader || ''}
              onChange={(e) => handleChange('receiptHeader', e.target.value)}
              placeholder={isAr ? 'أهلاً بكم في متجرنا' : 'Welcome to our store!'}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {i18n.footerText}
            </label>
            <textarea
              rows={2}
              maxLength={200}
              value={settings.receiptFooter || ''}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder={isAr ? 'شكراً لزيارتكم! البضاعة المباعة ترد خلال 14 يوماً' : 'Thank you for your business! Please visit us again.'}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
            />
          </div>
        </div>
      </section>

      {/* 4. Sales Tax & Accounting (COGS) */}
      <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-base">
              {i18n.taxSectionTitle}
            </h4>
          </div>
        </div>

        {/* Tax Rate Field */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {i18n.taxRate} <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={settings.taxRate ?? 0}
              onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
              className="w-32 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">%</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-400">
            <span>{i18n.taxExample} </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {((100 * (settings.taxRate || 0)) / 100).toFixed(2)}
            </span>
          </div>
        </div>

     
      </section>

      {/* 5. Policies & POS Discounts */}
      <section className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-base">
              {i18n.policiesTitle}
            </h4>
          </div>
        </div>

        {/* Refund Window */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {i18n.refundDays}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="365"
              value={settings.refundPeriodDays ?? 14}
              onChange={(e) =>
                handleChange('refundPeriodDays', Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              className="w-32 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            />
            <span className="text-xs text-slate-500">{isAr ? 'يوماً' : 'Days'}</span>
          </div>

          <p className="text-xs text-slate-500">
            {i18n.refundNotice} <strong>{settings.refundPeriodDays ?? 14}</strong> {i18n.refundNoticeSuffix}
          </p>
        </div>

        {/* Discount Permission Toggle */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                {i18n.allowDiscounts}
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings.allowDiscounts)}
              onClick={() => handleChange('allowDiscounts', !settings.allowDiscounts)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.allowDiscounts ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.allowDiscounts ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.allowDiscounts && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {i18n.maxPercent}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.maxDiscountPercentage ?? 50}
                    onChange={(e) =>
                      handleChange(
                        'maxDiscountPercentage',
                        Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                      )
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {i18n.maxAmount}
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.maxDiscountAmount ?? 100}
                  onChange={(e) =>
                    handleChange('maxDiscountAmount', Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Mandatory Discount Reason Info Notice */}
              <div className="sm:col-span-2 p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{i18n.discountReasonRequired}: </span>
                  <span>{i18n.discountReasonDesc}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}