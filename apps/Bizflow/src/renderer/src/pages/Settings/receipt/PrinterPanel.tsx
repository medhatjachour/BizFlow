/**
 * Printer tab: find the receipt printer on this machine, pick it, and fix it
 * when Windows has the queue pointing at an empty USB port.
 */

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  PlugZap,
  Printer,
  RefreshCw,
  Terminal,
  Wrench
} from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import { printerWarning, type DetectedPrinter } from '../../../lib/thermalPrint'
import type { TaxReceiptSettings } from '../types'
import { detectPlatform, platformLabel } from './platform'
import type { PrinterTools } from './usePrinterTools'
import {
  Badge,
  ChoiceGroup,
  Field,
  HelpText,
  InfoHint,
  Notice,
  SectionCard,
  Spinner,
  ghostButtonClass,
  inputClass,
  monoInputClass,
  primaryButtonClass,
  warningButtonClass
} from './formControls'

interface PrinterPanelProps {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
  tools: PrinterTools
}

const PORT_KIND_KEYS: Record<string, string> = {
  usb: 'trPortKindUsb',
  network: 'trPortKindNetwork',
  virtual: 'trPortKindVirtual',
  parallel: 'trPortKindParallel',
  wsd: 'trPortKindNetwork',
  share: 'trPortKindShare',
  other: 'trPortKindOther'
}

export default function PrinterPanel({ settings, onChange, tools }: Readonly<PrinterPanelProps>) {
  const { t } = useLanguage()
  const patch = (next: Partial<TaxReceiptSettings>) => onChange({ ...settings, ...next })

  // Opening the tab scans for printers once, so the list is already there
  // instead of waiting for the user to press a button.
  const scannedOnce = useRef(false)
  const [hasScanned, setHasScanned] = useState(false)
  useEffect(() => {
    if (scannedOnce.current) return
    scannedOnce.current = true
    void tools.scan({ silent: true }).then(() => setHasScanned(true))
  }, [tools])

  const printerType = settings.printerType || 'none'
  const thermalEnabled = printerType === 'usb' || printerType === 'network'
  const suggestedPrinter = tools.detectedPrinters.find(
    (printer) => printer.path === tools.recommended
  )
  const osName = platformLabel(detectPlatform()) || t('trGuideOsUnknown')

  const renderPrinter = (printer: DetectedPrinter) => {
    const warning = printerWarning(printer)
    const selected = settings.printerName === printer.path
    const portKindKey = PORT_KIND_KEYS[printer.portKind || 'other'] || 'trPortKindOther'
    return (
      <button
        key={printer.path}
        type="button"
        aria-pressed={selected}
        onClick={() =>
          patch({
            printerName: printer.path,
            printerType: printer.portKind === 'network' ? 'network' : 'usb'
          })
        }
        className={`relative w-full text-start px-3 py-2.5 pe-8 rounded-lg border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          selected
            ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-primary/50 hover:bg-primary/[0.03]'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            {printer.name || printer.path}
          </span>
          {printer.path === tools.recommended ? (
            <Badge tone="success">{t('trPrinterRecommended')}</Badge>
          ) : null}
          {printer.isDefault ? <Badge>{t('trPrinterDefault')}</Badge> : null}
          <Badge tone="slate">{t(portKindKey)}</Badge>
          {typeof printer.confidence === 'number' ? (
            <Badge>{t('trPrinterMatch', { value: printer.confidence })}</Badge>
          ) : null}
          {printer.paperWidth ? (
            <Badge>{t('trPrinterPaper', { size: printer.paperWidth })}</Badge>
          ) : null}
          {printer.stuckJobs ? (
            <Badge tone="warning">{t('trPrinterStuckJobs', { count: printer.stuckJobs })}</Badge>
          ) : null}
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
          {[printer.path, printer.port, printer.driver].filter(Boolean).join(' · ')}
        </div>
        {warning ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{t(warning.key, warning.params)}</span>
          </div>
        ) : null}
        {printer.portLive && !warning ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t('trPrinterPortLive')}</span>
          </div>
        ) : null}
        {selected ? (
          <span className="absolute top-2.5 end-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('trPrinterChosen')}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard
        icon={<Printer className="w-4 h-4" />}
        title={t('thermalPrinterSettings')}
        subtitle={t('configureThermalPrinter')}
        actions={
          <>
            <InfoHint label={t('trHintPrinterTitle')} title={t('trHintPrinterTitle')}>
              {t('trHintPrinterBody', { os: osName })}
            </InfoHint>
            {tools.scanning ? (
              <Spinner label={t('trScanning')} />
            ) : (
              <button type="button" onClick={() => void tools.scan()} className={ghostButtonClass}>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('trRefreshPrinters')}</span>
              </button>
            )}
          </>
        }
      >
        <button
          type="button"
          onClick={() => void tools.connect()}
          disabled={tools.busy}
          className={`${primaryButtonClass} w-full`}
        >
          {tools.scanning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <PlugZap className="w-4 h-4" />
          )}
          <span>{tools.scanning ? t('trAutoConnecting') : t('trAutoConnect')}</span>
        </button>
        <HelpText>{t('trAutoConnectHelp')}</HelpText>

        {tools.lastAutoConnect?.repaired?.length ? (
          <Notice tone="success">
            {t('trAutoConnectRepaired', { list: tools.lastAutoConnect.repaired.join(', ') })}
          </Notice>
        ) : null}

        {tools.needsQueue ? (
          <Notice
            tone="warning"
            actions={
              <button
                type="button"
                onClick={() => void tools.createQueue(tools.needsQueue!.port)}
                disabled={tools.creatingQueue}
                className={warningButtonClass}
              >
                {tools.creatingQueue ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wrench className="w-3.5 h-3.5" />
                )}
                <span>{t('trCreateQueueBtn')}</span>
              </button>
            }
          >
            <span className="font-semibold">{t('trCreateQueueHelp')}</span>
            {tools.needsQueue.device ? (
              <span className="block font-mono text-[11px] mt-1" dir="ltr">
                {tools.needsQueue.device} · {tools.needsQueue.port}
              </span>
            ) : null}
            <span className="block mt-1">{t('trCreateQueueAdmin')}</span>
          </Notice>
        ) : null}

        <ChoiceGroup
          label={t('printerType')}
          value={printerType}
          columns={2}
          onChange={(value) => patch({ printerType: value })}
          options={[
            { value: 'usb', label: t('usbThermalPrinter'), description: t('trTypeUsbDesc') },
            {
              value: 'network',
              label: t('networkThermalPrinter'),
              description: t('trTypeNetworkDesc')
            },
            { value: 'html', label: t('systemPrinter'), description: t('trTypeSystemDesc') },
            { value: 'none', label: t('noPrinter'), description: t('trTypeNoneDesc') }
          ]}
        />

        {tools.detectedPrinters.length > 0 ? (
          <div className="space-y-3 pt-1">
            {thermalEnabled ? null : (
              <Notice
                tone="info"
                actions={
                  suggestedPrinter ? (
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          printerName: suggestedPrinter.path,
                          printerType: suggestedPrinter.portKind === 'network' ? 'network' : 'usb'
                        })
                      }
                      className={primaryButtonClass}
                    >
                      <PlugZap className="w-3.5 h-3.5" />
                      <span>
                        {t('trUseRecommended', {
                          name: suggestedPrinter.name || suggestedPrinter.path
                        })}
                      </span>
                    </button>
                  ) : undefined
                }
              >
                <span className="font-semibold">
                  {t('trScanFound', { count: tools.detectedPrinters.length })}
                </span>{' '}
                {t('trDetectFoundHelp')}
              </Notice>
            )}

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t('trPrinterList')}
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
                {tools.detectedPrinters.map(renderPrinter)}
              </div>
              <HelpText>{t('trPrinterListHelp')}</HelpText>
            </div>
          </div>
        ) : hasScanned && !tools.scanning ? (
          <Notice
            tone="warning"
            actions={
              <button
                type="button"
                onClick={() => void tools.scan()}
                className={warningButtonClass}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('trDetectRescan')}</span>
              </button>
            }
          >
            <span className="font-semibold">{t('trDetectNoneFound')}</span>
            <span className="block mt-1">{t('trDetectGuideIntro')}</span>
            <ol className="mt-1 list-decimal ms-4 space-y-0.5">
              <li>{t('trDetectStep1')}</li>
              <li>{t('trDetectStep2')}</li>
              <li>{t('trDetectStep3')}</li>
            </ol>
            <span className="block mt-1">{t('trDetectStep4')}</span>
          </Notice>
        ) : null}

        {printerType === 'usb' ? (
          <Field label={t('usbPrinterName')} hint={t('autoDetectHelp')}>
            <input
              type="text"
              dir="ltr"
              value={settings.printerName || ''}
              onChange={(e) => patch({ printerName: e.target.value })}
              placeholder={t('trPrinterPlaceholder')}
              className={monoInputClass}
            />
          </Field>
        ) : null}

        {printerType === 'network' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Field label={t('printerIPAddress')} required>
              <input
                type="text"
                dir="ltr"
                value={settings.printerIP || ''}
                onChange={(e) => patch({ printerIP: e.target.value })}
                placeholder="192.168.1.100"
                className={monoInputClass}
              />
            </Field>
            <Field label={t('printerNameOptional')}>
              <input
                type="text"
                value={settings.printerName || ''}
                onChange={(e) => patch({ printerName: e.target.value })}
                placeholder={t('trKitchenPrinterPlaceholder')}
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}

        {thermalEnabled ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <ChoiceGroup
              label={t('paperWidth')}
              value={settings.paperWidth || '80mm'}
              columns={2}
              onChange={(value) => patch({ paperWidth: value })}
              options={[
                { value: '58mm', label: t('paperSmall'), description: t('trPaper58Desc') },
                { value: '80mm', label: t('paperStandard'), description: t('trPaper80Desc') }
              ]}
            />
            <Field label={t('receiptBottomSpacing')} hint={t('trBottomSpacingHelp')}>
              <input
                type="number"
                min={0}
                max={15}
                value={settings.receiptBottomSpacing ?? 4}
                onChange={(e) => patch({ receiptBottomSpacing: parseInt(e.target.value, 10) || 0 })}
                className={`${inputClass} w-24`}
              />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      {thermalEnabled ? (
        <SectionCard
          icon={<Terminal className="w-4 h-4" />}
          title={t('trToolsTitle')}
          subtitle={t('trToolsDesc')}
        >
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void tools.printReceiptSample()}
              disabled={tools.busy}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {tools.testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 text-emerald-400" />
              )}
              <span>{tools.testing ? t('trPrinting') : t('trTestPrintBtn')}</span>
            </button>
            <button
              type="button"
              onClick={() => void tools.diagnose()}
              disabled={tools.busy}
              className={ghostButtonClass}
            >
              <AlertCircle className="w-4 h-4" />
              <span>{tools.diagnosing ? t('trDiagnosing') : t('trDiagnose')}</span>
            </button>
            <button
              type="button"
              onClick={() => void tools.repair()}
              disabled={tools.busy}
              className={warningButtonClass}
            >
              <Wrench className="w-4 h-4" />
              <span>{tools.repairing ? t('trRepairing') : t('trFixPrinter')}</span>
            </button>
          </div>
          <HelpText>{t('trRepairHelp')}</HelpText>
        </SectionCard>
      ) : null}
    </div>
  )
}
