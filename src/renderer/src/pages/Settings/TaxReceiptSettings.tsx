/**
 * Tax & Receipt Settings Panel
 */

import { useLanguage } from '../../contexts/LanguageContext'
import type { TaxReceiptSettings } from './types'

type Props = {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
}

export default function TaxReceiptSettings({ settings, onChange }: Props) {
  const { t } = useLanguage()
  const handleChange = (field: keyof TaxReceiptSettings, value: string | number | boolean) => {
    onChange({ ...settings, [field]: value })
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('taxReceiptSettings')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t('configureTaxReceipt')}
        </p>
      </div>

      {/* Store Information for Receipt */}
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('storeInformationReceipt')}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
          {t('receiptInformation')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('storeNameLabel')} *
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
              value={settings.storeName || ''}
              onChange={(e) => handleChange('storeName', e.target.value)}
              placeholder="e.g., محل الزهور"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('storePhoneLabel')} *
            </label>
            <input
              type="tel"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
              value={settings.storePhone || ''}
              onChange={(e) => handleChange('storePhone', e.target.value)}
              placeholder="e.g., 0123456789"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('storeEmailLabel')}
            </label>
            <input
              type="email"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
              value={settings.storeEmail || ''}
              onChange={(e) => handleChange('storeEmail', e.target.value)}
              placeholder="e.g., info@store.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('taxNumberLabel')} *
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
              value={settings.taxNumber || ''}
              onChange={(e) => handleChange('taxNumber', e.target.value)}
              placeholder="e.g., 123-456-789"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('storeAddressLabel')} *
          </label>
          <textarea
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary resize-none"
            rows={2}
            value={settings.storeAddress || ''}
            onChange={(e) => handleChange('storeAddress', e.target.value)}
            placeholder="e.g., 15 شارع النيل، القاهرة، مصر"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('commercialRegisterNumber')}
          </label>
          <input
            type="text"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
            value={settings.commercialRegister || ''}
            onChange={(e) => handleChange('commercialRegister', e.target.value)}
            placeholder="e.g., 12345"
          />
        </div>
      </div>

      {/* Printer Settings */}
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('thermalPrinterSettings')}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
          {t('configureThermalPrinter')}
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('printerType')} *
          </label>
          <select
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
            value={settings.printerType || 'none'}
            onChange={(e) => handleChange('printerType', e.target.value)}
          >
            <option value="none">{t('noPrinter')}</option>
            <option value="usb">{t('usbThermalPrinter')}</option>
            <option value="network">{t('networkThermalPrinter')}</option>
            <option value="html">{t('systemPrinter')}</option>
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('usbPrinterHelp')}
          </p>
        </div>

        {settings.printerType === 'usb' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('usbPrinterName')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                value={settings.printerName || ''}
                onChange={(e) => handleChange('printerName', e.target.value)}
                placeholder="e.g., /dev/usb/lp0"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await window.api.thermalReceipts.detectPrinters()
                    if (result.success && result.printers.length > 0) {
                      // Use first detected printer
                      handleChange('printerName', result.printers[0].path)
                      alert(`Found: ${result.printers.map((p: any) => p.name).join(', ')}`)
                    } else {
                      alert('No USB printers detected')
                    }
                  } catch (error) {
                    console.error('Detection error:', error)
                    alert('Failed to detect printers')
                  }
                }}
                className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium whitespace-nowrap"
              >
                {t('autoDetect')}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('autoDetectHelp')}
            </p>
          </div>
        )}

        {settings.printerType === 'network' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('printerIPAddress')} *
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                value={settings.printerIP || ''}
                onChange={(e) => handleChange('printerIP', e.target.value)}
                placeholder="e.g., 192.168.1.100"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('printerIPHelp')}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('printerNameOptional')}
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                value={settings.printerName || ''}
                onChange={(e) => handleChange('printerName', e.target.value)}
                placeholder="e.g., Kitchen Printer"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('paperWidth')}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paperWidth"
                value="58mm"
                checked={settings.paperWidth === '58mm'}
                onChange={(e) => handleChange('paperWidth', e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('paperSmall')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paperWidth"
                value="80mm"
                checked={settings.paperWidth === '80mm'}
                onChange={(e) => handleChange('paperWidth', e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('paperStandard')}</span>
            </label>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('paperWidthHelp')}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('receiptBottomSpacing')}
          </label>
          <input
            type="number"
            min="0"
            max="20"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
            value={settings.receiptBottomSpacing ?? 4}
            onChange={(e) => handleChange('receiptBottomSpacing', parseInt(e.target.value) || 0)}
            placeholder="4"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('receiptBottomSpacingHelp')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.printLogo || false}
              onChange={(e) => handleChange('printLogo', e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('printStoreLogo')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.printQRCode || false}
              onChange={(e) => handleChange('printQRCode', e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('printQRCode')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.printBarcode || false}
              onChange={(e) => handleChange('printBarcode', e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('printReceiptBarcode')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              checked={settings.openCashDrawer || false}
              onChange={(e) => handleChange('openCashDrawer', e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Open Cash Drawer After Print</span>
          </label>
        </div>

        {/* Test Print Button */}
        {settings.printerType !== 'none' && settings.printerType !== 'html' && (
          <button
            type="button"
            onClick={async () => {
              try {
                const result = await window.api.thermalReceipts.testPrint(settings)
                if (result.success) {
                  alert('Test print successful!')
                } else {
                  alert('Test print failed: ' + result.message)
                }
              } catch (error: any) {
                alert('Test print error: ' + error.message)
              }
            }}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            🖨️ Test Printer Connection
          </button>
        )}
      </div>

      {/* COGS Calculation Setting */}
      <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('includeCOGSInCalculations') || 'Include Cost of Goods Sold (COGS) in Calculations'}
            </label>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t('includeCOGSDescription') || 'When enabled, COGS will be included in profit calculations, expense reports, and financial charts. Disable if you track COGS separately or use a different accounting method.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange('includeCOGSInCalculations', !settings.includeCOGSInCalculations)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              settings.includeCOGSInCalculations ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.includeCOGSInCalculations ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tax Rate */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('salesTaxRate')} *
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            className="w-32 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
            value={settings.taxRate}
            onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
            placeholder="10"
            min="0"
            max="100"
            step="1"
          />
          <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
        </div>
        <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold">{t('example')}:</span> ${settings.taxRate.toFixed(2)} {t('taxOnSale')} $100.00 {t('taxSaleExample')}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {t('taxRateApplied')}
        </p>
      </div>

      {/* Refund Period */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('refundReturnPeriod')} *
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            className="w-32 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
            value={settings.refundPeriodDays}
            onChange={(e) => handleChange('refundPeriodDays', Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="30"
            min="0"
            max="365"
          />
          <span className="text-slate-600 dark:text-slate-400 font-medium">{t('days')}</span>
        </div>
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold">{t('notice')}:</span> {t('refundsAllowedWithin')} {settings.refundPeriodDays} {t('daysAfterPurchase')}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {t('setToZeroDisable')}
        </p>
      </div>

      {/* Receipt Header */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('receiptHeader')}
        </label>
        <textarea
          className="input-field resize-none"
          rows={3}
          value={settings.receiptHeader}
          onChange={(e) => handleChange('receiptHeader', e.target.value)}
          placeholder={t('receiptHeaderPlaceholder')}
          maxLength={200}
        />
        <p className="text-xs text-slate-500">
          {t('receiptHeaderDesc')}
        </p>
      </div>

      {/* Receipt Footer */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('receiptFooter')}
        </label>
        <textarea
          className="input-field resize-none"
          rows={3}
          value={settings.receiptFooter}
          onChange={(e) => handleChange('receiptFooter', e.target.value)}
          placeholder={t('receiptFooterPlaceholder')}
          maxLength={200}
        />
        <p className="text-xs text-slate-500">
          {t('receiptFooterDesc')}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('receiptOptions')}
        </h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
            checked={settings.autoPrint}
            onChange={(e) => handleChange('autoPrint', e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {t('autoPrintReceipts')}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {t('autoPrintReceiptsDesc')}
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
            checked={settings.includeLogo}
            onChange={(e) => handleChange('includeLogo', e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {t('includeStoreLogo')}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {t('includeStoreLogoDesc')}
            </div>
          </div>
        </label>
      </div>

      {/* Discount Settings */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
            {t('discountSettings')}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('configureDiscountPermissions')}
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
            checked={settings.allowDiscounts}
            onChange={(e) => handleChange('allowDiscounts', e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {t('allowDiscounts')}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {t('allowDiscountsDesc')}
            </div>
          </div>
        </label>

        {settings.allowDiscounts && (
          <>
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('maximumDiscountPercent')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  className="w-32 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  value={settings.maxDiscountPercentage}
                  onChange={(e) => 
                    handleChange('maxDiscountPercentage', Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                  }
                  placeholder="50"
                  min="0"
                  max="100"
                  step="1"
                />
                <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('maxDiscountPercentDesc')}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('maximumDiscountAmount')}
              </label>
              <div className="flex items-center gap-3">
                <span className="text-slate-600 dark:text-slate-400 font-medium">$</span>
                <input
                  type="number"
                  className="w-32 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                  value={settings.maxDiscountAmount}
                  onChange={(e) => 
                    handleChange('maxDiscountAmount', Math.max(0, parseFloat(e.target.value) || 0))
                  }
                  placeholder="100"
                  min="0"
                  step="1"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('maxDiscountAmountDesc')}
              </p>
            </div>

            {/* Require Discount Reason - Always Required */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t('discountReasonRequired')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    {t('discountReasonRequiredDesc')}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
