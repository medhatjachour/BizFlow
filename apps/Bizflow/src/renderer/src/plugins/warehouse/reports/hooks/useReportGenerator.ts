import { useState } from 'react'
import { ReportType } from '../types'
import { generateWarehousePDF } from '../utils'
import { useToast } from '@renderer/contexts/ToastContext'

export function useReportGenerator() {
  const [generating, setGenerating] = useState(false)
  const toast = useToast()

  const compileReport = async (
    reportType: ReportType,
    startDate: string,
    endDate: string
  ) => {
    setGenerating(true)
    try {
      const api = window.api.warehouse
      const sDate = new Date(startDate)
      const eDate = new Date(endDate)
      eDate.setHours(23, 59, 59, 999)

      let rawData: any[] = []

      if (reportType === 'stock' || reportType === 'valuation') {
        rawData = await api.getStock()
      } else if (reportType === 'transfers') {
        rawData = await api.getTransfers({
          startDate: sDate.toISOString(),
          endDate: eDate.toISOString()
        })
      } else if (reportType === 'critical') {
        rawData = await api.getLowStock()
      }

      const filename = generateWarehousePDF(reportType, startDate, endDate, rawData)
      toast.success(`Exported: ${filename}`)
    } catch (err: any) {
      console.error('[useReportGenerator] Failed to generate PDF:', err)
      toast.error(err?.message || 'Failed to generate PDF report')
    } finally {
      setGenerating(false)
    }
  }

  return { generating, compileReport }
}