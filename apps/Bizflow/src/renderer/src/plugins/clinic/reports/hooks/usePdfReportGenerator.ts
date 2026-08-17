import { useState } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'
import { calculateAge, toArray } from '../utils'
import type { ReportType, SessionRecord, PatientRecord, PrescriptionSummary } from '../types'

type PdfResult = { success: boolean; filePath?: string; error?: string }

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

function formatDate(value: string | Date | null | undefined, locale: string): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(locale)
}

function buildTable(headers: string[], rows: Array<Array<unknown>>): string {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? '-')}</td>`).join('')}</tr>`).join('')
    : `<tr><td class="empty" colspan="${headers.length}">-</td></tr>`

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function buildReportHtml({
  language,
  title,
  dateRange,
  summary,
  table
}: {
  language: 'ar' | 'en'
  title: string
  dateRange: string
  summary?: Array<{ label: string; value: string }>
  table: string
}): string {
  const rtl = language === 'ar'
  const generatedLabel = rtl ? 'تاريخ الإنشاء' : 'Generated'
  const periodLabel = rtl ? 'الفترة' : 'Period'
  const clinicLabel = rtl ? 'العيادة' : 'Clinic'
  const generatedAt = new Date().toLocaleString(rtl ? 'ar-EG' : 'en-US')
  const summaryHtml = summary?.length
    ? `<div class="summary">${summary.map((item) => `
        <div class="metric"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join('')}</div>`
    : ''

  return `<!doctype html>
<html lang="${language}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      color: #1e293b;
      direction: ${rtl ? 'rtl' : 'ltr'};
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.55;
      padding: 14mm;
      text-align: ${rtl ? 'right' : 'left'};
    }
    .header { background: #0f766e; color: white; margin-bottom: 14px; padding: 18px 22px; }
    h1 { font-size: 21px; margin: 0 0 6px; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 20px; opacity: .92; }
    .summary { display: flex; gap: 10px; margin: 0 0 14px; }
    .metric { background: #f0fdfa; border: 1px solid #99f6e4; flex: 1; padding: 10px 12px; }
    .metric strong { color: #0f766e; display: block; font-size: 18px; }
    .metric span { color: #475569; }
    table { border-collapse: collapse; table-layout: fixed; width: 100%; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td {
      border: 1px solid #e2e8f0;
      overflow-wrap: anywhere;
      padding: 7px 8px;
      text-align: ${rtl ? 'right' : 'left'};
      unicode-bidi: plaintext;
      vertical-align: top;
    }
    th { background: #ccfbf1; color: #134e4a; font-weight: 700; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .empty { color: #94a3b8; padding: 18px; text-align: center; }
    @page { size: A4 portrait; margin: 0; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <header class="header">
    <h1>${escapeHtml(clinicLabel)} - ${escapeHtml(title)}</h1>
    <div class="meta">
      <span><b>${escapeHtml(periodLabel)}:</b> ${escapeHtml(dateRange)}</span>
      <span><b>${escapeHtml(generatedLabel)}:</b> ${escapeHtml(generatedAt)}</span>
    </div>
  </header>
  ${summaryHtml}
  ${table}
</body>
</html>`
}

export function usePdfReportGenerator() {
  const { t, language } = useLanguage()
  const { success, error: toastError } = useToast()
  const [generating, setGenerating] = useState(false)

  const generateReport = async (reportType: ReportType, startDate: string, endDate: string) => {
    setGenerating(true)
    try {
      const sDate = new Date(startDate)
      const eDate = new Date(endDate)
      eDate.setHours(23, 59, 59, 999)

      const isArabic = language === 'ar'
      const locale = isArabic ? 'ar-EG' : 'en-US'
      const reportLanguage = isArabic ? 'ar' : 'en'
      const dateRangeLabel = `${sDate.toLocaleDateString(locale)} - ${eDate.toLocaleDateString(locale)}`
      const reportTitle =
        reportType === 'sessions'
          ? t('sessionsReport') || 'Clinical Sessions Report'
          : reportType === 'patients'
            ? t('patientsReport') || 'Registered Patients Directory'
            : t('prescriptionsReport') || 'Prescriptions Audit Report'

      const clinic = window.api.clinic
      let table = ''
      let summary: Array<{ label: string; value: string }> | undefined

      if (reportType === 'sessions') {
        const sessionsRes = await (clinic.sessions.getRecent as any)({
          startDate: sDate.toISOString(),
          endDate: eDate.toISOString()
        })
        const sessions = toArray<SessionRecord>(sessionsRes)
        summary = [
          { label: isArabic ? 'إجمالي الجلسات' : 'Total Clinical Sessions', value: String(sessions.length) },
          { label: isArabic ? 'المرضى المختلفون' : 'Unique Patients Seen', value: String(new Set(sessions.map((session) => session.patientId)).size) }
        ]
        table = buildTable(
          isArabic ? ['المريض', 'التاريخ', 'التشخيص', 'الشكوى الرئيسية'] : ['Patient', 'Date', 'Diagnosis', 'Chief Complaint'],
          sessions.slice(0, 100).map((session) => [
            session.patient?.name || '-',
            formatDate(session.visitDate, locale),
            session.diagnosis || '-',
            session.chiefComplaint || '-'
          ])
        )
      } else if (reportType === 'patients') {
        const patientsRes = await clinic.patients.getAll()
        const patients = toArray<PatientRecord>(patientsRes)
        table = buildTable(
          isArabic ? ['الاسم', 'العمر', 'النوع', 'الهاتف', 'تاريخ التسجيل'] : ['Name', 'Age', 'Gender', 'Phone', 'Registered Date'],
          patients.slice(0, 100).map((patient) => [
            patient.name || '-',
            calculateAge(patient.dateOfBirth),
            patient.gender || '-',
            patient.phone || '-',
            formatDate(patient.createdAt, locale)
          ])
        )
      } else {
        const sessionsRes = await (clinic.sessions.getRecent as any)({
          startDate: sDate.toISOString(),
          endDate: eDate.toISOString()
        })
        const sessions = toArray<SessionRecord>(sessionsRes)
        const prescriptions: PrescriptionSummary[] = sessions.flatMap((session) =>
          (session.prescriptions ?? []).map((prescription) => ({
            ...prescription,
            patientName: session.patient?.name,
            sessionDate: session.visitDate
          }))
        )
        table = buildTable(
          isArabic ? ['المريض', 'الدواء', 'الجرعة', 'التكرار', 'تاريخ الجلسة'] : ['Patient', 'Medication', 'Dosage', 'Frequency', 'Session Date'],
          prescriptions.slice(0, 100).map((prescription) => [
            prescription.patientName || '-',
            prescription.medicineName || '-',
            prescription.dosage || '-',
            prescription.frequency || '-',
            formatDate(prescription.sessionDate, locale)
          ])
        )
      }

      const html = buildReportHtml({ language: reportLanguage, title: reportTitle, dateRange: dateRangeLabel, summary, table })
      const fileName = `Clinic_${reportTitle.replace(/[\\/:*?"<>|\s]+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      const printPdf: ((html: string, filename: string) => Promise<PdfResult>) | undefined = window.api.export?.printPdf

      if (!printPdf) throw new Error('PDF export API not available')

      const result = await printPdf(html, fileName)
      if (result.success) {
        success(`${t('savedReport') || 'Report saved'}: ${result.filePath || fileName}`)
      } else if (result.error !== 'Export cancelled') {
        throw new Error(result.error || 'PDF generation failed')
      }
    } catch (err) {
      logger.error('ClinicReport: PDF generate failed', err)
      toastError(t('failedGenerateReport') || 'Failed to generate PDF report')
    } finally {
      setGenerating(false)
    }
  }

  return {
    generating,
    generateReport
  }
}