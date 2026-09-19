/**
 * Tax & Receipt Settings Panel
 *
 * Hardware, receipt design, Arabic rendering, and tax policy used to live in one
 * very long scroll. They are now five tabs (Store · Printer · Receipt · Arabic ·
 * Tax) shown next to a live preview of the exact bytes the printer will receive.
 */

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { Languages, LayoutTemplate, Percent, Printer, ScrollText, Store, X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { TaxReceiptSettings } from './types'
import ArabicPanel from './receipt/ArabicPanel'
import DesignPanel from './receipt/DesignPanel'
import PrinterPanel from './receipt/PrinterPanel'
import ReceiptGuide from './receipt/ReceiptGuide'
import ReceiptPreviewPanel from './receipt/ReceiptPreview'
import StorePanel from './receipt/StorePanel'
import TaxPanel from './receipt/TaxPanel'
import { Badge, Notice } from './receipt/formControls'
import { usePrinterTools } from './receipt/usePrinterTools'

interface TaxReceiptSettingsProps {
  settings: TaxReceiptSettings
  onChange: (settings: TaxReceiptSettings) => void
}

type TabId = 'store' | 'printer' | 'design' | 'arabic' | 'tax'

export default function TaxReceiptSettings({
  settings,
  onChange
}: Readonly<TaxReceiptSettingsProps>) {
  const { t } = useLanguage()
  const tools = usePrinterTools(settings, onChange)
  const [tab, setTab] = useState<TabId>('store')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const tabs: Array<{ id: TabId; label: string; icon: ReactNode; count?: number }> = [
    { id: 'store', label: t('trTabStore'), icon: <Store className="w-4 h-4" /> },
    {
      id: 'printer',
      label: t('trTabPrinter'),
      icon: <Printer className="w-4 h-4" />,
      count: tools.detectedPrinters.length || undefined
    },
    { id: 'design', label: t('trTabDesign'), icon: <LayoutTemplate className="w-4 h-4" /> },
    { id: 'arabic', label: t('trTabArabic'), icon: <Languages className="w-4 h-4" /> },
    { id: 'tax', label: t('trTabTax'), icon: <Percent className="w-4 h-4" /> }
  ]

  const selectTab = (index: number): void => {
    const next = tabs[(index + tabs.length) % tabs.length]
    setTab(next.id)
    tabRefs.current[(index + tabs.length) % tabs.length]?.focus()
  }

  const onTabKeyDown = (event: ReactKeyboardEvent, index: number): void => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectTab(index + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectTab(index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      selectTab(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      selectTab(tabs.length - 1)
    }
  }

  const printerLabel = settings.printerName || settings.printerIP

  return (
    <div className="p-4 space-y-5">
      <header className="rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/40 p-4">
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <ScrollText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('taxReceiptSettings')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('configureTaxReceipt')}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {settings.storeName ? (
                  <Badge tone="primary">
                    <Store className="w-3 h-3" />
                    {t('storeNameLabel')}: {settings.storeName}
                  </Badge>
                ) : null}
                <Badge>
                  {t('trStatusPaper')}: {settings.paperWidth}
                </Badge>
                <Badge tone={printerLabel ? 'success' : 'warning'}>
                  <Printer className="w-3 h-3" />
                  {printerLabel || t('trStatusNoPrinter')}
                </Badge>
                <Badge>
                  {t('trStatusLanguage')}:{' '}
                  {settings.receiptLanguage === 'ar' ? t('trValueArabic') : t('trValueEnglish')}
                </Badge>
              </div>
            </div>
          </div>
          <ReceiptGuide />
        </div>
      </header>

      <div
        role="tablist"
        aria-label={t('trTabsLabel')}
        className="flex flex-wrap w-fit max-w-full gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60"
      >
        {tabs.map((item, index) => {
          const active = item.id === tab
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                active
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-900/40'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
              {item.count ? (
                <span className="px-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold tabular-nums">
                  {item.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {tools.feedback ? (
        <Notice
          tone={tools.feedback.tone}
          actions={
            <button
              type="button"
              onClick={() => tools.setFeedback(null)}
              aria-label={t('trDismissMessage')}
              className="p-1.5 -m-0.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          }
        >
          {tools.feedback.message}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          {tab === 'store' ? <StorePanel settings={settings} onChange={onChange} /> : null}
          {tab === 'printer' ? (
            <PrinterPanel settings={settings} onChange={onChange} tools={tools} />
          ) : null}
          {tab === 'design' ? <DesignPanel settings={settings} onChange={onChange} /> : null}
          {tab === 'arabic' ? (
            <ArabicPanel settings={settings} onChange={onChange} tools={tools} />
          ) : null}
          {tab === 'tax' ? <TaxPanel settings={settings} onChange={onChange} /> : null}
        </div>

        <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <ReceiptPreviewPanel
            settings={settings}
            tools={tools}
            forceLanguage={tab === 'arabic' ? 'ar' : undefined}
          />
        </div>
      </div>
    </div>
  )
}
