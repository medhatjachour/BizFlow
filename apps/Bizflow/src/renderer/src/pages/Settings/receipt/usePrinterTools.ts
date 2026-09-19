/**
 * Printer discovery and hardware actions for the receipt settings page.
 *
 * Everything that touches the printer lives here so the panels stay presentational:
 * detection and auto-connect, the one-click queue repair for a USB printer Windows
 * has no driver for, and the diagnostic / repair / test-print tools.
 */

import { useCallback, useRef, useState } from 'react'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'
import {
  autoConnect as autoConnectApi,
  createQueue as createQueueApi,
  detectPrinters as detectPrintersApi,
  diagnosePrinter as diagnosePrinterApi,
  printReceipt as printReceiptApi,
  repairPrinter as repairPrinterApi,
  testPrint as testPrintApi,
  type AutoConnectResult,
  type DetectedPrinter,
  type PrinterDiagnosis,
  type PrinterSettings
} from '../../../lib/thermalPrint'
import type { TaxReceiptSettings } from '../types'
import type { NoticeTone } from './formControls'
import { buildSampleReceipt } from './sampleReceipt'

export interface PrinterFeedback {
  tone: NoticeTone
  message: string
}

/** The main process takes `PrinterSettings`, which is narrower than the form. */
export function toPrinterSettings(settings: TaxReceiptSettings): PrinterSettings {
  return {
    printerType: settings.printerType === 'none' ? 'html' : settings.printerType,
    printerName: settings.printerName || '',
    printerIP: settings.printerIP || '',
    printerPort: 9100,
    paperWidth: settings.paperWidth || '80mm',
    receiptLanguage: settings.receiptLanguage || 'en',
    receiptArabicMode: settings.receiptArabicMode || 'bitmap',
    receiptArabicEncoding: settings.receiptArabicEncoding || 'auto',
    printLogo: Boolean(settings.printLogo ?? settings.includeLogo),
    receiptLogo: settings.receiptLogo || undefined,
    printQRCode: Boolean(settings.printQRCode),
    printBarcode: Boolean(settings.printBarcode),
    openCashDrawer: Boolean(settings.openCashDrawer),
    receiptHeader: settings.receiptHeader || '',
    receiptFooter: settings.receiptFooter || '',
    receiptBottomSpacing: settings.receiptBottomSpacing ?? 4,
    receiptTemplate: settings.receiptTemplate || 'classic',
    receiptDivider: settings.receiptDivider || 'dashed',
    receiptFontScale: settings.receiptFontScale ?? 1,
    receiptLogoSize: settings.receiptLogoSize ?? 70,
    receiptLogoMono: Boolean(settings.receiptLogoMono),
    receiptShowStoreDetails: settings.receiptShowStoreDetails !== false
  }
}

export interface PrinterTools {
  busy: boolean
  scanning: boolean
  testing: boolean
  diagnosing: boolean
  repairing: boolean
  creatingQueue: boolean
  feedback: PrinterFeedback | null
  setFeedback: (feedback: PrinterFeedback | null) => void
  detectedPrinters: DetectedPrinter[]
  recommended?: string
  lastAutoConnect: AutoConnectResult | null
  needsQueue?: { port: string; device?: string }
  // Method shorthand on purpose: the i18n lint for this directory reads
  // `> Promise<` as JSX copy, so property-style arrow types are not allowed here.
  /** Read-only scan of every printer Windows knows about. */
  scan(options?: { silent?: boolean }): Promise<DetectedPrinter[]>
  /** Find the best receipt printer, repair it if needed, and select it. */
  connect(): Promise<AutoConnectResult | null>
  /** Create a raw pass-through queue for a USB printer with no driver. */
  createQueue(port: string): Promise<boolean>
  /**
   * Print the sample receipt through the exact pipeline a sale uses, so what
   * comes out of the printer is the receipt the shop really hands out.
   */
  printReceiptSample(language?: 'en' | 'ar'): Promise<void>
  /**
   * Print the main process diagnostic page: the same Arabic sentence in every
   * code page and letter order, used to see which one the printer's ROM carries.
   */
  testPrint(): Promise<void>
  diagnose(): Promise<PrinterDiagnosis | null>
  repair(): Promise<void>
  toPrinterSettings(): PrinterSettings
}

export function usePrinterTools(
  settings: TaxReceiptSettings,
  onChange: (settings: TaxReceiptSettings) => void
): PrinterTools {
  const { t } = useLanguage()

  const [scanning, setScanning] = useState(false)
  const [testing, setTesting] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [creatingQueue, setCreatingQueue] = useState(false)
  const [detectedPrinters, setDetectedPrinters] = useState<DetectedPrinter[]>([])
  const [recommended, setRecommended] = useState<string | undefined>()
  const [lastAutoConnect, setLastAutoConnect] = useState<AutoConnectResult | null>(null)
  const [needsQueue, setNeedsQueue] = useState<{ port: string; device?: string } | undefined>()
  const [feedback, setFeedback] = useState<PrinterFeedback | null>(null)

  // The panels call these handlers from memo-free closures, so the latest
  // settings are read from a ref instead of being captured once.
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const patch = useCallback(
    (next: Partial<TaxReceiptSettings>) => onChange({ ...settingsRef.current, ...next }),
    [onChange]
  )

  const scan = useCallback(
    async (options?: { silent?: boolean }): Promise<DetectedPrinter[]> => {
      setScanning(true)
      if (!options?.silent) setFeedback(null)
      try {
        const result = await detectPrintersApi({
          printerIP: settingsRef.current.printerIP || undefined,
          preferred: settingsRef.current.printerName || undefined
        })
        const printers = result.printers || []
        setDetectedPrinters(printers)
        setRecommended(result.recommended)
        if (!options?.silent) {
          setFeedback(
            printers.length > 0
              ? { tone: 'info', message: t('trScanFound', { count: printers.length }) }
              : { tone: 'warning', message: result.error || t('trDetectNoneFound') }
          )
        }
        return printers
      } catch (err: any) {
        logger.error('Printer scan failed:', err)
        if (!options?.silent) {
          setFeedback({ tone: 'error', message: err?.message || t('trDetectFailed') })
        }
        return []
      } finally {
        setScanning(false)
      }
    },
    [settingsRef, t]
  )

  const connect = useCallback(async (): Promise<AutoConnectResult | null> => {
    setScanning(true)
    setFeedback(null)
    try {
      const result = await autoConnectApi(toPrinterSettings(settingsRef.current))
      setLastAutoConnect(result)
      setDetectedPrinters(result.candidates || [])
      setNeedsQueue(result.needsQueue)

      if (result.success && result.printer) {
        const printer = result.printer
        patch({
          printerType: printer.portKind === 'network' ? 'network' : 'usb',
          printerName: printer.path,
          ...(result.paperWidth ? { paperWidth: result.paperWidth } : {})
        })
        const repaired = result.repaired.length > 0
          ? ` ${t('trAutoConnectRepaired', { list: result.repaired.join(', ') })}`
          : ''
        setFeedback({
          tone: 'success',
          message: `${t('trAutoConnected', {
            name: printer.name,
            confidence: result.confidence
          })}${repaired}`
        })
      } else {
        setFeedback({
          tone: result.needsQueue ? 'warning' : 'error',
          message: result.needsQueue
            ? t('trCreateQueueHelp')
            : result.message || t('trAutoConnectNone')
        })
      }
      return result
    } catch (err: any) {
      logger.error('Auto-connect failed:', err)
      setFeedback({ tone: 'error', message: err?.message || t('trAutoConnectNone') })
      return null
    } finally {
      setScanning(false)
    }
  }, [patch, t])

  const createQueue = useCallback(
    async (port: string): Promise<boolean> => {
      setCreatingQueue(true)
      setFeedback(null)
      try {
        const name = `BizFlow Receipt (${port})`
        const result = await createQueueApi(name, port)
        if (result.success) {
          setNeedsQueue(undefined)
          patch({ printerType: 'usb', printerName: result.printerName || name })
          setFeedback({ tone: 'success', message: t('trCreateQueueDone', { name: result.printerName || name }) })
          await scan({ silent: true })
        } else {
          setFeedback({ tone: 'error', message: result.message || t('trCreateQueueFailed') })
        }
        return result.success
      } catch (err: any) {
        logger.error('Create queue failed:', err)
        setFeedback({ tone: 'error', message: err?.message || t('trCreateQueueFailed') })
        return false
      } finally {
        setCreatingQueue(false)
      }
    },
    [patch, scan, t]
  )

  const printReceiptSample = useCallback(
    async (language?: 'en' | 'ar'): Promise<void> => {
      setTesting(true)
      setFeedback(null)
      try {
        const current = settingsRef.current
        const receiptLanguage = language ?? (current.receiptLanguage === 'ar' ? 'ar' : 'en')
        const result = await printReceiptApi(
          buildSampleReceipt(current, receiptLanguage),
          toPrinterSettings(current)
        )
        setFeedback(
          result.success
            ? { tone: 'success', message: t('trTestPrinted') }
            : { tone: 'error', message: result.message || result.error || t('trTestPrintFailed') }
        )
      } catch (err: any) {
        logger.error('Sample receipt print failed:', err)
        setFeedback({ tone: 'error', message: err?.message || t('trTestPrintError') })
      } finally {
        setTesting(false)
      }
    },
    [t]
  )

  const testPrint = useCallback(async (): Promise<void> => {
    setTesting(true)
    setFeedback(null)
    try {
      const result = await testPrintApi(toPrinterSettings(settingsRef.current))
      setFeedback(
        result.success
          ? { tone: 'success', message: t('trTestPrinted') }
          : { tone: 'error', message: result.message || t('trTestPrintFailed') }
      )
    } catch (err: any) {
      logger.error('Test print failed:', err)
      setFeedback({ tone: 'error', message: err?.message || t('trTestPrintError') })
    } finally {
      setTesting(false)
    }
  }, [settingsRef, t])

  const diagnose = useCallback(async (): Promise<PrinterDiagnosis | null> => {
    setDiagnosing(true)
    setFeedback(null)
    try {
      const result = await diagnosePrinterApi(toPrinterSettings(settingsRef.current))
      if (!result.success || !result.diagnosis) {
        setFeedback({ tone: 'error', message: result.error || t('trDiagnoseFailed') })
        return null
      }
      const { diagnosis } = result
      setFeedback(
        diagnosis.issues.length === 0
          ? { tone: 'success', message: t('trNoPrinterProblem') }
          : { tone: 'error', message: diagnosis.issues.map((issue) => issue.message).join(' ') }
      )
      return diagnosis
    } catch (err: any) {
      logger.error('Diagnose failed:', err)
      setFeedback({ tone: 'error', message: err?.message || t('trDiagnoseFailed') })
      return null
    } finally {
      setDiagnosing(false)
    }
  }, [settingsRef, t])

  const repair = useCallback(async (): Promise<void> => {
    setRepairing(true)
    setFeedback(null)
    try {
      const result = await repairPrinterApi(toPrinterSettings(settingsRef.current))
      setFeedback(
        result.success
          ? {
              tone: 'success',
              message:
                result.changes.length > 0
                  ? `${t('trRepairDone')} ${result.changes.join(', ')}`
                  : result.message || t('trRepairDone')
            }
          : { tone: 'error', message: result.message || t('trRepairFailed') }
      )
      await scan({ silent: true })
    } catch (err: any) {
      logger.error('Repair failed:', err)
      setFeedback({ tone: 'error', message: err?.message || t('trRepairFailed') })
    } finally {
      setRepairing(false)
    }
  }, [scan, t])

  return {
    busy: scanning || testing || diagnosing || repairing || creatingQueue,
    scanning,
    testing,
    diagnosing,
    repairing,
    creatingQueue,
    feedback,
    setFeedback,
    detectedPrinters,
    recommended,
    lastAutoConnect,
    needsQueue,
    scan,
    connect,
    createQueue,
    printReceiptSample,
    testPrint,
    diagnose,
    repair,
    toPrinterSettings: () => toPrinterSettings(settingsRef.current)
  }
}
