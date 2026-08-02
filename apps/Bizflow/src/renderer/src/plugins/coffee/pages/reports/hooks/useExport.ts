import { useCallback, useState } from 'react'
import { ExportFormat, Overview, TrendRow, ProductRow, CategoryRow, CustomerInsights } from '../types'
import { buildExportData, exportToCsv, exportToExcel, exportToPdf, printReport, generateFilename } from '../utils'

interface UseExportParams {
  overview: Overview | null
  trend: TrendRow[]
  topProducts: ProductRow[]
  categories: CategoryRow[]
  customers: CustomerInsights | null
  from: string
  to: string
  t: (key: string) => string
  toast: { success: (msg: string) => void; error: (msg: string) => void }
}

export function useExport({
  overview,
  trend,
  topProducts,
  categories,
  customers,
  from,
  to,
  t,
  toast,
}: UseExportParams) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!overview) {
        toast.error('No data to export')
        return
      }

      setExporting(format)

      try {
        const data = buildExportData(overview, trend, topProducts, categories, customers, from, to, t)
        const filename = generateFilename(format, from, to)

        switch (format) {
          case 'csv':
            exportToCsv(data, filename)
            break
          case 'excel':
            await exportToExcel(data, filename)
            break
          case 'pdf':
            await exportToPdf(data, filename)
            break
          case 'print':
            printReport()
            break
        }

        if (format !== 'print') {
          toast.success(`${format.toUpperCase()} report exported successfully`)
        }
      } catch (err) {
        console.error('Export error:', err)
        toast.error(`Failed to export ${format.toUpperCase()} report`)
      } finally {
        setExporting(null)
      }
    },
    [overview, trend, topProducts, categories, customers, from, to, t, toast]
  )

  return { handleExport, exporting }
}
