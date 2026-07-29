import { useState, useCallback, useMemo } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { ReportFormState, ReportType } from '@renderer/pages/Reports/types'
import { REPORT_TYPES_BASE, DEFAULT_START_DATE, DEFAULT_END_DATE } from '../constants'
import { exportReportPdf, exportReportCsv } from '../utils/reportExport'
import logger from '@/shared/utils/logger'

export function useReportGeneration() {
  const { t } = useLanguage()
  const { error: toastError, success } = useToast()

  const [reportForm, setReportForm] = useState<ReportFormState>({
    reportType: null,
    startDate: DEFAULT_START_DATE(),
    endDate: DEFAULT_END_DATE(),
  })
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const reportTypes: ReportType[] = useMemo(
    () =>
      REPORT_TYPES_BASE.map((r) => ({
        ...r,
        title: t(r.id),
      })),
    [t]
  )

  const handleGenerateReport = useCallback(async () => {
    if (!reportForm.reportType) return

    setGenerating(true)
    try {
      const opts = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate),
      }

      let response: any
      switch (reportForm.reportType) {
        case 'sales':
          response = await window.api.reports.getSalesData(opts)
          break
        case 'inventory':
          response = await window.api.reports.getInventoryData(opts)
          break
        case 'financial':
          response = await window.api.reports.getFinancialData(opts)
          break
        case 'customer':
          response = await window.api.reports.getCustomerData(opts)
          break
      }

      if (response?.success && response.data) {
        setReportData(response.data)
        setShowPreview(true)
        success('Report generated')
      } else {
        toastError(response?.error || 'Failed to generate report')
      }
    } catch (err) {
      logger.error('CommerceReport: generate failed', err)
      toastError('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }, [reportForm, success, toastError])

  const handleExportPDF = useCallback(() => {
    try {
      const filename = exportReportPdf({ reportData, reportForm, reportTypes })
      success(`Saved: ${filename}`)
    } catch (err) {
      logger.error('PDF export error', err)
      toastError('PDF export failed')
    }
  }, [reportData, reportForm, reportTypes, success, toastError])

  const handleExportCSV = useCallback(() => {
    try {
      exportReportCsv({ reportData, reportForm, reportTypes })
      success('CSV downloaded')
    } catch (err) {
      logger.error('CSV export error', err)
      toastError('CSV export failed')
    }
  }, [reportData, reportForm, reportTypes, success, toastError])

  const closePreview = useCallback(() => {
    setShowPreview(false)
    setReportData(null)
  }, [])

  return {
    reportForm,
    setReportForm,
    generating,
    reportData,
    setReportData,
    showPreview,
    setShowPreview,
    reportTypes,
    handleGenerateReport,
    handleExportPDF,
    handleExportCSV,
    closePreview,
  }
}