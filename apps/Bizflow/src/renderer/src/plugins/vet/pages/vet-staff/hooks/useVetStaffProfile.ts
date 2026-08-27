import { useState, useEffect, useMemo } from 'react'
import { VetStaff, VetStaffStats } from '../types'

export function useVetStaffProfile(staff: VetStaff) {
  const [sessions, setSessions] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const now = new Date()

    Promise.allSettled([
      window.api.vet?.sessions.getRecent({ vetName: staff.name, take: 200 }),
      window.api.vet?.appointments.getAll({ vetName: staff.name, take: 200 }),
      window.api.vet?.sessions.getFollowUps({ from: now.toISOString(), take: 50 })
    ]).then(([sessRes, apptRes, fuRes]) => {
      if (cancelled) return

      if (sessRes.status === 'fulfilled') {
        const raw = sessRes.value
        setSessions(Array.isArray(raw) ? raw : (raw?.data ?? []))
      }
      if (apptRes.status === 'fulfilled') {
        const raw = apptRes.value
        setAppointments(Array.isArray(raw) ? raw : (raw?.data ?? []))
      }
      if (fuRes.status === 'fulfilled') {
        const raw = fuRes.value
        const all: any[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setFollowUps(all.filter((s) => s.vetName === staff.name))
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [staff.name])

  const stats: VetStaffStats = useMemo(() => {
    const total = sessions.length
    const completed = sessions.filter((s) => s.status === 'completed').length
    const totalCharged = sessions.reduce((s, r) => s + (r.amountCharged ?? 0), 0)
    const totalPaid = sessions.reduce((s, r) => s + (r.amountPaid ?? 0), 0)
    const upcoming = appointments.filter((a) => {
      const d = new Date(a.appointmentDate)
      return d >= new Date() && ['scheduled', 'confirmed'].includes(a.status)
    }).length
    const uniquePatients = new Set(sessions.map((s) => s.patientId)).size

    return {
      total,
      completed,
      totalCharged,
      totalPaid,
      outstanding: totalCharged - totalPaid,
      upcoming,
      uniquePatients
    }
  }, [sessions, appointments])

  return {
    sessions,
    appointments,
    followUps,
    stats,
    loading
  }
}