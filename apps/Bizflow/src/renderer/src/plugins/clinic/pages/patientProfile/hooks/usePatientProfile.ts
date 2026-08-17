import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { toArray } from '../utils'
import type { PatientProfileData, PatientStats, CheckResult, Appointment } from '../types'

export function usePatientProfile(patientId?: string) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [patient, setPatient] = useState<PatientProfileData | null>(null)
  const [stats, setStats] = useState<PatientStats | null>(null)
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)

  const loadData = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const [pat, st, cr, apptRes] = await Promise.all([
        window.api.clinic.patients.getById(patientId),
        window.api.clinic.stats.patientStats(patientId),
        window.api.clinic.checkResults.getByPatient(patientId),
        (window.api.clinic.appointments.getAll as any)({ patientId, skip: 0, take: 200 })
      ])

      if (!pat) {
        showToast('error', t('errorLoadingData'))
        navigate('/clinic')
        return
      }

      setPatient(pat as PatientProfileData)
      setStats(st)
      setCheckResults(cr ?? [])
      setAppointments(toArray<Appointment>(apptRes))
    } catch {
      showToast('error', t('errorLoadingData'))
      navigate('/clinic')
    } finally {
      setLoading(false)
    }
  }, [patientId, navigate, showToast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const deleteCheckResult = async (id: string) => {
    if (!window.confirm('Delete this check result? This cannot be undone.')) return
    try {
      await window.api.clinic.checkResults.delete(id)
      setCheckResults((prev) => prev.filter((r) => r.id !== id))
      showToast('success', 'Check result deleted')
    } catch {
      showToast('error', 'Failed to delete check result')
    }
  }

  const exportMedicalRecordPdf = async () => {
    if (!patient) return
    setExportingPdf(true)
    try {
      const result = await (window.api.clinic as any).patients_exportPdf({
        patient,
        sessions: patient.sessions ?? [],
        stats,
        checkResults
      })
      if (result?.success) {
        showToast('success', 'Medical record exported successfully')
      }
    } catch {
      showToast('error', 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  return {
    patient,
    stats,
    checkResults,
    appointments,
    loading,
    exportingPdf,
    reload: loadData,
    deleteCheckResult,
    exportMedicalRecordPdf
  }
}