/**
 * Guest check preview.
 *
 * The image is produced by the same rasteriser the print job uses, so what the
 * cashier sees is the paper the thermal head will print — Arabic shaping, logo
 * and receipt design included. Store identity, header and footer come from
 * Settings, so nothing on this screen is hard-coded.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Printer, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { readPrinterSettings, renderPreview, type ReceiptPreview } from '@renderer/lib/thermalPrint'
import { PosOrder } from '../types'
import { buildOrderReceiptData } from '../../utils/receiptData'
import { printOrderReceipt } from '../../utils/printOrderReceipt'

interface Props {
  isOpen: boolean
  onClose: () => void
  order: PosOrder | null
}

type Feedback = { tone: 'success' | 'error' | 'warning'; text: string }

export const ReceiptThermalPreview: React.FC<Props> = ({ isOpen, onClose, order }) => {
  const { t } = useLanguage()
  const [preview, setPreview] = useState<ReceiptPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [missingStore, setMissingStore] = useState(false)
  // The raster is produced at the paper width configured in Settings, so this is
  // shown for information instead of being a switch that would not change it.
  const paperWidth = readPrinterSettings().paperWidth

  const storeFallback = t('restStoreFallback')

  // The order object is rebuilt by the POS on every render, so the effect below
  // is keyed on the fields the receipt actually shows instead of its identity.
  const orderKey = useMemo(
    () =>
      order
        ? [order.id, order.status, order.total, order.items.length, order.closedAt ?? ''].join(':')
        : '',
    [order],
  )
  const orderRef = useRef(order)
  orderRef.current = order

  useEffect(() => {
    if (!isOpen || !orderRef.current) {
      setPreview(null)
      setFeedback(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setFeedback(null)
    setMissingStore(!localStorage.getItem('storeName'))

    void renderPreview(buildOrderReceiptData(orderRef.current, storeFallback)).then((result) => {
      if (cancelled) return
      if (result.success && result.preview) setPreview(result.preview)
      else setFeedback({ tone: 'error', text: result.error || t('restReceiptPreviewFailed') })
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, orderKey, storeFallback, t])

  const handlePrint = useCallback(async () => {
    if (!order) return
    setPrinting(true)
    setFeedback(null)

    const result = await printOrderReceipt(order, storeFallback)
    setPrinting(false)

    if (result.success) {
      setFeedback({ tone: 'success', text: t('restReceiptPrinted') })
      return
    }
    if (result.browserPrint) {
      setFeedback({ tone: 'warning', text: t('restReceiptNoPrinter') })
      window.print()
      return
    }
    setFeedback({ tone: 'error', text: result.message || t('restReceiptPreviewFailed') })
  }, [order, storeFallback, t])

  if (!isOpen || !order) return null

  const width = paperWidth === '58mm' ? 'max-w-[220px]' : 'max-w-[320px]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-5 space-y-3 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {t('restReceiptPreviewTitle')}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t('restReceiptPreviewHelp')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-1 text-[10px] font-mono font-bold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {paperWidth}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('restSalesClose')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <div className={`mx-auto bg-white rounded-sm shadow-lg overflow-hidden ${width}`}>
            {preview && preview.slices.length > 0 ? (
              preview.slices.map((slice) => (
                <img
                  key={`${slice.offset}-${slice.height}`}
                  src={slice.dataUrl}
                  alt={t('restReceiptPreviewTitle')}
                  className="w-full block"
                  style={{ imageRendering: 'pixelated' }}
                />
              ))
            ) : (
              <div className="h-44 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{loading ? t('restReceiptRendering') : t('restReceiptPreviewFailed')}</span>
              </div>
            )}
          </div>
        </div>

        {feedback ? (
          <p
            className={`text-[11px] font-semibold text-center ${
              feedback.tone === 'success'
                ? 'text-emerald-600 dark:text-emerald-400'
                : feedback.tone === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        {missingStore ? (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-semibold">
            {t('restReceiptNoStore')}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handlePrint()}
          disabled={printing || loading}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-colors"
        >
          {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          {printing ? t('restReceiptPrinting') : t('restSalesPrintReceipt')}
        </button>
      </div>
    </div>
  )
}
