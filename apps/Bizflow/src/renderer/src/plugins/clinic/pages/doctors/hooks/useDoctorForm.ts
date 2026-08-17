import { useState, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import {  parseWorkingHours, colorForDoctor } from '../utils'
import type { Doctor, DoctorFormData, WorkingHours } from '../types'
import { defaultWorkingHours } from '../constants'

export function useDoctorForm(existing?: Doctor | null, onSaved?: () => void) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<DoctorFormData>({
    name: existing?.name ?? '',
    title: existing?.title ?? 'Dr.',
    specialty: existing?.specialty ?? '',
    phone: existing?.phone ?? '',
    email: existing?.email ?? '',
    licenseNo: existing?.licenseNo ?? '',
    roomNumber: existing?.roomNumber ?? '',
    consultationFee: existing?.consultationFee != null ? String(existing.consultationFee) : '',
    commissionPct: existing?.commissionPct != null ? String(existing.commissionPct) : '',
    status: existing?.status ?? 'active',
    avatarColor: existing?.avatarColor ?? colorForDoctor({ name: existing?.name ?? 'Doctor', avatarColor: existing?.avatarColor }),
    bio: existing?.bio ?? ''
  })

  const [workingHours, setWorkingHours] = useState<WorkingHours>(() =>
    parseWorkingHours(existing?.workingHours) ?? defaultWorkingHours()
  )

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name ?? '',
        title: existing.title ?? 'Dr.',
        specialty: existing.specialty ?? '',
        phone: existing.phone ?? '',
        email: existing.email ?? '',
        licenseNo: existing.licenseNo ?? '',
        roomNumber: existing.roomNumber ?? '',
        consultationFee: existing.consultationFee != null ? String(existing.consultationFee) : '',
        commissionPct: existing.commissionPct != null ? String(existing.commissionPct) : '',
        status: existing.status ?? 'active',
        avatarColor: existing.avatarColor ?? colorForDoctor(existing),
        bio: existing.bio ?? ''
      })
      setWorkingHours(parseWorkingHours(existing.workingHours) ?? defaultWorkingHours())
    }
  }, [existing])

  const setField = <K extends keyof DoctorFormData>(k: K, v: DoctorFormData[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('error', t('doctorNameRequired') || 'Doctor name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        role: 'doctor',
        title: form.title.trim() || null,
        specialty: form.specialty.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        licenseNo: form.licenseNo.trim() || null,
        roomNumber: form.roomNumber.trim() || null,
        consultationFee: form.consultationFee !== '' ? parseFloat(form.consultationFee) : null,
        commissionPct: form.commissionPct !== '' ? parseFloat(form.commissionPct) : null,
        status: form.status,
        avatarColor: form.avatarColor || null,
        bio: form.bio.trim() || null,
        workingHours: JSON.stringify(workingHours)
      }

      if (existing?.id) {
        await window.api.clinic.staff.update(existing.id, payload)
        showToast('success', t('savedSuccessfully') || 'Doctor updated successfully')
      } else {
        await window.api.clinic.staff.create(payload)
        showToast('success', t('createdSuccessfully') || 'Doctor added successfully')
      }

      if (onSaved) onSaved()
    } catch {
      showToast('error', t('errorSavingRecord') || 'Error saving doctor record')
    } finally {
      setSaving(false)
    }
  }

  return {
    form,
    workingHours,
    saving,
    setField,
    setWorkingHours,
    save
  }
}