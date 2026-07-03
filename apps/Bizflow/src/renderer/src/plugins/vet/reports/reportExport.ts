/**
 * Shared report export helpers for the Vet Clinic reports.
 * Builds a structured payload the main process turns into a PDF (Chromium,
 * Arabic/RTL-safe) or an .xlsx (SheetJS). Money columns stay numeric so Excel
 * can sum them; the PDF builder formats them.
 */

export type ReportColumn = { key: string; label: string; isMoney?: boolean; align?: 'left' | 'right' | 'center' }
export type ReportSection = {
  heading: string
  columns: ReportColumn[]
  rows: Array<Record<string, any>>
  totals?: Record<string, any>
}
export type ReportPayload = {
  title: string
  subtitle?: string
  lang?: 'en' | 'ar'
  currency?: string
  meta?: Array<{ label: string; value: string }>
  kpis?: Array<{ label: string; value: string }>
  sections: ReportSection[]
  fileBase?: string
}

/** Pick a label in the active language without needing i18n keys. */
export const bi = (lang: string) => (en: string, ar: string): string => (lang === 'ar' ? ar : en)

export async function exportReport(
  format: 'pdf' | 'excel',
  payload: ReportPayload
): Promise<{ success: boolean; filePath: string } | null> {
  const api = (window as any).api?.vet?.reports
  if (!api) throw new Error('Export is only available in the desktop app')
  return format === 'pdf' ? api.exportPdf(payload) : api.exportExcel(payload)
}
