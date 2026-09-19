/**
 * Tax & policies tab: the numbers printed on the receipt and the limits the POS
 * applies when a cashier asks for a discount.
 */

import { Info, Percent, Printer, Tag } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import type { TaxReceiptSettings } from '../types'
import { Field, InfoHint, Notice, SectionCard, SwitchRow, inputClass } from './formControls'

interface TaxPanelProps {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
}

export default function TaxPanel({ settings, onChange }: Readonly<TaxPanelProps>) {
  const { t } = useLanguage()
  const patch = (next: Partial<TaxReceiptSettings>) => onChange({ ...settings, ...next })

  const taxRate = settings.taxRate ?? 0
  const refundDays = settings.refundPeriodDays ?? 14

  return (
    <div className="space-y-4">
      <SectionCard
        icon={<Percent className="w-4 h-4" />}
        title={t('trTaxSectionTitle')}
        actions={
          <InfoHint label={t('trHintTaxTitle')} title={t('trHintTaxTitle')}>
            {t('trHintTaxBody')}
          </InfoHint>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t('salesTaxRate')} required>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRate}
                onChange={(e) => patch({ taxRate: parseFloat(e.target.value) || 0 })}
                className={`${inputClass} w-24 font-semibold`}
              />
              <span className="text-xs font-bold text-slate-500">%</span>
            </div>
          </Field>
          <Field label={t('trTaxOn100')}>
            <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              <span>{t('trTaxExample')} </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {((100 * taxRate) / 100).toFixed(2)}
              </span>
            </div>
          </Field>
        </div>

        <SwitchRow
          label={t('trIncludeCOGS')}
          description={t('includeCOGSDescription')}
          checked={settings.includeCOGSInCalculations !== false}
          onChange={(checked) => patch({ includeCOGSInCalculations: checked })}
        />
      </SectionCard>

      <SectionCard
        icon={<Printer className="w-4 h-4" />}
        title={t('trAutoPrintTitle')}
        subtitle={t('autoPrintReceiptsDesc')}
      >
        <SwitchRow
          label={t('autoPrintReceipts')}
          description={t('trAutoPrintHelp')}
          checked={Boolean(settings.autoPrint)}
          onChange={(checked) => patch({ autoPrint: checked })}
        />
      </SectionCard>

      <SectionCard icon={<Tag className="w-4 h-4" />} title={t('trPoliciesTitle')}>
        <Field label={t('refundReturnPeriod')} hint={t('trRefundHelp', { days: refundDays })}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={365}
              value={refundDays}
              onChange={(e) =>
                patch({ refundPeriodDays: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
              className={`${inputClass} w-24 font-semibold`}
            />
            <span className="text-xs font-semibold text-slate-500">{t('trDays')}</span>
          </div>
        </Field>

        <SwitchRow
          label={t('allowDiscounts')}
          description={t('trAllowDiscountsDesc')}
          checked={Boolean(settings.allowDiscounts)}
          onChange={(checked) => patch({ allowDiscounts: checked })}
        />

        {settings.allowDiscounts ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('maximumDiscountPercent')}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.maxDiscountPercentage ?? 50}
                    onChange={(e) =>
                      patch({
                        maxDiscountPercentage: Math.max(
                          0,
                          Math.min(100, parseFloat(e.target.value) || 0)
                        )
                      })
                    }
                    className={`${inputClass} w-24`}
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </Field>
              <Field label={t('maximumDiscountAmount')}>
                <input
                  type="number"
                  min={0}
                  value={settings.maxDiscountAmount ?? 100}
                  onChange={(e) =>
                    patch({ maxDiscountAmount: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className={`${inputClass} w-32`}
                />
              </Field>
            </div>
            <Notice tone="info">
              <span className="font-bold">{t('discountReasonRequired')}: </span>
              <span>{t('discountReasonRequiredDesc')}</span>
            </Notice>
          </div>
        ) : null}

        <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{t('trPoliciesHelp')}</span>
        </div>
      </SectionCard>
    </div>
  )
}
