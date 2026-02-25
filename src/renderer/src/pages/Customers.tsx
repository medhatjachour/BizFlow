import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Mail, Phone, Heart, Edit2, Trash2, TrendingUp, DollarSign, ShoppingCart, Download, FileSpreadsheet, FileText, User, Eye } from 'lucide-react'
import Modal from '../components/ui/Modal'
import SmartDeleteDialog from '../components/SmartDeleteDialog'
import { InstallmentManager } from '../components/InstallmentManager'
import { ipc } from '../utils/ipc'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { useLanguage } from '../contexts/LanguageContext'
import logger from '../../../shared/utils/logger'

type Customer = {
  id: string
  name: string
  email: string
  phone: string
  loyaltyTier: string
  totalSpent: number
  purchaseCount?: number
  createdAt?: string
  updatedAt?: string
}

export default function Customers(): JSX.Element {
  const { t } = useLanguage()
  const toast = useToast()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(100)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    loyaltyTier: 'Bronze' as 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  })
  
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any[]>([])
  const [loadingHistory] = useState(false)
  
  // Installment manager state
  const [showInstallmentManager, setShowInstallmentManager] = useState(false)
  const [selectedCustomerForInstallments, setSelectedCustomerForInstallments] = useState<Customer | null>(null)
  
  // Delete dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteCheckResult, setDeleteCheckResult] = useState<any>(null)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  // Export dropdown state
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(0) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    loadCustomers()
  }, [page, pageSize, debouncedSearch])

  const loadCustomers = async () => {
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
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error(t('nameRequired'))
      return false
    }
    if (formData.email.trim() && !formData.email.includes('@')) {
      toast.error(t('validEmailRequired'))
      return false
    }
    if (!formData.phone.trim()) {
      toast.error(t('phoneRequired'))
      return false
    }
    return true
  }

  const handleAddCustomer = async () => {
    if (!validateForm()) return

    try {
      const customerData = {
        ...formData
        // totalSpent is automatically 0 for new customers
      }

      const result = await ipc.customers.create(customerData)
      
      if (result.success) {
        await loadCustomers()
        
        setShowAddModal(false)
        resetForm()
        toast.success(t('customerAddedSuccess'))
      } else {
        toast.error(result.message || t('failedToAddCustomer'))
        if (result.existingCustomer) {
          toast.info(`${t('existingCustomer')}: ${result.existingCustomer.name}`)
        }
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
        setShowEditModal(false)
        resetForm()
        setSelectedCustomer(null)
        toast.success(t('customerUpdatedSuccess'))
      } else {
        toast.error(result.message || t('failedToUpdateCustomer'))
        if (result.existingCustomer) {
          toast.info(`${t('phoneAlreadyUsed')}: ${result.existingCustomer.name}`)
        }
      }
    } catch (error: any) {
      logger.error('Error updating customer:', error)
      toast.error(error?.message || t('failedToUpdateCustomer'))
    }
  }

  const handleDeleteCustomer = async (id: string, customer: Customer) => {
    try {
      // Check if customer can be deleted
      const result = await window.electron.ipcRenderer.invoke('delete:check-customer', {
        customerId: id
      })
      
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
      const result = await window.electron.ipcRenderer.invoke('delete:hard-delete-customer', {
        customerId: customerToDelete.id
      })
      
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
        archivedBy: 'current-user', // TODO: Get from auth context
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

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      loyaltyTier: customer.loyaltyTier as 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
    })
    setShowEditModal(true)
  }

  // TODO: Re-enable when history modal is implemented
  // const openHistoryModal = async (customer: Customer) => {
  //   setSelectedCustomer(customer)
  //   setShowHistoryModal(true)
  //   setLoadingHistory(true)
  //   
  //   try {
  //     const history = await ipc.customers.getPurchaseHistory(customer.id)
  //     setSelectedCustomerHistory(history)
  //   } catch (error) {
  //     logger.error('Failed to load purchase history:', error)
  //     toast.error(t('failedToLoadPurchaseHistory'))
  //   } finally {
  //     setLoadingHistory(false)
  //   }
  // }

  // TODO: Re-enable when installment manager modal is implemented
  // const openInstallmentManager = (customer: Customer) => {
  //   setSelectedCustomerForInstallments(customer)
  //   setShowInstallmentManager(true)
  // }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      loyaltyTier: 'Bronze'
    })
  }

  const handleExport = async (format: 'excel' | 'csv' | 'vcf') => {
    try {
      toast.info(`Exporting customers as ${format.toUpperCase()}...`)
      
      const result = await window.electron.ipcRenderer.invoke('customers:export', {
        format,
        searchTerm: debouncedSearch // Export only filtered customers if search is active
      })

      if (result.success) {
        // Create download link
        const blob = new Blob([result.data], { 
          type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                format === 'csv' ? 'text/csv' : 'text/vcard'
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'from-slate-600 to-slate-800'
      case 'Gold': return 'from-amber-500 to-amber-600'
      case 'Silver': return 'from-slate-400 to-slate-500'
      default: return 'from-amber-700 to-amber-800'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Platinum': return '💎'
      case 'Gold': return '👑'
      case 'Silver': return '⭐'
      default: return '🥉'
    }
  }

  // Stats calculations
  const totalRevenue = Array.isArray(customers) ? customers.reduce((sum, c) => sum + c.totalSpent, 0) : 0
  const averageSpent = totalCount > 0 ? totalRevenue / totalCount : 0
  
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = page * pageSize + 1
  const endIndex = Math.min((page + 1) * pageSize, totalCount)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text">
            {t('customerManagement')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{t('manageCustomerRelationships')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Dropdown - Accessible with keyboard and screen readers */}
          <div className="relative">
            <button 
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              onBlur={(e) => {
                // Close dropdown if focus leaves the dropdown container
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                  setShowExportDropdown(false)
                }
              }}
              aria-expanded={showExportDropdown}
              aria-haspopup="true"
            >
              <Download size={20} />
              {t('export')}
            </button>
            {showExportDropdown && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-10"
                role="menu"
              >
                <button
                  onClick={() => {
                    handleExport('excel')
                    setShowExportDropdown(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowExportDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 rounded-t-lg"
                  role="menuitem"
                >
                  <FileSpreadsheet size={18} className="text-green-600" />
                  <span>{t('excel')} (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    handleExport('csv')
                    setShowExportDropdown(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowExportDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  role="menuitem"
                >
                  <FileText size={18} className="text-blue-600" />
                  <span>{t('csv')} (.csv)</span>
                </button>
                <button
                  onClick={() => {
                    handleExport('vcf')
                    setShowExportDropdown(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowExportDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 rounded-b-lg"
                  role="menuitem"
                >
                  <User size={18} className="text-purple-600" />
                  <span>{t('vcard')} (.vcf)</span>
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            {t('addNewCustomer')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalCustomers')}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart size={24} className="text-primary" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalRevenue')}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1" title={`$${totalRevenue.toFixed(2)}`}>
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <DollarSign size={24} className="text-success" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('averageSpent')}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1" title={`$${averageSpent.toFixed(2)}`}>
                {formatCurrency(averageSpent)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp size={24} className="text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Controls */}
      <div className="glass-card p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={t('searchCustomers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">{t('perPage')}:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
              className="input-field w-24"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
        
        {/* Pagination Info */}
        {totalCount > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>
              {t('showingCustomers')} {startIndex} - {endIndex} / {totalCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('first')}
              </button>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('previous')}
              </button>
              <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-medium">
                {t('page')} {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('next')}
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={!hasMore}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {t('last')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingCustomers')}</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Heart size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {debouncedSearch ? t('noCustomersFound') : t('noCustomersYet')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {debouncedSearch ? t('tryDifferentSearch') : t('addFirstCustomer')}
          </p>
          {!debouncedSearch && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus size={20} className="inline mr-2" />
              {t('addNewCustomer')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <div key={customer.id} className="glass-card p-6 relative overflow-hidden hover:shadow-2xl transition-all duration-300">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${getTierColor(customer.loyaltyTier)} opacity-10 rounded-bl-full`}></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-2">
                    {customer.name}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-gradient-to-r ${getTierColor(customer.loyaltyTier)} text-white flex items-center gap-1 shrink-0`}>
                    <span>{getTierIcon(customer.loyaltyTier)}</span>
                    {customer.loyaltyTier}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Mail size={16} className="shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Phone size={16} className="shrink-0" />
                    {customer.phone}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t('totalSpent')}</p>
                      <p className="text-2xl font-bold text-primary" title={`$${customer.totalSpent.toFixed(2)}`}>
                        {formatCurrency(customer.totalSpent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t('purchases')}</p>
                      <p className="text-2xl font-bold text-success">{customer.purchaseCount || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                    title="View profile"
                  >
                    <Eye size={16} />
                    <span className="text-xs">{t('profile')}</span>
                  </button>
                  <button
                    onClick={() => openEditModal(customer)}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                    <span className="text-xs">{t('edit')}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id, customer)}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete customer"
                  >
                    <Trash2 size={16} />
                    <span className="text-xs">{t('delete')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          resetForm()
        }}
        title={t('addNewCustomer')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('fullName')} *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder={t('name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('email')} <span className="text-slate-400 text-xs">({t('emailOptional')})</span>
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                placeholder={t('email')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('phone')} *
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
                placeholder={t('phone')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('loyaltyTier')}
            </label>
            <select
              value={formData.loyaltyTier}
              onChange={(e) => setFormData({ ...formData, loyaltyTier: e.target.value as any })}
              className="input-field"
            >
              <option value="Bronze">🥉 Bronze</option>
              <option value="Silver">⭐ Silver</option>
              <option value="Gold">👑 Gold</option>
              <option value="Platinum">💎 Platinum</option>
            </select>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {t('loyaltyTierUpgrade')}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button onClick={handleAddCustomer} className="btn-primary">
              {t('add')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
          setSelectedCustomer(null)
        }}
        title={t('updateCustomer')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('fullName')} *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder={t('name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('email')} <span className="text-slate-400 text-xs">({t('emailOptional')})</span>
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                placeholder={t('email')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('phone')} *
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
                placeholder={t('phone')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('loyaltyTier')}
            </label>
            <select
              value={formData.loyaltyTier}
              onChange={(e) => setFormData({ ...formData, loyaltyTier: e.target.value as any })}
              className="input-field"
            >
              <option value="Bronze">🥉 Bronze</option>
              <option value="Silver">⭐ Silver</option>
              <option value="Gold">👑 Gold</option>
              <option value="Platinum">💎 Platinum</option>
            </select>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {t('totalSpentAutoCalculated')}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowEditModal(false)
                resetForm()
                setSelectedCustomer(null)
              }}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button onClick={handleEditCustomer} className="btn-primary">
              {t('save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Purchase History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false)
          setSelectedCustomer(null)
          setSelectedCustomerHistory([])
        }}
        title={`${t('purchaseHistory')} - ${selectedCustomer?.name}`}
      >
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">{t('loadingPurchaseHistory')}</p>
            </div>
          ) : selectedCustomerHistory.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart size={48} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">{t('noPurchasesYet')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedCustomerHistory.map((transaction: any) => (
                <div key={transaction.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      transaction.status === 'completed' 
                        ? 'bg-success/20 text-success'
                        : 'bg-error/20 text-error'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {transaction.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {item.quantity}x {item.product.name}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          ${item.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Deposits */}
                  {transaction.deposits && transaction.deposits.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">{t('deposits')}</p>
                      <div className="space-y-1">
                        {transaction.deposits.map((deposit: any, idx: number) => (
                          <div key={deposit.id || idx} className="flex justify-between text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            <span className="text-green-700 dark:text-green-300">
                              {t('deposit')} #{deposit.id} - {new Date(deposit.createdAt).toLocaleDateString()}
                            </span>
                            <span className="font-medium text-green-900 dark:text-green-100">
                              ${deposit.amount.toFixed(2)} ({deposit.status})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Installments */}
                  {transaction.installments && transaction.installments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">{t('installments')}</p>
                      <div className="space-y-1">
                        {transaction.installments.map((installment: any, idx: number) => (
                          <div key={installment.id || idx} className={`flex justify-between text-xs px-2 py-1 rounded ${
                            installment.status === 'paid' 
                              ? 'bg-green-50 dark:bg-green-900/20'
                              : installment.status === 'overdue'
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : 'bg-blue-50 dark:bg-blue-900/20'
                          }`}>
                            <span className={`${
                              installment.status === 'paid' 
                                ? 'text-green-700 dark:text-green-300'
                                : installment.status === 'overdue'
                                ? 'text-red-700 dark:text-red-300'
                                : 'text-blue-700 dark:text-blue-300'
                            }`}>
                              {t('installment')} #{installment.installmentNumber} - {t('dueDate')}: {new Date(installment.dueDate).toLocaleDateString()}
                            </span>
                            <span className={`font-medium ${
                              installment.status === 'paid' 
                                ? 'text-green-900 dark:text-green-100'
                                : installment.status === 'overdue'
                                ? 'text-red-900 dark:text-red-100'
                                : 'text-blue-900 dark:text-blue-100'
                            }`}>
                              ${installment.amount.toFixed(2)} ({installment.status})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {transaction.paymentMethod.toUpperCase()}
                    </span>
                    <span className="text-lg font-bold text-primary">
                      ${transaction.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('totalPurchases')}</p>
              <p className="text-2xl font-bold text-primary" title={`$${selectedCustomer?.totalSpent.toFixed(2) || '0.00'}`}>
                {selectedCustomer ? formatCurrency(selectedCustomer.totalSpent) : '$0.00'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowHistoryModal(false)
                setSelectedCustomer(null)
                setSelectedCustomerHistory([])
              }}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Smart Delete Dialog */}
      <SmartDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setCustomerToDelete(null)
          setDeleteCheckResult(null)
        }}
        entityType="customer"
        entityName={customerToDelete?.name || ''}
        checkResult={deleteCheckResult}
        onDelete={handleConfirmDelete}
        onArchive={handleArchiveCustomer}
      />

      {/* Installment Manager Modal */}
      {showInstallmentManager && selectedCustomerForInstallments && (
        <InstallmentManager
          isOpen={showInstallmentManager}
          onClose={() => {
            setShowInstallmentManager(false)
            setSelectedCustomerForInstallments(null)
          }}
          customerId={selectedCustomerForInstallments.id}
          customerName={selectedCustomerForInstallments.name}
        />
      )}
    </div>
  )
}
