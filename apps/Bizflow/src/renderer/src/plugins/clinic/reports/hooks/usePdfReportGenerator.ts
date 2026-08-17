import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'
import { calculateAge, toArray } from '../utils'
import type { ReportType, SessionRecord, PatientRecord, PrescriptionSummary } from '../types'

export function usePdfReportGenerator() {
  const { t } = useLanguage()
  const { success, error: toastError } = useToast()
  const [generating, setGenerating] = useState(false)

  const generateReport = async (reportType: ReportType, startDate: string, endDate: string) => {
    setGenerating(true)
    try {
      const sDate = new Date(startDate)
      const eDate = new Date(endDate)
      eDate.setHours(23, 59, 59, 999)

      const dateRangeLabel = `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`
      const reportTitle =
        reportType === 'sessions'
          ? t('sessionsReport') || 'Clinical Sessions Report'
          : reportType === 'patients'
            ? t('patientsReport') || 'Registered Patients Directory'
            : t('prescriptionsReport') || 'Prescriptions Audit Report'

      const doc = new jsPDF()
      let y = 20

      // PDF Title & Metadata
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(`Clinic — ${reportTitle}`, 105, y, { align: 'center' })
      y += 8

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(`Period: ${dateRangeLabel}  |  Generated: ${new Date().toLocaleString()}`, 105, y, {
        align: 'center'
      })
      y += 12
      doc.setTextColor(0)

      const clinic = window.api.clinic

      if (reportType === 'sessions') {
        const sessionsRes = await (clinic.sessions.getRecent as any)({
          startDate: sDate.toISOString(),
          endDate: eDate.toISOString()
        })
        const sessions = toArray<SessionRecord>(sessionsRes)

        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Total Clinical Sessions', sessions.length.toString()],
            ['Unique Patients Seen', new Set(sessions.map((s) => s.patientId)).size.toString()]
          ],
          theme: 'grid',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        })

        y = (doc as any).lastAutoTable.finalY + 10

        autoTable(doc, {
          startY: y,
          head: [['Patient', 'Date', 'Diagnosis', 'Chief Complaint']],
          body: sessions.slice(0, 100).map((s) => [
            s.patient?.name || '-',
            new Date(s.visitDate).toLocaleDateString(),
            s.diagnosis || '-',
            s.chiefComplaint || '-'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [13, 148, 136] },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 }
        })
      } else if (reportType === 'patients') {
        const ptsRes = await clinic.patients.getAll()
        const pts = toArray<PatientRecord>(ptsRes)

        autoTable(doc, {
          startY: y,
          head: [['Name', 'Age', 'Gender', 'Phone', 'Registered Date']],
          body: pts.slice(0, 100).map((p) => [
            p.name || '-',
            calculateAge(p.dateOfBirth),
            p.gender || '-',
            p.phone || '-',
            new Date(p.createdAt).toLocaleDateString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 }
        })
      } else if (reportType === 'prescriptions') {
        const sessionsRes = await (clinic.sessions.getRecent as any)({
          startDate: sDate.toISOString(),
          endDate: eDate.toISOString()
        })
        const sessions = toArray<SessionRecord>(sessionsRes)
        const rxList: PrescriptionSummary[] = sessions.flatMap((s) =>
          (s.prescriptions ?? []).map((rx) => ({
            ...rx,
            patientName: s.patient?.name,
            sessionDate: s.visitDate
          }))
        )

        autoTable(doc, {
          startY: y,
          head: [['Patient', 'Medication', 'Dosage', 'Frequency', 'Session Date']],
          body: rxList.slice(0, 100).map((rx) => [
            rx.patientName || '-',
            rx.medicineName || '-',
            rx.dosage || '-',
            rx.frequency || '-',
            rx.sessionDate ? new Date(rx.sessionDate).toLocaleDateString() : '-'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [236, 72, 153] },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 }
        })
      }

      const fileName = `Clinic_${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      success(`${t('savedReport') || 'Report downloaded'}: ${fileName}`)
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