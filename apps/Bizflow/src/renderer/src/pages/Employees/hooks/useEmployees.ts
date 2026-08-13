import { useState, useEffect, useCallback } from 'react'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useAuth } from '../../../contexts/AuthContext'
import logger from '../../../../../shared/utils/logger'
import type { Employee, EmployeeStats } from '../types'
import { EMPTY_FORM, type EmployeeFormData, type SortOption } from '../constants'
import { buildEmployeesCsv, downloadCsv } from '../utils'

// Re-exported for any code still importing these from the hook.
export { ROLES, DEPARTMENTS, EMPTY_FORM, type EmployeeFormData } from '../constants'

export function useEmployees() {
  const toast = useToast()
  const { t } = useLanguage()
  const { user } = useAuth()
  const actor = user?.username ?? user?.id ?? undefined

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
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('name')

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

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'hire': return new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime()
      case 'performance': return (b.performanceScore ?? 0) - (a.performanceScore ?? 0)
      case 'department': return (a.department || '').localeCompare(b.department || '') || a.name.localeCompare(b.name)
      default: return a.name.localeCompare(b.name)
    }
  })

  const allSelected = sorted.length > 0 && sorted.every(e => selectedIds.has(e.id))
  const selectAllFiltered = () => {
    setSelectedIds(allSelected ? new Set() : new Set(sorted.map(e => e.id)))
  }

  const exportCsv = () => {
    downloadCsv(
      buildEmployeesCsv(sorted),
      `employees-${new Date().toISOString().split('T')[0]}.csv`,
    )
  }

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
        performanceScore: formData.performanceScore > 0 ? formData.performanceScore : null,
        annualLeaveDays: Number(formData.annualLeaveDays) || 0,
        contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate).toISOString() : null,
        idExpiryDate: formData.idExpiryDate ? new Date(formData.idExpiryDate).toISOString() : null,
        createdBy: actor
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
        performanceScore: formData.performanceScore > 0 ? formData.performanceScore : null,
        annualLeaveDays: Number(formData.annualLeaveDays) || 0,
        contractEndDate: formData.contractEndDate ? new Date(formData.contractEndDate).toISOString() : null,
        idExpiryDate: formData.idExpiryDate ? new Date(formData.idExpiryDate).toISOString() : null,
        performedBy: actor
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

  const handleDelete = (emp: Employee) => {
    setDeleteTarget(emp)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      const res = await ipc.employees.delete(deleteTarget.id)
      if (res?.success) { toast.success?.(t('empToastDeleted')); setDeleteTarget(null); load() }
      else toast.error?.(res?.message || t('empToastDeleteFailed'))
    } catch (err: any) { toast.error?.(err.message) }
    finally { setDeleting(false) }
  }

  const toggleSelected = (emp: Employee) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(emp.id)) next.delete(emp.id); else next.add(emp.id)
      return next
    })
  }
  const clearSelected = () => setSelectedIds(new Set())
  const toggleSelectMode = () => { setSelectMode(v => !v); setSelectedIds(new Set()) }

  const bulkSetStatus = async (status: 'active' | 'on-leave' | 'terminated') => {
    if (selectedIds.size === 0 || bulkBusy) return
    setBulkBusy(true)
    const ids = Array.from(selectedIds)
    let ok = 0
    for (const id of ids) {
      try {
        const extra = status === 'terminated' ? { terminationDate: new Date().toISOString() } : { terminationDate: null, terminationNote: null }
        const res = await ipc.employees.update(id, { status, ...extra, performedBy: actor })
        if (res?.success) ok++
      } catch { /* skip */ }
    }
    toast.success?.(`Updated ${ok} employee${ok !== 1 ? 's' : ''}`)
    setSelectedIds(new Set())
    setSelectMode(false)
    setBulkBusy(false)
    load()
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
      performanceScore: emp.performanceScore || 0,
      annualLeaveDays: emp.annualLeaveDays ?? 21,
      taxId: emp.taxId || '', socialInsuranceNo: emp.socialInsuranceNo || '',
      bankName: emp.bankName || '', iban: emp.iban || '',
      contractEndDate: emp.contractEndDate ? new Date(emp.contractEndDate).toISOString().split('T')[0] : '',
      idExpiryDate: emp.idExpiryDate ? new Date(emp.idExpiryDate).toISOString().split('T')[0] : '',
      managerId: emp.managerId || ''
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
    employees, stats, loading, filtered: sorted, totalCount: employees.length,
    searchQuery, setSearchQuery,
    filterStatus, setFilterStatus,
    filterDepartment, setFilterDepartment,
    filterRole, setFilterRole,
    sortBy, setSortBy,
    showFilters, setShowFilters,
    showAddModal, setShowAddModal,
    showEditModal, setShowEditModal,
    selected, formData, setFormData,
    saving, checkingIn,
    handleAdd, handleEdit, handleDelete,
    deleteTarget, deleting, confirmDelete, cancelDelete: () => setDeleteTarget(null),
    selectMode, selectedIds, toggleSelected, clearSelected, toggleSelectMode, bulkSetStatus, bulkBusy,
    allSelected, selectAllFiltered, exportCsv,
    openEdit, handleCheckIn, handleCheckOut,
    openAdd: () => { setFormData(EMPTY_FORM); setShowAddModal(true) }
  }
}
