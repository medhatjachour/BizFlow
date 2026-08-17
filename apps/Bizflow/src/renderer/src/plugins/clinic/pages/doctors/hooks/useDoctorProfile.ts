import { useState, useCallback, useEffect } from 'react'
import type { DoctorProfileData, ProfileTab } from '../types'

export function useDoctorProfile(doctorId?: string | null) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DoctorProfileData | null>(null)
  const [tab, setTab] = useState<ProfileTab>('overview')

  const loadProfile = useCallback(async () => {
    if (!doctorId) {
      setData(null)
      return
    }
    setLoading(true)
    try {
      const res = await window.api.clinic.doctors.getProfile({ id: doctorId })
      setData(res ?? null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  return {
    loading,
    data,
    tab,
    setTab,
    reload: loadProfile
  }
}