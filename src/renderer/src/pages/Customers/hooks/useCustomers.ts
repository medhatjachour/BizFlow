import { useState, useEffect, useCallback } from 'react'
import { ipc } from '../../../utils/ipc'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'
import type { Customer, CustomerFormData } from '../types'

const DEFAULT_FORM: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  loyaltyTier: 'Bronze'
}

export function useCustomers() {
  const { t } = useLanguage()
  const toast = useToast()

  // List state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(100)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Modal visibility
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showInstallmentManager, setShowInstallmentManager] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Selected entities
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any[]>([])
  const [selectedCustomerForInstallments, setSelectedCustomerForInstallments] = useState<Customer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [deleteCheckResult, setDeleteCheckResult] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState<CustomerFormData>(DEFAULT_FORM)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    loadCustomers()
  }, [page, pageSize, debouncedSearch])

  // ─── Data fetching ────────────────────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await ipc.customers.getAll({
        limit: pageSize,
        offset: page * pageSize,
        searchTerm: debouncedSearch
      })
      setCustomers(Array.isArray(data.customers) ? data.customers : [])
      setTotalCount(data.totalCount || 0)
      setHasMore(data.hasMore || false)
    } catch (error) {
      logger.error('Failed to load customers:', error)
      toast.error(t('failedToLoadCustomers'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch])

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const resetForm = () => setFormData(DEFAULT_FORM)

  const validateForm = () => {
    if (!formData.name.trim()) { toast.error(t('nameRequired')); return false }
    if (formData.email.trim() && !formData.email.includes('@')) { toast.error(t('validEmailRequired')); return false }
    if (!formData.phone.trim()) { toast.error(t('phoneRequired')); return false }
    return true
  }

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      loyaltyTier: customer.loyaltyTier as CustomerFormData['loyaltyTier']
    })
    setShowEditModal(true)
  }

  const closeAddModal = () => { setShowAddModal(false); resetForm() }
  const closeEditModal = () => { setShowEditModal(false); resetForm(); setSelectedCustomer(null) }

  // ─── CRUD handlers ────────────────────────────────────────────────────────
  const handleAddCustomer = async () => {
    if (!validateForm()) return
    try {
      const result = await ipc.customers.create(formData)
      if (result.success) {
        await loadCustomers()
        closeAddModal()
        toast.success(t('customerAddedSuccess'))
      } else {
        toast.error(result.message || t('failedToAddCustomer'))
        if (result.existingCustomer) toast.info(`${t('existingCustomer')}: ${result.existingCustomer.name}`)
      }
    } catch (error: any) {
      logger.error('Error adding customer:', error)
      toast.error(error?.message || t('failedToAddCustomer'))
    }
  }

  const handleEditCustomer = async () => {
    if (!validateForm() || !selectedCustomer) return
    try {
      const result = await ipc.customers.update(selectedCustomer.id, formData)
      if (result.success) {
        await loadCustomers()
        closeEditModal()
        toast.success(t('customerUpdatedSuccess'))
      } else {
        toast.error(result.message || t('failedToUpdateCustomer'))
        if (result.existingCustomer) toast.info(`${t('phoneAlreadyUsed')}: ${result.existingCustomer.name}`)
      }
    } catch (error: any) {
      logger.error('Error updating customer:', error)
      toast.error(error?.message || t('failedToUpdateCustomer'))
    }
  }

  const handleDeleteCustomer = async (id: string, customer: Customer) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:check-customer', { customerId: id })
      if (result.success) {
        setCustomerToDelete(customer)
        setDeleteCheckResult(result.data)
        setShowDeleteDialog(true)
      } else {
        toast.error(t('failedToCheckDependencies'))
      }
    } catch (error) {
      logger.error('Failed to check customer:', error)
      toast.error(t('failedToCheckCustomer'))
    }
  }

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:hard-delete-customer', { customerId: customerToDelete.id })
      if (result.success) {
        toast.success(t('customerDeletedSuccess'))
        await loadCustomers()
      } else {
        toast.error(result.error || t('failedToDeleteCustomer'))
      }
    } catch (error) {
      logger.error('Failed to delete customer:', error)
      toast.error(t('failedToDeleteCustomer'))
    }
  }

  const handleArchiveCustomer = async (reason?: string) => {
    if (!customerToDelete) return
    try {
      const result = await window.electron.ipcRenderer.invoke('delete:archive-customer', {
        customerId: customerToDelete.id,
        archivedBy: 'current-user',
        reason
      })
      if (result.success) {
        toast.success(t('customerArchivedSuccess'))
        await loadCustomers()
      } else {
        toast.error(t('failedToArchiveCustomer'))
      }
    } catch (error) {
      logger.error('Failed to archive customer:', error)
      toast.error(t('failedToArchiveCustomer'))
    }
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setCustomerToDelete(null)
    setDeleteCheckResult(null)
  }

  // ─── Export ───────────────────────────────────────────────────────────────
  const handleExport = async (format: 'excel' | 'csv' | 'vcf') => {
    try {
      toast.info(`Exporting customers as ${format.toUpperCase()}...`)
      const result = await window.electron.ipcRenderer.invoke('customers:export', {
        format,
        searchTerm: debouncedSearch
      })
      if (result.success) {
        const blob = new Blob([result.data], {
          type: format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : format === 'csv' ? 'text/csv' : 'text/vcard'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Exported ${result.count} customers successfully!`)
      } else {
        toast.error(result.message || 'Failed to export customers')
      }
    } catch (error) {
      logger.error('Export error:', error)
      toast.error('Failed to export customers')
    }
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const averageSpent = totalCount > 0 ? totalRevenue / totalCount : 0
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = page * pageSize + 1
  const endIndex = Math.min((page + 1) * pageSize, totalCount)

  return {
    // list
    customers, loading, totalCount, hasMore, totalPages, startIndex, endIndex,
    // search / pagination
    searchQuery, setSearchQuery, debouncedSearch, page, setPage, pageSize, setPageSize,
    // derived stats
    totalRevenue, averageSpent,
    // modals
    showAddModal, setShowAddModal,
    showEditModal, closeEditModal, openEditModal,
    showHistoryModal, setShowHistoryModal,
    showInstallmentManager, setShowInstallmentManager,
    showDeleteDialog, closeDeleteDialog,
    showExportDropdown, setShowExportDropdown,
    // selected / delete
    selectedCustomer, setSelectedCustomer,
    selectedCustomerHistory, setSelectedCustomerHistory,
    selectedCustomerForInstallments, setSelectedCustomerForInstallments,
    customerToDelete, deleteCheckResult,
    // form
    formData, setFormData,
    closeAddModal,
    // handlers
    handleAddCustomer, handleEditCustomer,
    handleDeleteCustomer, handleConfirmDelete, handleArchiveCustomer,
    handleExport
  }
}
