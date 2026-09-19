/**
 * Arabic tab: how Arabic text reaches the paper.
 *
 * Most 58mm/80mm printers — the XP-58C included — have no Arabic font in ROM and
 * quietly ignore the code-page command, so the reliable path is to print the
 * receipt as graphics. The code-page path stays available for printers that do
 * have the font, with `auto` picking the page that loses the fewest letters.
 */

import { AlertTriangle, Languages, Printer, RefreshCw, Terminal } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import type { TaxReceiptSettings } from '../types'
import {
  Badge,
  ChoiceGroup,
  Field,
  HelpText,
  InfoHint,
  Notice,
  SectionCard,
  inputClass
} from './formControls'
import type { PrinterTools } from './usePrinterTools'

interface ArabicPanelProps {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
  tools: PrinterTools
}

export default function ArabicPanel({ settings, onChange, tools }: Readonly<ArabicPanelProps>) {
  const { t } = useLanguage()
  const patch = (next: Partial<TaxReceiptSettings>) => onChange({ ...settings, ...next })

  const mode = settings.receiptArabicMode || 'bitmap'
  const encoding = settings.receiptArabicEncoding || 'auto'

  return (
    <div className="space-y-4">
      <SectionCard
        icon={<Languages className="w-4 h-4" />}
        title={t('trArabicSection')}
        subtitle={t('trArabicTabDesc')}
        actions={
          <>
            <InfoHint label={t('trHintArabicTitle')} title={t('trHintArabicTitle')}>
              {t('trHintArabicBody')}
            </InfoHint>
            {mode === 'bitmap' ? <Badge tone="success">{t('trArabicSafe')}</Badge> : null}
          </>
        }
      >
        {settings.receiptLanguage !== 'ar' ? (
          <Notice tone="info">{t('trArabicNotSelected')}</Notice>
        ) : null}

        <ChoiceGroup
          label={t('trArabicMode')}
          value={mode}
          columns={2}
          onChange={(value) => patch({ receiptArabicMode: value })}
          options={[
            {
              value: 'bitmap',
              label: t('trArabicModeBitmap'),
              description: t('trArabicBitmapDesc')
            },
            {
              value: 'codepage',
              label: t('trArabicModeCodepage'),
              description: t('trArabicCodepageDesc')
            }
          ]}
        />
        <HelpText>{t('trArabicModeHelp')}</HelpText>

        {mode === 'codepage' ? (
          <div className="space-y-3">
            <Notice tone="warning" actions={<Badge tone="warning">{t('trArabicRisk')}</Badge>}>
              {t('trArabicCodepageWarning')}
            </Notice>
            <Field label={t('trArabicEncoding')} hint={t('trArabicEncodingHelp')}>
              <select
                value={encoding}
                onChange={(e) =>
                  patch({
                    receiptArabicEncoding: e.target
                      .value as TaxReceiptSettings['receiptArabicEncoding']
                  })
                }
                className={inputClass}
              >
                <option value="auto">{t('trArabicEncodingAuto')}</option>
                <option value="cp864">{t('trArabicEncodingCp864')}</option>
                <option value="win1256">{t('trArabicEncodingWpc1256')}</option>
              </select>
            </Field>
            {encoding === 'auto' ? (
              <Notice tone="info">{t('trArabicEncodingAutoHelp')}</Notice>
            ) : null}
          </div>
        ) : null}

        {mode === 'bitmap' ? <Notice tone="success">{t('trArabicBitmapNotice')}</Notice> : null}
      </SectionCard>

      <SectionCard
        icon={<Terminal className="w-4 h-4" />}
        title={t('trArabicDiagTitle')}
        subtitle={t('trArabicDiagDesc')}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => void tools.testPrint()}
            disabled={tools.busy}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {tools.testing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 text-emerald-400" />
            )}
            <span>{tools.testing ? t('trPrinting') : t('trArabicDiagBtn')}</span>
          </button>
          <Badge>{t('trArabicDiagBadge')}</Badge>
        </div>
        <HelpText>{t('trArabicDiagHelp')}</HelpText>
        <HelpText>{t('trArabicDiagHowToRead')}</HelpText>
      </SectionCard>

      <SectionCard
        icon={<Printer className="w-4 h-4" />}
        title={t('trArabicPaperTitle')}
        subtitle={t('trArabicPaperDesc')}
        actions={<Badge>{settings.paperWidth || '58mm'}</Badge>}
      >
        <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>{t('trArabicWidthNote')}</span>
        </div>
      </SectionCard>
    </div>
  )
}
