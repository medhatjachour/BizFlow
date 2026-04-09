import { useState, useEffect, useCallback } from 'react'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'
import type { Employee, EmployeeStats } from '../types'

export const ROLES = [
  // General
  'Cashier', 'Manager', 'Supervisor', 'Accountant', 'HR', 'IT',
  'Warehouse', 'Delivery', 'Security', 'Other',
  // Clinic / Medical
  'Doctor', 'Nurse', 'Receptionist', 'Technician', 'Pharmacist',
  'Lab Technician', 'Physiotherapist', 'Radiologist',
]
export const DEPARTMENTS = ['Sales', 'Operations', 'Finance', 'Logistics', 'Management', 'IT', 'HR', 'Clinic', 'Medical', 'Administration']

export const EMPTY_FORM = {
  name: '', role: '', department: '', email: '', phone: '',
  address: '', nationalId: '', employmentType: 'full-time' as const,
  status: 'active' as const, salary: 0, salaryType: 'monthly',
  emergencyName: '', emergencyPhone: '', notes: '',
  hireDate: new Date().toISOString().split('T')[0],
  performanceScore: 0
}

export type EmployeeFormData = typeof EMPTY_FORM

export function useEmployees() {
  const toast = useToast()
  const { t } = useLanguage()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<EmployeeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [emps, st] = await Promise.all([
        ipc.employees.getAll(),
        ipc.employees.stats()
      ])
      setEmployees(emps || [])
      setStats(st)
    } catch (err) {
      logger.error('Failed to load employees:', err)
      toast.error?.(t('empToastLoadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = employees.filter(e => {
    const q = searchQuery.toLowerCase()
    const matchQ = !q || e.name.toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q) || e.phone.includes(q) || e.role.toLowerCase().includes(q)
    const matchS = !filterStatus || e.status === filterStatus
    const matchD = !filterDepartment || e.department === filterDepartment
    const matchR = !filterRole || e.role.toLowerCase().includes(filterRole.toLowerCase())
    return matchQ && matchS && matchD && matchR
  })

  const validateForm = () => {
    if (!formData.name.trim()) { toast.error?.(t('empToastNameRequired')); return false }
    if (!formData.role.trim()) { toast.error?.(t('empToastRoleRequired')); return false }
    if (!formData.phone.trim()) { toast.error?.(t('empToastPhoneRequired')); return false }
    return true
  }

  const handleAdd = async () => {
    if (!validateForm()) return
    setSaving(true)
    try {
      const res = await ipc.employees.create({
        ...formData,
        salary: Number(formData.salary),
        hireDate: formData.hireDate ? new Date(formData.hireDate).toISOString() : new Date().toISOString(),
        email: formData.email.trim() || null,
        performanceScore: formData.performanceScore > 0 ? formData.performanceScore : null
      })
      if (res?.success) {
        toast.success?.(t('empToastAdded'))
        setShowAddModal(false)
        setFormData(EMPTY_FORM)
        load()
      } else {
        toast.error?.(res?.message || t('empToastAddFailed'))
      }
    } catch (err: any) {
      toast.error?.(err.message || t('empToastAddFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!validateForm() || !selected) return
    setSaving(true)
    try {
      const res = await ipc.employees.update(selected.id, {
        ...formData,
        salary: Number(formData.salary),
        hireDate: formData.hireDate ? new Date(formData.hireDate).toISOString() : undefined,
        email: formData.email.trim() || null,
        performanceScore: formData.performanceScore > 0 ? formData.performanceScore : null
      })
      if (res?.success) {
        toast.success?.(t('empToastUpdated'))
        setShowEditModal(false)
        setSelected(null)
        setFormData(EMPTY_FORM)
        load()
      } else {
        toast.error?.(res?.message || t('empToastUpdateFailed'))
      }
    } catch (err: any) {
      toast.error?.(err.message || t('empToastUpdateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (emp: Employee) => {
    if (!window.confirm(t('empConfirmDelete', { name: emp.name }))) return
    try {
      const res = await ipc.employees.delete(emp.id)
      if (res?.success) { toast.success?.(t('empToastDeleted')); load() }
      else toast.error?.(res?.message || t('empToastDeleteFailed'))
    } catch (err: any) { toast.error?.(err.message) }
  }

  const openEdit = (emp: Employee) => {
    setSelected(emp)
    setFormData({
      name: emp.name, role: emp.role, department: emp.department || '',
      email: emp.email || '', phone: emp.phone, address: emp.address || '',
      nationalId: emp.nationalId || '', employmentType: emp.employmentType as EmployeeFormData['employmentType'],
      status: emp.status as EmployeeFormData['status'], salary: emp.salary, salaryType: emp.salaryType,
      emergencyName: emp.emergencyName || '', emergencyPhone: emp.emergencyPhone || '',
      notes: emp.notes || '', hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
      performanceScore: emp.performanceScore || 0
    })
    setShowEditModal(true)
  }

  const handleCheckIn = async (emp: Employee) => {
    setCheckingIn(emp.id)
    try {
      const res = await ipc.employees.attendance.checkIn(emp.id)
      if (res?.success) { toast.success?.(t('empToastCheckInOk', { name: emp.name })); load() }
      else toast.error?.(res?.message || t('empToastCheckInFailed'))
    } catch (err: any) { toast.error?.(err.message) }
    finally { setCheckingIn(null) }
  }

  const handleCheckOut = async (emp: Employee) => {
    setCheckingIn(emp.id)
    try {
      const res = await ipc.employees.attendance.checkOut(emp.id)
      if (res?.success) { toast.success?.(t('empToastCheckOutOk', { name: emp.name })); load() }
      else toast.error?.(res?.message || t('empToastCheckOutFailed'))
    } catch (err: any) { toast.error?.(err.message) }
    finally { setCheckingIn(null) }
  }

  return {
    employees, stats, loading, filtered,
    searchQuery, setSearchQuery,
    filterStatus, setFilterStatus,
    filterDepartment, setFilterDepartment,
    filterRole, setFilterRole,
    showFilters, setShowFilters,
    showAddModal, setShowAddModal,
    showEditModal, setShowEditModal,
    selected, formData, setFormData,
    saving, checkingIn,
    handleAdd, handleEdit, handleDelete,
    openEdit, handleCheckIn, handleCheckOut,
    openAdd: () => { setFormData(EMPTY_FORM); setShowAddModal(true) }
  }
}
