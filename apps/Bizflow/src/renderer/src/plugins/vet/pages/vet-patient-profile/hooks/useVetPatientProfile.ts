import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'

export interface VetPrescription {
  id: string
  medicineName: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
  quantity?: number | null
  instructions?: string | null
  isActive?: boolean
  startDate?: string | null
  stoppedAt?: string | null
  stopReason?: string | null
}

export interface VetSession {
  id: string
  visitDate: string
  visitType: string
  vetName?: string | null
  chiefComplaint: string
  vetVitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: string
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: string
  paymentMethod?: string | null
  prescriptions: VetPrescription[]
}

export interface VetCheckResult {
  id: string
  title: string
  description?: string | null
  fileName: string
  fileSize?: number | null
  resultDate: string
}

export function useVetPatientProfile(patientId: string | undefined) {
  const toast = useToast()
  const [patient, setPatient] = useState<any | null>(null)
  const [checkResults, setCheckResults] = useState<VetCheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadPatient = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)
    try {
      const data = (await window.api.vet?.patients.getById(patientId)) as any
      if (!data) {
        setError('Patient not found')
        return
      }
      setPatient(data)
      setCheckResults(data.checkResults ?? [])
    } catch (err: any) {
      setError(err.message ?? 'Failed to load patient profile')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    loadPatient()
  }, [loadPatient])

  const uploadFile = async (file: File) => {
    if (!patientId) return
    setUploading(true)
    try {
      const buffer = Array.from(new Uint8Array(await file.arrayBuffer()))
      const title = file.name.replace(/\.[^.]+$/, '')
      const result = (await window.api.vet?.checkResults.create({
        patientId,
        title,
        fileName: file.name,
        buffer,
        mimeType: file.type,
        resultDate: new Date().toISOString()
      })) as VetCheckResult

      if (result) {
        setCheckResults((prev) => [result, ...prev])
        toast.success('Document / image uploaded successfully')
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (resultId: string) => {
    try {
      await window.api.vet?.checkResults.delete(resultId)
      setCheckResults((prev) => prev.filter((r) => r.id !== resultId))
      toast.success('File deleted')
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    }
  }

  return {
    patient,
    checkResults,
    loading,
    error,
    uploading,
    reload: loadPatient,
    uploadFile,
    deleteFile
  }
}