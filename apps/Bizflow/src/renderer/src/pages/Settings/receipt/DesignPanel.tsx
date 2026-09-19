/**
 * Design tab: the look of the printed receipt — style, separator, text size,
 * language, the extras that print under the totals, and the header/footer text.
 */

import {
  AlignLeft,
  Barcode,
  DollarSign,
  Languages,
  LayoutTemplate,
  QrCode,
  Type
} from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import type { TaxReceiptSettings } from '../types'
import {
  ChoiceGroup,
  Field,
  HelpText,
  InfoHint,
  RangeField,
  SectionCard,
  SwitchRow,
  inputClass
} from './formControls'

interface DesignPanelProps {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
}

export default function DesignPanel({ settings, onChange }: Readonly<DesignPanelProps>) {
  const { t } = useLanguage()
  const patch = (next: Partial<TaxReceiptSettings>) => onChange({ ...settings, ...next })

  return (
    <div className="space-y-4">
      <SectionCard
        icon={<LayoutTemplate className="w-4 h-4" />}
        title={t('trLayoutTitle')}
        subtitle={t('trLayoutDesc')}
        actions={
          <InfoHint label={t('trHintDesignTitle')} title={t('trHintDesignTitle')}>
            {t('trHintDesignBody')}
          </InfoHint>
        }
      >
        <ChoiceGroup
          label={t('trTemplateLabel')}
          value={settings.receiptTemplate || 'classic'}
          onChange={(value) => patch({ receiptTemplate: value })}
          options={[
            {
              value: 'classic',
              label: t('trTemplateClassic'),
              description: t('trTemplateClassicDesc')
            },
            {
              value: 'compact',
              label: t('trTemplateCompact'),
              description: t('trTemplateCompactDesc')
            },
            {
              value: 'modern',
              label: t('trTemplateModern'),
              description: t('trTemplateModernDesc')
            }
          ]}
        />

        <ChoiceGroup
          label={t('trDividerLabel')}
          value={settings.receiptDivider || 'dashed'}
          columns={2}
          onChange={(value) => patch({ receiptDivider: value })}
          options={[
            { value: 'dashed', label: t('trDividerDashed') },
            { value: 'solid', label: t('trDividerSolid') },
            { value: 'double', label: t('trDividerDouble') },
            { value: 'none', label: t('trDividerNone') }
          ]}
        />

        <RangeField
          label={t('trFontScaleLabel')}
          value={settings.receiptFontScale ?? 1}
          min={0.8}
          max={1.2}
          step={0.05}
          display={`${Math.round((settings.receiptFontScale ?? 1) * 100)}%`}
          onChange={(value) => patch({ receiptFontScale: Math.round(value * 100) / 100 })}
          hint={t('trFontScaleHelp')}
        />
      </SectionCard>

      <SectionCard icon={<Languages className="w-4 h-4" />} title={t('trReceiptLang')}>
        <ChoiceGroup
          value={settings.receiptLanguage || 'en'}
          columns={2}
          onChange={(value) => patch({ receiptLanguage: value })}
          options={[
            { value: 'ar', label: t('trValueArabic'), description: t('trLangArDesc') },
            { value: 'en', label: t('trValueEnglish'), description: t('trLangEnDesc') }
          ]}
        />
        <HelpText>{t('trLanguageHelp')}</HelpText>
      </SectionCard>

      <SectionCard
        icon={<QrCode className="w-4 h-4" />}
        title={t('trExtrasTitle')}
        subtitle={t('trExtrasDesc')}
      >
        <div className="space-y-2">
          <SwitchRow
            label={t('printQRCode')}
            description={t('trQrHelp')}
            icon={<QrCode className="w-3.5 h-3.5" />}
            checked={Boolean(settings.printQRCode)}
            onChange={(checked) => patch({ printQRCode: checked })}
          />
          <SwitchRow
            label={t('printReceiptBarcode')}
            description={t('trBarcodeHelp')}
            icon={<Barcode className="w-3.5 h-3.5" />}
            checked={Boolean(settings.printBarcode)}
            onChange={(checked) => patch({ printBarcode: checked })}
          />
          <SwitchRow
            label={t('trOpenCashDrawer')}
            description={t('trCashDrawerHelp')}
            icon={<DollarSign className="w-3.5 h-3.5" />}
            checked={Boolean(settings.openCashDrawer)}
            onChange={(checked) => patch({ openCashDrawer: checked })}
          />
        </div>
      </SectionCard>

      <SectionCard
        icon={<Type className="w-4 h-4" />}
        title={t('trTextTitle')}
        subtitle={t('trTextDesc')}
      >
        <Field label={t('receiptHeader')} hint={t('trHeaderHelp')}>
          <textarea
            rows={2}
            maxLength={200}
            value={settings.receiptHeader || ''}
            onChange={(e) => patch({ receiptHeader: e.target.value })}
            placeholder={t('trHeaderPlaceholder')}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <Field label={t('receiptFooter')} hint={t('trFooterHelp')}>
          <textarea
            rows={2}
            maxLength={200}
            value={settings.receiptFooter || ''}
            onChange={(e) => patch({ receiptFooter: e.target.value })}
            placeholder={t('trFooterPlaceholder')}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <AlignLeft className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{t('trTextAlignHelp')}</span>
        </div>
      </SectionCard>
    </div>
  )
}
