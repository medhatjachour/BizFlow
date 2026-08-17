import { useState, useCallback, useEffect } from 'react'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { DiagnosisFreqResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'
import { toArray } from '../utils'
import type { ClinicActivityData, SessionRecord, FollowUpRecord, PatientRecord } from '../types'

const INITIAL_DATA: ClinicActivityData = {
  patientCount: 0,
  todaySessions: [],
  followUps: [],
  todayPrescriptions: [],
  patients: []
}

export function useClinicReportData(refreshSignal?: number) {
  const { compute } = useDashboardWorker()

  const [data, setData] = useState<ClinicActivityData>(INITIAL_DATA)
  const [loading, setLoading] = useState(true)
  const [diagnosisFreq, setDiagnosisFreq] = useState<DiagnosisFreqResult | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const clinic = window.api.clinic

      const [overviewRes, sessionsRes, followUpsRes, patientsRes] = await Promise.allSettled([
        clinic.stats.overview(),
        clinic.sessions.getRecent({ filter: 'today' }),
        clinic.appointments.getUpcoming(7),
        clinic.patients.getAll()
      ])

      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null
      const todaySessions = sessionsRes.status === 'fulfilled' ? toArray<SessionRecord>(sessionsRes.value) : []
      const followUps = followUpsRes.status === 'fulfilled' ? toArray<FollowUpRecord>(followUpsRes.value) : []
      const patients = patientsRes.status === 'fulfilled' ? toArray<PatientRecord>(patientsRes.value) : []

      const todayRx = todaySessions.flatMap((s) =>
        (s.prescriptions ?? []).map((rx) => ({
          ...rx,
          patientName: s.patient?.name,
          sessionDate: s.visitDate
        }))
      )

      setData({
        patientCount: overview?.totalPatients ?? 0,
        todaySessions,
        followUps,
        todayPrescriptions: todayRx,
        patients
      })

      // Worker: Compute diagnosis frequency off main thread
      const diagnoses = todaySessions
        .filter((s) => s.diagnosis)
        .map((s) => s.diagnosis as string)

      if (diagnoses.length > 0) {
        const freq = await compute<DiagnosisFreqResult>('COMPUTE_DIAGNOSIS_FREQ', { diagnoses })
        if (freq) setDiagnosisFreq(freq)
      } else {
        setDiagnosisFreq(null)
      }
    } catch (err) {
      logger.error('ClinicReport: loadData failed', err)
    } finally {
      setLoading(false)
    }
  }, [compute])

  useEffect(() => {
    loadData()
  }, [loadData, refreshSignal])

  return {
    data,
    loading,
    diagnosisFreq,
    reload: loadData
  }
}