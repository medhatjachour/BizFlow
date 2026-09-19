/**
 * Live receipt preview.
 *
 * The image comes from the same rasteriser the print job uses, so what is on
 * screen is what the thermal head prints — including the Arabic shaping and the
 * logo, both of which are impossible to preview with HTML.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, Printer, RefreshCw, Ruler } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import { printReceipt, renderPreview, type ReceiptPreview } from '../../../lib/thermalPrint'
import logger from '../../../../../shared/utils/logger'
import type { TaxReceiptSettings } from '../types'
import { buildSampleReceipt } from './sampleReceipt'
import type { PrinterTools } from './usePrinterTools'
import { Badge, Notice, ghostButtonClass } from './formControls'

interface ReceiptPreviewPanelProps {
  settings: TaxReceiptSettings
  tools: PrinterTools
  /**
   * Overrides the sample language without touching `settings`: the Arabic tab
   * must be able to prove the Arabic path works even when the shop prints
   * receipts in English.
   */
  forceLanguage?: 'en' | 'ar'
}

/** Wait for typing to stop before rasterising; each render is a real paint. */
const RENDER_DEBOUNCE_MS = 450

export default function ReceiptPreviewPanel({
  settings,
  tools,
  forceLanguage
}: Readonly<ReceiptPreviewPanelProps>) {
  const { t } = useLanguage()
  const [preview, setPreview] = useState<ReceiptPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const requestId = useRef(0)

  const receiptLanguage = forceLanguage ?? (settings.receiptLanguage === 'ar' ? 'ar' : 'en')

  // Kept in refs so the debounce effect below never depends on identities that
  // change on every parent render.
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const toolsRef = useRef(tools)
  toolsRef.current = tools

  /**
   * The renderer decides text-vs-graphics from `receiptLanguage`, so the Arabic
   * tab has to hand it Arabic even when the shop prints English receipts —
   * otherwise that tab could never prove the Arabic path on paper.
   */
  const toPrinterSettings = useCallback(() => {
    const base = toolsRef.current.toPrinterSettings()
    return forceLanguage ? { ...base, receiptLanguage: forceLanguage } : base
  }, [forceLanguage])

  const render = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    const data = buildSampleReceipt(settingsRef.current, receiptLanguage)
    try {
      const result = await renderPreview(data, toPrinterSettings())
      // A slower render must not overwrite a newer one.
      if (id !== requestId.current) return
      if (result.success && result.preview) {
        setPreview(result.preview)
      } else {
        setError(result.error || t('trPreviewFailed'))
      }
    } catch (err: any) {
      logger.error('Receipt preview failed:', err)
      if (id === requestId.current) setError(err?.message || t('trPreviewFailed'))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [receiptLanguage, t])

  // Re-render whenever the design changes, but never because the parent
  // re-rendered: `tools` and the callback identity change on every render.
  const renderRef = useRef(render)
  renderRef.current = render

  useEffect(() => {
    const timer = setTimeout(() => void renderRef.current(), RENDER_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [settings, receiptLanguage, forceLanguage])

  const printSample = async () => {
    setPrinting(true)
    try {
      const result = await printReceipt(
        buildSampleReceipt(settings, receiptLanguage),
        toPrinterSettings()
      )
      tools.setFeedback(
        result.success
          ? { tone: 'success', message: t('trPreviewPrinted') }
          : { tone: 'error', message: result.message || result.error || t('trTestPrintFailed') }
      )
    } catch (err: any) {
      logger.error('Preview print failed:', err)
      tools.setFeedback({ tone: 'error', message: err?.message || t('trTestPrintFailed') })
    } finally {
      setPrinting(false)
    }
  }

  const paperWidth = settings.paperWidth === '58mm' ? '58mm' : '80mm'

  return (
    <aside className="rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/40 p-4 space-y-3.5">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Eye className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white">
              {t('trLivePreview')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t('trPreviewHelp')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void render()}
          disabled={loading}
          aria-label={t('trPreviewRefresh')}
          title={t('trPreviewRefresh')}
          className={`${ghostButtonClass} px-2.5`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {forceLanguage === 'ar' ? (
        <Notice tone="info">{t('trPreviewArabicForced')}</Notice>
      ) : null}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-100 to-slate-200/70 dark:from-slate-950/60 dark:to-slate-900/60 p-4">
        <div
          className={`mx-auto bg-white rounded-sm shadow-lg ring-1 ring-black/5 overflow-hidden ${
            paperWidth === '58mm' ? 'max-w-[220px]' : 'max-w-[330px]'
          }`}
        >
          {preview && preview.slices.length > 0 ? (
            preview.slices.map((slice) => (
              <img
                key={`${slice.offset}-${slice.height}`}
                src={slice.dataUrl}
                alt={t('trLivePreview')}
                className="w-full block"
                style={{ imageRendering: 'pixelated' }}
              />
            ))
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400">
              {loading ? t('trPreviewLoading') : t('trPreviewEmpty')}
            </div>
          )}
        </div>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {preview ? (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={preview.raster ? 'primary' : 'slate'}>
              {preview.raster ? t('trPreviewRaster') : t('trPreviewText')}
            </Badge>
            {preview.encoding ? (
              <Badge>{t('trPreviewEncoding', { name: preview.encoding })}</Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Ruler className="w-3.5 h-3.5 shrink-0" />
            <span>
              {t('trPreviewSize', {
                paper: paperWidth,
                width: preview.width,
                height: preview.totalHeight
              })}
            </span>
          </div>
          {preview.raster && preview.missingGlyphs.length > 0 ? (
            <Notice tone="warning">
              {t('trPreviewFallback', { chars: preview.missingGlyphs.slice(0, 6).join(' ') })}
            </Notice>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void printSample()}
        disabled={printing || loading}
        className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {printing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        <span>{printing ? t('trPrinting') : t('trPreviewPrintThis')}</span>
      </button>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
        {t('trPreviewSample')}
      </p>
    </aside>
  )
}
