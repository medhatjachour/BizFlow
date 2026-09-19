/**
 * Store tab: the identity block that appears at the top of every receipt, plus
 * the logo the receipt carries.
 */

import { useRef, useState } from 'react'
import { Image as ImageIcon, Store, Trash2, Upload } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import { readLogoFile } from '../../../lib/thermalPrint'
import logger from '../../../../../shared/utils/logger'
import type { TaxReceiptSettings } from '../types'
import {
  Badge,
  Field,
  HelpText,
  InfoHint,
  Notice,
  RangeField,
  SectionCard,
  SwitchRow,
  dangerButtonClass,
  ghostButtonClass,
  inputClass,
  monoInputClass
} from './formControls'

interface StorePanelProps {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
}

/** A data URL bigger than this would blow past the localStorage quota. */
const MAX_LOGO_LENGTH = 1_500_000

export default function StorePanel({ settings, onChange }: Readonly<StorePanelProps>) {
  const { t } = useLanguage()
  const [logoError, setLogoError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const patch = (next: Partial<TaxReceiptSettings>) => onChange({ ...settings, ...next })

  const applyLogo = async (file: File | undefined) => {
    if (!file) return
    setLogoError(null)
    try {
      const { dataUrl } = await readLogoFile(file)
      if (dataUrl.length > MAX_LOGO_LENGTH) {
        setLogoError(t('trLogoTooLarge'))
        return
      }
      patch({ receiptLogo: dataUrl, printLogo: true, includeLogo: true })
      // Keep the legacy key in step so plugins pick the logo up immediately.
      localStorage.setItem('storeLogo', dataUrl)
    } catch (err: any) {
      logger.error('Logo upload error:', err)
      setLogoError(t('trLogoInvalid'))
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const removeLogo = () => {
    setLogoError(null)
    patch({ receiptLogo: '' })
    localStorage.removeItem('storeLogo')
  }

  const logoEnabled = Boolean(settings.printLogo ?? settings.includeLogo)

  return (
    <div className="space-y-4">
      <SectionCard
        icon={<Store className="w-4 h-4" />}
        title={t('storeInformationReceipt')}
        actions={
          <InfoHint label={t('trHintStoreTitle')} title={t('trHintStoreTitle')}>
            {t('trHintStoreBody')}
          </InfoHint>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('storeNameLabel')}>
            <input
              type="text"
              value={settings.storeName || ''}
              onChange={(e) => patch({ storeName: e.target.value })}
              placeholder={t('trStoreNamePlaceholder')}
              className={inputClass}
            />
          </Field>
          <Field label={t('storePhoneLabel')}>
            <input
              type="text"
              dir="ltr"
              value={settings.storePhone || ''}
              onChange={(e) => patch({ storePhone: e.target.value })}
              className={monoInputClass}
            />
          </Field>
          <Field label={t('storeEmailLabel')}>
            <input
              type="email"
              dir="ltr"
              value={settings.storeEmail || ''}
              onChange={(e) => patch({ storeEmail: e.target.value })}
              className={monoInputClass}
            />
          </Field>
          <Field label={t('storeAddressLabel')}>
            <input
              type="text"
              value={settings.storeAddress || ''}
              onChange={(e) => patch({ storeAddress: e.target.value })}
              placeholder={t('trStoreAddressPlaceholder')}
              className={inputClass}
            />
          </Field>
          <Field label={t('taxNumberLabel')}>
            <input
              type="text"
              dir="ltr"
              value={settings.taxNumber || ''}
              onChange={(e) => patch({ taxNumber: e.target.value })}
              className={monoInputClass}
            />
          </Field>
          <Field label={t('commercialRegisterNumber')}>
            <input
              type="text"
              dir="ltr"
              value={settings.commercialRegister || ''}
              onChange={(e) => patch({ commercialRegister: e.target.value })}
              className={monoInputClass}
            />
          </Field>
        </div>

        <SwitchRow
          label={t('trShowStoreDetails')}
          description={t('trShowStoreDetailsDesc')}
          checked={settings.receiptShowStoreDetails !== false}
          onChange={(checked) => patch({ receiptShowStoreDetails: checked })}
        />
      </SectionCard>

      <SectionCard
        icon={<ImageIcon className="w-4 h-4" />}
        title={t('trLogoTitle')}
        subtitle={t('trLogoDesc')}
        actions={logoEnabled ? <Badge tone="primary">{t('trLogoOn')}</Badge> : null}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void applyLogo(e.dataTransfer.files?.[0])
          }}
          className={`flex items-start gap-3 p-3 rounded-lg border border-dashed transition-colors ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-900/30'
          }`}
        >
          <div className="w-20 h-14 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
            {settings.receiptLogo ? (
              <img
                src={settings.receiptLogo}
                alt={t('trLogoTitle')}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void applyLogo(e.target.files?.[0])}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className={ghostButtonClass}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{settings.receiptLogo ? t('trLogoReplace') : t('trLogoUpload')}</span>
              </button>
              {settings.receiptLogo ? (
                <button type="button" onClick={removeLogo} className={dangerButtonClass}>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('trLogoRemove')}</span>
                </button>
              ) : null}
            </div>
            <HelpText className="mt-1.5">{t('trLogoDropHint')}</HelpText>
            {logoError ? (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5">{logoError}</p>
            ) : null}
          </div>
        </div>

        <SwitchRow
          label={t('printStoreLogo')}
          description={t('trLogoPrintDesc')}
          icon={<ImageIcon className="w-3.5 h-3.5" />}
          checked={logoEnabled}
          onChange={(checked) => patch({ printLogo: checked, includeLogo: checked })}
        />

        {logoEnabled ? (
          <div className="space-y-3 pt-1">
            <RangeField
              label={t('trLogoSize')}
              value={settings.receiptLogoSize ?? 70}
              min={20}
              max={100}
              display={`${settings.receiptLogoSize ?? 70}%`}
              onChange={(value) => patch({ receiptLogoSize: Math.round(value) })}
              hint={t('trLogoSizeHelp')}
            />
            <SwitchRow
              label={t('trLogoMono')}
              description={t('trLogoMonoDesc')}
              checked={Boolean(settings.receiptLogoMono)}
              onChange={(checked) => patch({ receiptLogoMono: checked })}
            />
          </div>
        ) : null}

        {!settings.receiptLogo ? <Notice tone="info">{t('trLogoNoImage')}</Notice> : null}
      </SectionCard>
    </div>
  )
}
