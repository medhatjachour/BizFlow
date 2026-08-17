import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { isSingleDoctorMode, setSingleDoctorMode } from '../utils'
import type { Doctor } from '../types'

export function useDoctors() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [singleMode, setSingleModeState] = useState(isSingleDoctorMode())

  const loadDoctors = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await window.api.clinic.doctors.list()
      setDoctors(rows ?? [])
    } catch {
      setDoctors([])
      showToast('error', t('errorLoadingData') || 'Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }, [showToast, t])

  useEffect(() => {
    loadDoctors()
  }, [loadDoctors])

  const setDefaultDoctor = async (id: string) => {
    try {
      await window.api.clinic.doctors.setDefault(id)
      showToast('success', t('defaultDoctorSet') || 'Default doctor updated')
      await loadDoctors()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Error updating default doctor')
    }
  }

  const deleteDoctor = async (id: string) => {
    try {
      await window.api.clinic.staff.delete(id)
      showToast('success', t('deletedSuccessfully') || 'Doctor deleted')
      await loadDoctors()
    } catch {
      showToast('error', t('errorDeletingRecord') || 'Error deleting doctor')
    }
  }

  const toggleSingleMode = () => {
    const next = !singleMode
    setSingleModeState(next)
    setSingleDoctorMode(next)
    showToast(
      'success',
      next
        ? (t('singleDoctorModeOn') || 'Single-doctor mode active: Doctor is auto-selected in forms')
        : (t('singleDoctorModeOff') || 'Single-doctor mode disabled')
    )
  }

  return {
    doctors,
    loading,
    singleMode,
    reload: loadDoctors,
    setDefaultDoctor,
    deleteDoctor,
    toggleSingleMode
  }
}